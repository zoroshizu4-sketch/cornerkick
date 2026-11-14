import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BookingConflictError,
  BookingValidationError,
  createBookingAtomic,
  createEnquiry,
  createTestimonial,
  getAdminDashboardSnapshot,
  getAvailabilityForDate,
  getDb,
  getPublicSiteData,
  updateAdminPasscode,
  verifyAdminPasscode,
} from './src/server/db';

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'corner-kick-local-session-signing-key-2026';
const SESSION_COOKIE = 'ck_admin_session';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function signSessionToken(expiresAtMs: number): string {
  const payload = `admin.${expiresAtMs}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== 'admin') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${role}.${expStr}`)
    .digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractToken(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : undefined;
  return bearer || cookies[SESSION_COOKIE];
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Please sign in to the owner console.' });
    return;
  }
  next();
}

async function startServer() {
  getDb(); // Initialize SQLite schema & seeds once on startup

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // --- Public API Routes ---

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, brand: 'CORNER KICK' });
  });

  app.get('/api/public-data', (_req, res) => {
    try {
      res.json(getPublicSiteData());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load venue data.' });
    }
  });

  app.get('/api/availability', (req, res) => {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date parameter (expected YYYY-MM-DD).' });
      return;
    }
    try {
      res.json(getAvailabilityForDate(date));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load slot availability.' });
    }
  });

  app.post('/api/bookings', (req, res) => {
    try {
      const booking = createBookingAtomic({
        bookingDate: String(req.body?.bookingDate || ''),
        startHour: Number(req.body?.startHour),
        durationHours: Number(req.body?.durationHours),
        customerName: String(req.body?.customerName || ''),
        mobileNumber: String(req.body?.mobileNumber || ''),
        playersCount: Number(req.body?.playersCount),
        specialRequests: String(req.body?.specialRequests || ''),
      });
      res.status(201).json({ booking });
    } catch (err) {
      if (err instanceof BookingConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (err instanceof BookingValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to save booking. Please try again.' });
    }
  });

  app.post('/api/enquiries', (req, res) => {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim();
    const message = String(req.body?.message || '').trim();
    if (name.length < 2 || phone.length < 8 || message.length < 5) {
      res.status(400).json({ error: 'Please provide your name, valid phone number, and message.' });
      return;
    }
    try {
      const enquiry = createEnquiry({ name, phone, email, message });
      res.status(201).json({ enquiry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to submit enquiry.' });
    }
  });

  app.post('/api/testimonials', (req, res) => {
    const authorName = String(req.body?.authorName || '').trim();
    const teamOrRole = String(req.body?.teamOrRole || '').trim();
    const rating = Number(req.body?.rating || 5);
    const quote = String(req.body?.quote || '').trim();
    const bookingRef = String(req.body?.bookingRef || '').trim();
    if (authorName.length < 2 || quote.length < 10) {
      res.status(400).json({ error: 'Please include your name and a genuine review (min 10 characters).' });
      return;
    }
    try {
      const review = createTestimonial({
        authorName,
        teamOrRole: teamOrRole || '5-a-Side Player',
        rating,
        quote,
        bookingRef,
      });
      res.status(201).json({
        testimonial: review,
        message: 'Thank you! Your review has been submitted for owner verification.',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to save review.' });
    }
  });

  // --- Admin Auth & Management APIs ---

  app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: verifySessionToken(extractToken(req)) });
  });

  app.post('/api/admin/login', (req, res) => {
    const passcode = String(req.body?.passcode || '').trim();
    if (!passcode || !verifyAdminPasscode(passcode)) {
      res.status(401).json({ error: 'Invalid owner passcode.' });
      return;
    }
    const expiresAt = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
    const token = signSessionToken(expiresAt);
    const isHttps =
      req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https');
    const cookieFlags = isHttps
      ? 'Path=/; HttpOnly; SameSite=None; Secure; Partitioned'
      : 'Path=/; HttpOnly; SameSite=Lax';
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieFlags}; Max-Age=${60 * 60 * 12}`,
    );
    res.json({
      authenticated: true,
      token,
      dashboard: getAdminDashboardSnapshot(),
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const isHttps =
      req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https');
    const cookieFlags = isHttps
      ? 'Path=/; HttpOnly; SameSite=None; Secure; Partitioned'
      : 'Path=/; HttpOnly; SameSite=Lax';
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieFlags}; Max-Age=0`);
    res.json({ authenticated: false });
  });

  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    res.json(getAdminDashboardSnapshot());
  });

  app.patch('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    if (!['confirmed', 'pending', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid booking status.' });
      return;
    }
    const db = getDb();
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    res.json({ ok: true });
  });

  app.post('/api/admin/blocked-slots', requireAdmin, (req, res) => {
    const blockDate = String(req.body?.blockDate || '');
    const startHour = Number(req.body?.startHour);
    const reason = String(req.body?.reason || 'Blocked by Owner').trim().slice(0, 120);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(blockDate) || !Number.isInteger(startHour) || startHour < 6 || startHour >= 23) {
      res.status(400).json({ error: 'Invalid date or hour.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO blocked_slots (block_date, start_hour, reason, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(block_date, start_hour) DO UPDATE SET reason = excluded.reason
    `).run(blockDate, startHour, reason, new Date().toISOString());
    res.status(201).json({ ok: true });
  });

  app.delete('/api/admin/blocked-slots/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    db.prepare('DELETE FROM blocked_slots WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.put('/api/admin/pricing', requireAdmin, (req, res) => {
    const hourlyRateInr =
      req.body?.hourlyRateInr === null || req.body?.hourlyRateInr === ''
        ? null
        : Number(req.body.hourlyRateInr);
    const peakRateInr =
      req.body?.peakRateInr === null || req.body?.peakRateInr === ''
        ? null
        : Number(req.body.peakRateInr);
    const peakStartHour = Number(req.body?.peakStartHour ?? 18);
    const peakEndHour = Number(req.body?.peakEndHour ?? 22);
    const offerTitle = req.body?.offerTitle ? String(req.body.offerTitle).trim() : null;
    const offerDescription = req.body?.offerDescription
      ? String(req.body.offerDescription).trim()
      : null;
    const offerDiscountPercent =
      req.body?.offerDiscountPercent === null || req.body?.offerDiscountPercent === ''
        ? null
        : Number(req.body.offerDiscountPercent);

    if (hourlyRateInr !== null && (!Number.isFinite(hourlyRateInr) || hourlyRateInr <= 0)) {
      res.status(400).json({ error: 'Hourly rate must be a positive INR amount or cleared.' });
      return;
    }
    if (peakRateInr !== null && (!Number.isFinite(peakRateInr) || peakRateInr <= 0)) {
      res.status(400).json({ error: 'Peak rate must be a positive INR amount or cleared.' });
      return;
    }
    if (
      offerDiscountPercent !== null &&
      (!Number.isFinite(offerDiscountPercent) || offerDiscountPercent < 0 || offerDiscountPercent > 90)
    ) {
      res.status(400).json({ error: 'Discount percentage must be between 0 and 90.' });
      return;
    }

    const db = getDb();
    db.prepare(`
      UPDATE pricing_config
      SET hourly_rate_inr = ?, peak_rate_inr = ?, peak_start_hour = ?, peak_end_hour = ?,
          offer_title = ?, offer_description = ?, offer_discount_percent = ?, updated_at = ?
      WHERE id = 1
    `).run(
      hourlyRateInr,
      peakRateInr,
      peakStartHour,
      peakEndHour,
      offerTitle,
      offerDescription,
      offerDiscountPercent,
      new Date().toISOString(),
    );
    res.json({ ok: true });
  });

  app.patch('/api/admin/facilities/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const confirmed = req.body?.confirmed ? 1 : 0;
    const title = req.body?.title ? String(req.body.title).trim() : undefined;
    const description = req.body?.description ? String(req.body.description).trim() : undefined;
    const specs = req.body?.specs ? String(req.body.specs).trim() : undefined;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Facility not found.' });
      return;
    }

    db.prepare(`
      UPDATE facilities
      SET confirmed = ?, title = ?, description = ?, specs = ?
      WHERE id = ?
    `).run(
      confirmed,
      title ?? String(existing.title),
      description ?? String(existing.description),
      specs ?? String(existing.specs),
      id,
    );
    res.json({ ok: true });
  });

  app.post('/api/admin/gallery', requireAdmin, (req, res) => {
    const title = String(req.body?.title || '').trim();
    const category = String(req.body?.category || 'Turf').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const caption = String(req.body?.caption || '').trim();
    if (!title || !imageUrl) {
      res.status(400).json({ error: 'Title and image URL are required.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO gallery_items (title, category, image_url, caption, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, category, imageUrl, caption, new Date().toISOString());
    res.status(201).json({ ok: true });
  });

  app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    db.prepare('DELETE FROM gallery_items WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.post('/api/admin/promotions', requireAdmin, (req, res) => {
    const title = String(req.body?.title || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const description = String(req.body?.description || '').trim();
    const discountText = String(req.body?.discountText || '').trim();
    if (!title || !discountText) {
      res.status(400).json({ error: 'Promotion title and offer summary are required.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO promotions (title, code, description, discount_text, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(title, code, description, discountText, new Date().toISOString());
    res.status(201).json({ ok: true });
  });

  app.patch('/api/admin/promotions/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const active = req.body?.active ? 1 : 0;
    const db = getDb();
    db.prepare('UPDATE promotions SET active = ? WHERE id = ?').run(active, id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/promotions/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.patch('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const approved = req.body?.approved ? 1 : 0;
    const db = getDb();
    db.prepare('UPDATE testimonials SET approved = ? WHERE id = ?').run(approved, id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.patch('/api/admin/enquiries/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status === 'replied' ? 'replied' : 'new';
    const db = getDb();
    db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
    res.json({ ok: true });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const googleMapsEmbedUrl = String(req.body?.googleMapsEmbedUrl || '').trim();
    const newPasscode = String(req.body?.newPasscode || '').trim();
    const db = getDb();

    if (googleMapsEmbedUrl) {
      db.prepare('UPDATE site_settings SET google_maps_embed_url = ? WHERE id = 1').run(
        googleMapsEmbedUrl,
      );
    }
    if (newPasscode.length >= 6) {
      updateAdminPasscode(newPasscode);
    }
    res.json({ ok: true });
  });

  // --- Vite Dev Middleware / Production Static Serve ---
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      '/src/assets/images',
      express.static(path.resolve(process.cwd(), 'src/assets/images')),
    );
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CORNER KICK server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CORNER KICK server:', err);
  process.exit(1);
});
