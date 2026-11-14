import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BlockedSlotRecord,
  BookingRecord,
  BookingStatus,
  EnquiryRecord,
  FacilityRecord,
  GalleryItem,
  PricingConfig,
  PromotionRecord,
  PublicSiteData,
  TestimonialRecord,
} from '../types';
import {
  buildDailySlotGrid,
  calculateBookingPrice,
  generateBookingReference,
  hasSlotOverlap,
  validateBookingInput,
} from '../utils/bookingLogic';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'corner_kick.db');

let dbInstance: Database.Database | null = null;

export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const candidateHex = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT NOT NULL UNIQUE,
      booking_date TEXT NOT NULL,
      start_hour INTEGER NOT NULL,
      duration_hours INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      players_count INTEGER NOT NULL,
      special_requests TEXT NOT NULL DEFAULT '',
      total_amount_inr INTEGER,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_date TEXT NOT NULL,
      start_hour INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT 'Unavailable',
      created_at TEXT NOT NULL,
      UNIQUE(block_date, start_hour)
    );

    CREATE TABLE IF NOT EXISTS pricing_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hourly_rate_inr INTEGER,
      peak_rate_inr INTEGER,
      peak_start_hour INTEGER NOT NULL DEFAULT 18,
      peak_end_hour INTEGER NOT NULL DEFAULT 22,
      offer_title TEXT,
      offer_description TEXT,
      offer_discount_percent INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      specs TEXT NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      discount_text TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      team_or_role TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      quote TEXT NOT NULL,
      booking_ref TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      google_maps_embed_url TEXT NOT NULL,
      admin_password_hash TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();

  // Owner-specified rates: ₹600/hr standard, ₹800/hr peak; owner can update anytime in Admin
  db.prepare(`
    INSERT OR IGNORE INTO pricing_config (
      id, hourly_rate_inr, peak_rate_inr, peak_start_hour, peak_end_hour,
      offer_title, offer_description, offer_discount_percent, updated_at
    ) VALUES (1, 600, 800, 18, 22, NULL, NULL, NULL, ?)
  `).run(now);

  // Settings seed
  const initialPassword = process.env.ADMIN_PASSWORD || '040911';
  const defaultMapUrl =
    'https://www.google.com/maps?q=Bharathi+Nagar,+Coimbatore,+Tamil+Nadu,+India&output=embed';
  db.prepare(`
    INSERT OR IGNORE INTO site_settings (id, google_maps_embed_url, admin_password_hash)
    VALUES (1, ?, ?)
  `).run(defaultMapUrl, hashPassword(initialPassword));

  // Seed potential facility categories as unconfirmed (confirmed = 0) until owner confirms them
  const facilityCount = (
    db.prepare('SELECT COUNT(*) as c FROM facilities').get() as { c: number }
  ).c;
  if (facilityCount === 0) {
    const insertFacility = db.prepare(`
      INSERT INTO facilities (slug, title, category, description, specs, confirmed)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const seedFacilities = [
      [
        'artificial-grass',
        'Synthetic Football Turf',
        'Pitch Surface',
        '5-a-side synthetic grass playing surface engineered for true ball roll and underfoot grip.',
        '5-a-Side Pitch · Bharathi Nagar',
      ],
      [
        'floodlights',
        'Stadium LED Floodlights',
        'Night Lighting',
        'Overhead LED floodlight towers built for high-visibility evening and late-night matches.',
        'Evening & Night Play · 6 PM – 11 PM',
      ],
      [
        'changing-facilities',
        'Changing & Washroom Area',
        'Player Comfort',
        'Dedicated player changing rooms and washroom amenities adjacent to the pitch.',
        'Player Prep Zone',
      ],
      [
        'seating',
        'Dugout & Spectator Seating',
        'Sideline Zone',
        'Covered sideline seating for substitute players, coaches, and visiting spectators.',
        'Pitchside Dugout',
      ],
      [
        'parking',
        'Dedicated Parking Space',
        'Venue Access',
        'On-site two-wheeler and four-wheeler parking access for squads arriving in Coimbatore.',
        'On-Site Parking',
      ],
    ];
    for (const f of seedFacilities) {
      insertFacility.run(...f);
    }
  }

  // Seed gallery items using generated local assets
  const galleryCount = (
    db.prepare('SELECT COUNT(*) as c FROM gallery_items').get() as { c: number }
  ).c;
  if (galleryCount === 0) {
    const insertGallery = db.prepare(`
      INSERT INTO gallery_items (title, category, image_url, caption, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const seedGallery = [
      [
        'Open-Air 5-a-Side Turf',
        'Turf',
        '/src/assets/images/open_turf_hero_1794655807932.jpg',
        'Full open-sky pitch view at dusk.',
        now,
      ],
      [
        'Corner Kick Match Arc',
        'Turf',
        '/src/assets/images/about_turf_closeup_1794585974129.jpg',
        'Close-up of the turf grain and crisp corner marking.',
        now,
      ],
      [
        'High-Tempo Night Clash',
        'Matches',
        '/src/assets/images/gallery_night_match_1794585974079.jpg',
        'Competitive 5-a-side football under night illumination.',
        now,
      ],
      [
        'Squad Victory Huddle',
        'Celebrations',
        '/src/assets/images/gallery_team_huddle_1794585974332.jpg',
        'Post-goal team celebration on the turf.',
        now,
      ],
      [
        'The Corner Flag',
        'Action',
        '/src/assets/images/gallery_corner_flag_1794585974895.jpg',
        'Signature black and gold corner flag on pitch edge.',
        now,
      ],
    ];
    for (const g of seedGallery) {
      insertGallery.run(...g);
    }
  }

  dbInstance = db;
  return db;
}

function mapPricing(row: Record<string, unknown>): PricingConfig {
  return {
    hourlyRateInr: (row.hourly_rate_inr as number | null) ?? null,
    peakRateInr: (row.peak_rate_inr as number | null) ?? null,
    peakStartHour: Number(row.peak_start_hour ?? 18),
    peakEndHour: Number(row.peak_end_hour ?? 22),
    offerTitle: (row.offer_title as string | null) ?? null,
    offerDescription: (row.offer_description as string | null) ?? null,
    offerDiscountPercent: (row.offer_discount_percent as number | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

function mapBooking(row: Record<string, unknown>): BookingRecord {
  return {
    id: Number(row.id),
    referenceCode: String(row.reference_code),
    bookingDate: String(row.booking_date),
    startHour: Number(row.start_hour),
    durationHours: Number(row.duration_hours),
    customerName: String(row.customer_name),
    mobileNumber: String(row.mobile_number),
    playersCount: Number(row.players_count),
    specialRequests: String(row.special_requests ?? ''),
    totalAmountInr: row.total_amount_inr === null ? null : Number(row.total_amount_inr),
    status: String(row.status) as BookingStatus,
    createdAt: String(row.created_at),
  };
}

export function getPublicSiteData(): PublicSiteData {
  const db = getDb();
  const pricingRow = db.prepare('SELECT * FROM pricing_config WHERE id = 1').get() as Record<string, unknown>;
  const facilitiesRows = db
    .prepare('SELECT * FROM facilities WHERE confirmed = 1 ORDER BY id ASC')
    .all() as Record<string, unknown>[];
  const galleryRows = db
    .prepare('SELECT * FROM gallery_items ORDER BY id DESC')
    .all() as Record<string, unknown>[];
  const promoRows = db
    .prepare('SELECT * FROM promotions WHERE active = 1 ORDER BY id DESC')
    .all() as Record<string, unknown>[];
  const testimonialRows = db
    .prepare('SELECT * FROM testimonials WHERE approved = 1 ORDER BY id DESC')
    .all() as Record<string, unknown>[];
  const settingsRow = db
    .prepare('SELECT google_maps_embed_url FROM site_settings WHERE id = 1')
    .get() as { google_maps_embed_url: string };
  const confirmedBookingsCount = (
    db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status != 'cancelled'").get() as { c: number }
  ).c;

  return {
    pricing: mapPricing(pricingRow),
    facilities: facilitiesRows.map((f) => ({
      id: Number(f.id),
      slug: String(f.slug),
      title: String(f.title),
      category: String(f.category),
      description: String(f.description),
      specs: String(f.specs),
      confirmed: Boolean(f.confirmed),
    })),
    gallery: galleryRows.map((g) => ({
      id: Number(g.id),
      title: String(g.title),
      category: String(g.category) as GalleryItem['category'],
      imageUrl: String(g.image_url),
      caption: String(g.caption ?? ''),
      createdAt: String(g.created_at),
    })),
    promotions: promoRows.map((p) => ({
      id: Number(p.id),
      title: String(p.title),
      code: String(p.code),
      description: String(p.description),
      discountText: String(p.discount_text),
      active: Boolean(p.active),
      createdAt: String(p.created_at),
    })),
    testimonials: testimonialRows.map((t) => ({
      id: Number(t.id),
      authorName: String(t.author_name),
      teamOrRole: String(t.team_or_role),
      rating: Number(t.rating),
      quote: String(t.quote),
      bookingRef: t.booking_ref ? String(t.booking_ref) : null,
      approved: Boolean(t.approved),
      createdAt: String(t.created_at),
    })),
    googleMapsEmbedUrl: settingsRow.google_maps_embed_url,
    stats: {
      confirmedBookingsCount,
    },
  };
}

export function getAvailabilityForDate(targetDate: string) {
  const db = getDb();
  const pricingRow = db.prepare('SELECT * FROM pricing_config WHERE id = 1').get() as Record<string, unknown>;
  const pricing = mapPricing(pricingRow);

  const bookings = (
    db
      .prepare('SELECT booking_date, start_hour, duration_hours, status FROM bookings WHERE booking_date = ?')
      .all(targetDate) as Record<string, unknown>[]
  ).map((r) => ({
    bookingDate: String(r.booking_date),
    startHour: Number(r.start_hour),
    durationHours: Number(r.duration_hours),
    status: String(r.status) as BookingStatus,
  }));

  const blocked = (
    db
      .prepare('SELECT block_date, start_hour, reason FROM blocked_slots WHERE block_date = ?')
      .all(targetDate) as Record<string, unknown>[]
  ).map((r) => ({
    blockDate: String(r.block_date),
    startHour: Number(r.start_hour),
    reason: String(r.reason),
  }));

  return {
    date: targetDate,
    pricing,
    slots: buildDailySlotGrid(targetDate, bookings, blocked, pricing),
  };
}

export class BookingConflictError extends Error {
  statusCode = 409;
}

export class BookingValidationError extends Error {
  statusCode = 400;
}

export function createBookingAtomic(payload: {
  bookingDate: string;
  startHour: number;
  durationHours: number;
  customerName: string;
  mobileNumber: string;
  playersCount: number;
  specialRequests?: string;
}): BookingRecord {
  const db = getDb();
  const todayIso = new Date().toISOString().slice(0, 10);

  const validation = validateBookingInput({
    bookingDate: payload.bookingDate,
    startHour: payload.startHour,
    durationHours: payload.durationHours,
    customerName: payload.customerName,
    mobileNumber: payload.mobileNumber,
    playersCount: payload.playersCount,
    todayIso,
  });

  if (!validation.valid || !validation.normalizedMobile) {
    throw new BookingValidationError(validation.error || 'Invalid booking input.');
  }

  const runTx = db.transaction(() => {
    const existingBookings = (
      db
        .prepare("SELECT booking_date, start_hour, duration_hours, status FROM bookings WHERE booking_date = ? AND status != 'cancelled'")
        .all(payload.bookingDate) as Record<string, unknown>[]
    ).map((r) => ({
      bookingDate: String(r.booking_date),
      startHour: Number(r.start_hour),
      durationHours: Number(r.duration_hours),
      status: String(r.status) as BookingStatus,
    }));

    const blockedSlots = (
      db
        .prepare('SELECT block_date, start_hour FROM blocked_slots WHERE block_date = ?')
        .all(payload.bookingDate) as Record<string, unknown>[]
    ).map((r) => ({
      blockDate: String(r.block_date),
      startHour: Number(r.start_hour),
    }));

    const overlap = hasSlotOverlap(
      existingBookings,
      blockedSlots,
      payload.bookingDate,
      payload.startHour,
      payload.durationHours,
    );

    if (overlap.conflict) {
      throw new BookingConflictError(overlap.reason || 'Selected slot is no longer available.');
    }

    const pricingRow = db.prepare('SELECT * FROM pricing_config WHERE id = 1').get() as Record<string, unknown>;
    const pricing = mapPricing(pricingRow);
    const calc = calculateBookingPrice(payload.startHour, payload.durationHours, pricing);

    let referenceCode = generateBookingReference(payload.bookingDate);
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = db
        .prepare('SELECT 1 FROM bookings WHERE reference_code = ?')
        .get(referenceCode);
      if (!exists) break;
      referenceCode = generateBookingReference(payload.bookingDate);
    }

    const createdAt = new Date().toISOString();
    const info = db
      .prepare(`
        INSERT INTO bookings (
          reference_code, booking_date, start_hour, duration_hours,
          customer_name, mobile_number, players_count, special_requests,
          total_amount_inr, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
      `)
      .run(
        referenceCode,
        payload.bookingDate,
        payload.startHour,
        payload.durationHours,
        payload.customerName.trim(),
        validation.normalizedMobile,
        payload.playersCount,
        (payload.specialRequests ?? '').trim().slice(0, 400),
        calc.totalInr,
        createdAt,
      );

    const inserted = db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .get(info.lastInsertRowid) as Record<string, unknown>;
    return mapBooking(inserted);
  });

  return runTx.immediate();
}

export function createEnquiry(payload: {
  name: string;
  phone: string;
  email?: string;
  message: string;
}): EnquiryRecord {
  const db = getDb();
  const createdAt = new Date().toISOString();
  const info = db
    .prepare(`
      INSERT INTO enquiries (name, phone, email, message, status, created_at)
      VALUES (?, ?, ?, ?, 'new', ?)
    `)
    .run(
      payload.name.trim(),
      payload.phone.trim(),
      (payload.email ?? '').trim(),
      payload.message.trim(),
      createdAt,
    );

  const row = db
    .prepare('SELECT * FROM enquiries WHERE id = ?')
    .get(info.lastInsertRowid) as Record<string, unknown>;

  return {
    id: Number(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    message: String(row.message),
    status: String(row.status) as 'new' | 'replied',
    createdAt: String(row.created_at),
  };
}

export function createTestimonial(payload: {
  authorName: string;
  teamOrRole: string;
  rating: number;
  quote: string;
  bookingRef?: string;
}): TestimonialRecord {
  const db = getDb();
  const createdAt = new Date().toISOString();
  const safeRating = Math.min(5, Math.max(1, Math.round(payload.rating)));
  const info = db
    .prepare(`
      INSERT INTO testimonials (author_name, team_or_role, rating, quote, booking_ref, approved, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `)
    .run(
      payload.authorName.trim(),
      payload.teamOrRole.trim(),
      safeRating,
      payload.quote.trim(),
      payload.bookingRef?.trim() || null,
      createdAt,
    );

  const row = db
    .prepare('SELECT * FROM testimonials WHERE id = ?')
    .get(info.lastInsertRowid) as Record<string, unknown>;

  return {
    id: Number(row.id),
    authorName: String(row.author_name),
    teamOrRole: String(row.team_or_role),
    rating: Number(row.rating),
    quote: String(row.quote),
    bookingRef: row.booking_ref ? String(row.booking_ref) : null,
    approved: Boolean(row.approved),
    createdAt: String(row.created_at),
  };
}

// --- Admin Helpers ---

export function verifyAdminPasscode(passcode: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT admin_password_hash FROM site_settings WHERE id = 1')
    .get() as { admin_password_hash: string } | undefined;
  if (!row) return false;
  return verifyPassword(passcode, row.admin_password_hash);
}

export function updateAdminPasscode(newPasscode: string): void {
  const db = getDb();
  db.prepare('UPDATE site_settings SET admin_password_hash = ? WHERE id = 1').run(
    hashPassword(newPasscode),
  );
}

export function getAdminDashboardSnapshot() {
  const db = getDb();
  const bookings = (
    db.prepare('SELECT * FROM bookings ORDER BY booking_date DESC, start_hour DESC, id DESC').all() as Record<
      string,
      unknown
    >[]
  ).map(mapBooking);

  const blockedSlots = (
    db.prepare('SELECT * FROM blocked_slots ORDER BY block_date DESC, start_hour ASC').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (b): BlockedSlotRecord => ({
      id: Number(b.id),
      blockDate: String(b.block_date),
      startHour: Number(b.start_hour),
      reason: String(b.reason),
      createdAt: String(b.created_at),
    }),
  );

  const pricingRow = db.prepare('SELECT * FROM pricing_config WHERE id = 1').get() as Record<string, unknown>;

  const facilities = (
    db.prepare('SELECT * FROM facilities ORDER BY id ASC').all() as Record<string, unknown>[]
  ).map(
    (f): FacilityRecord => ({
      id: Number(f.id),
      slug: String(f.slug),
      title: String(f.title),
      category: String(f.category),
      description: String(f.description),
      specs: String(f.specs),
      confirmed: Boolean(f.confirmed),
    }),
  );

  const gallery = (
    db.prepare('SELECT * FROM gallery_items ORDER BY id DESC').all() as Record<string, unknown>[]
  ).map(
    (g): GalleryItem => ({
      id: Number(g.id),
      title: String(g.title),
      category: String(g.category) as GalleryItem['category'],
      imageUrl: String(g.image_url),
      caption: String(g.caption ?? ''),
      createdAt: String(g.created_at),
    }),
  );

  const promotions = (
    db.prepare('SELECT * FROM promotions ORDER BY id DESC').all() as Record<string, unknown>[]
  ).map(
    (p): PromotionRecord => ({
      id: Number(p.id),
      title: String(p.title),
      code: String(p.code),
      description: String(p.description),
      discountText: String(p.discount_text),
      active: Boolean(p.active),
      createdAt: String(p.created_at),
    }),
  );

  const testimonials = (
    db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all() as Record<string, unknown>[]
  ).map(
    (t): TestimonialRecord => ({
      id: Number(t.id),
      authorName: String(t.author_name),
      teamOrRole: String(t.team_or_role),
      rating: Number(t.rating),
      quote: String(t.quote),
      bookingRef: t.booking_ref ? String(t.booking_ref) : null,
      approved: Boolean(t.approved),
      createdAt: String(t.created_at),
    }),
  );

  const enquiries = (
    db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all() as Record<string, unknown>[]
  ).map(
    (e): EnquiryRecord => ({
      id: Number(e.id),
      name: String(e.name),
      phone: String(e.phone),
      email: String(e.email),
      message: String(e.message),
      status: String(e.status) as 'new' | 'replied',
      createdAt: String(e.created_at),
    }),
  );

  const settings = db
    .prepare('SELECT google_maps_embed_url FROM site_settings WHERE id = 1')
    .get() as { google_maps_embed_url: string };

  return {
    bookings,
    blockedSlots,
    pricing: mapPricing(pricingRow),
    facilities,
    gallery,
    promotions,
    testimonials,
    enquiries,
    googleMapsEmbedUrl: settings.google_maps_embed_url,
  };
}
