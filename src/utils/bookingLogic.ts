import type {
  BlockedSlotRecord,
  BookingRecord,
  PricingConfig,
  SlotAvailability,
} from '../types';

export const OPERATING_START_HOUR = 6; // 06:00 AM
export const OPERATING_END_HOUR = 23; // 11:00 PM closing (last 1h start is 22:00)
export const WHATSAPP_NUMBER = '919787001896';
export const DISPLAY_PHONE = '9787001896';

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hello CORNER KICK! I want to book your 5-a-side football turf. Please share available slots and prices.';

export function formatHourRange(startHour: number, durationHours = 1): string {
  const fmt = (h: number): string => {
    const normalized = ((h % 24) + 24) % 24;
    const period = normalized >= 12 ? 'PM' : 'AM';
    const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${String(hour12).padStart(2, '0')}:00 ${period}`;
  };
  return `${fmt(startHour)} – ${fmt(startHour + durationHours)}`;
}

export function formatInr(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) {
    return 'Rate on Request';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isPeakHour(hour: number, pricing: PricingConfig): boolean {
  return hour >= pricing.peakStartHour && hour < pricing.peakEndHour;
}

export interface PriceCalculationResult {
  totalInr: number | null;
  subtotalInr: number | null;
  discountInr: number;
  isPricePending: boolean;
  hourlyBreakdown: Array<{
    hour: number;
    label: string;
    isPeak: boolean;
    rateInr: number | null;
  }>;
}

export function calculateBookingPrice(
  startHour: number,
  durationHours: number,
  pricing: PricingConfig,
): PriceCalculationResult {
  const breakdown: PriceCalculationResult['hourlyBreakdown'] = [];

  if (
    durationHours < 1 ||
    durationHours > 4 ||
    startHour < OPERATING_START_HOUR ||
    startHour + durationHours > OPERATING_END_HOUR
  ) {
    return {
      totalInr: null,
      subtotalInr: null,
      discountInr: 0,
      isPricePending: true,
      hourlyBreakdown: [],
    };
  }

  let subtotal = 0;
  let hasConfiguredRate = pricing.hourlyRateInr !== null && pricing.hourlyRateInr > 0;

  for (let offset = 0; offset < durationHours; offset++) {
    const h = startHour + offset;
    const peak = isPeakHour(h, pricing);
    let rate: number | null = null;

    if (peak && pricing.peakRateInr !== null && pricing.peakRateInr > 0) {
      rate = pricing.peakRateInr;
    } else if (pricing.hourlyRateInr !== null && pricing.hourlyRateInr > 0) {
      rate = pricing.hourlyRateInr;
    } else {
      hasConfiguredRate = false;
    }

    if (rate !== null) {
      subtotal += rate;
    }

    breakdown.push({
      hour: h,
      label: formatHourRange(h, 1),
      isPeak: peak,
      rateInr: rate,
    });
  }

  if (!hasConfiguredRate) {
    return {
      totalInr: null,
      subtotalInr: null,
      discountInr: 0,
      isPricePending: true,
      hourlyBreakdown: breakdown,
    };
  }

  const discountPct =
    pricing.offerDiscountPercent !== null &&
    pricing.offerDiscountPercent > 0 &&
    pricing.offerDiscountPercent <= 90
      ? pricing.offerDiscountPercent
      : 0;

  const discountInr = Math.round((subtotal * discountPct) / 100);
  const totalInr = Math.max(0, subtotal - discountInr);

  return {
    totalInr,
    subtotalInr: subtotal,
    discountInr,
    isPricePending: false,
    hourlyBreakdown: breakdown,
  };
}

export function hasSlotOverlap(
  bookings: Pick<BookingRecord, 'bookingDate' | 'startHour' | 'durationHours' | 'status'>[],
  blockedSlots: Array<Pick<BlockedSlotRecord, 'blockDate' | 'startHour'> & { reason?: string }>,
  targetDate: string,
  startHour: number,
  durationHours: number,
): { conflict: boolean; reason?: string } {
  if (
    startHour < OPERATING_START_HOUR ||
    startHour + durationHours > OPERATING_END_HOUR
  ) {
    return { conflict: true, reason: 'Selected time exceeds operating hours (6 AM – 11 PM).' };
  }

  const requestedHours = new Set<number>();
  for (let i = 0; i < durationHours; i++) {
    requestedHours.add(startHour + i);
  }

  for (const block of blockedSlots) {
    if (block.blockDate === targetDate && requestedHours.has(block.startHour)) {
      return {
        conflict: true,
        reason: block.reason ? `Blocked: ${block.reason}` : 'This slot is blocked by turf management.',
      };
    }
  }

  for (const booking of bookings) {
    if (booking.bookingDate !== targetDate || booking.status === 'cancelled') {
      continue;
    }
    for (let i = 0; i < booking.durationHours; i++) {
      if (requestedHours.has(booking.startHour + i)) {
        return {
          conflict: true,
          reason: 'One or more selected hours are already reserved.',
        };
      }
    }
  }

  return { conflict: false };
}

export function buildDailySlotGrid(
  targetDate: string,
  bookings: Pick<BookingRecord, 'bookingDate' | 'startHour' | 'durationHours' | 'status'>[],
  blockedSlots: Pick<BlockedSlotRecord, 'blockDate' | 'startHour' | 'reason'>[],
  pricing: PricingConfig,
): SlotAvailability[] {
  const bookedMap = new Set<number>();
  for (const b of bookings) {
    if (b.bookingDate === targetDate && b.status !== 'cancelled') {
      for (let i = 0; i < b.durationHours; i++) {
        bookedMap.add(b.startHour + i);
      }
    }
  }

  const blockedMap = new Map<number, string>();
  for (const blk of blockedSlots) {
    if (blk.blockDate === targetDate) {
      blockedMap.set(blk.startHour, blk.reason || 'Unavailable');
    }
  }

  const slots: SlotAvailability[] = [];
  for (let hour = OPERATING_START_HOUR; hour < OPERATING_END_HOUR; hour++) {
    const peak = isPeakHour(hour, pricing);
    const rateInr =
      peak && pricing.peakRateInr !== null && pricing.peakRateInr > 0
        ? pricing.peakRateInr
        : pricing.hourlyRateInr !== null && pricing.hourlyRateInr > 0
          ? pricing.hourlyRateInr
          : null;

    if (blockedMap.has(hour)) {
      slots.push({
        hour,
        label: formatHourRange(hour, 1),
        status: 'blocked',
        reason: blockedMap.get(hour),
        isPeak: peak,
        rateInr,
      });
    } else if (bookedMap.has(hour)) {
      slots.push({
        hour,
        label: formatHourRange(hour, 1),
        status: 'booked',
        reason: 'Reserved',
        isPeak: peak,
        rateInr,
      });
    } else {
      slots.push({
        hour,
        label: formatHourRange(hour, 1),
        status: 'available',
        isPeak: peak,
        rateInr,
      });
    }
  }

  return slots;
}

export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  return null;
}

export function validateBookingInput(input: {
  bookingDate: string;
  startHour: number;
  durationHours: number;
  customerName: string;
  mobileNumber: string;
  playersCount: number;
  todayIso: string;
}): { valid: boolean; error?: string; normalizedMobile?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.bookingDate)) {
    return { valid: false, error: 'Please select a valid booking date.' };
  }
  if (input.bookingDate < input.todayIso) {
    return { valid: false, error: 'Past dates cannot be booked.' };
  }
  if (!Number.isInteger(input.startHour) || input.startHour < OPERATING_START_HOUR || input.startHour >= OPERATING_END_HOUR) {
    return { valid: false, error: 'Please select a valid turf start time.' };
  }
  if (![1, 2, 3].includes(input.durationHours)) {
    return { valid: false, error: 'Playing duration must be 1, 2, or 3 hours.' };
  }
  if (input.startHour + input.durationHours > OPERATING_END_HOUR) {
    return { valid: false, error: 'Selected duration extends past 11:00 PM closing time.' };
  }
  const trimmedName = input.customerName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return { valid: false, error: 'Please enter a valid customer name (2–80 characters).' };
  }
  const normalizedMobile = normalizeIndianMobile(input.mobileNumber);
  if (!normalizedMobile) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  if (!Number.isInteger(input.playersCount) || input.playersCount < 2 || input.playersCount > 14) {
    return { valid: false, error: 'Number of players must be between 2 and 14 for 5-a-side turf.' };
  }

  return { valid: true, normalizedMobile };
}

export function generateBookingReference(dateStr: string, randomSuffix?: number): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const code = randomSuffix ?? Math.floor(1000 + Math.random() * 9000);
  return `CK-${cleanDate}-${code}`;
}

export function buildWhatsAppLink(customMessage?: string): string {
  const msg = customMessage ?? DEFAULT_WHATSAPP_MESSAGE;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function buildBookingWhatsAppMessage(booking: {
  referenceCode: string;
  bookingDate: string;
  startHour: number;
  durationHours: number;
  customerName: string;
  playersCount: number;
  totalAmountInr: number | null;
}): string {
  const timeRange = formatHourRange(booking.startHour, booking.durationHours);
  const priceLine =
    booking.totalAmountInr !== null
      ? `Total: ${formatInr(booking.totalAmountInr)}`
      : 'Rate: Please confirm current slot tariff';

  return [
    'Hello CORNER KICK! I have reserved a 5-a-side turf slot.',
    `Ref: ${booking.referenceCode}`,
    `Name: ${booking.customerName}`,
    `Date: ${booking.bookingDate}`,
    `Time: ${timeRange} (${booking.durationHours} hr${booking.durationHours > 1 ? 's' : ''})`,
    `Players: ${booking.playersCount}`,
    priceLine,
  ].join('\n');
}
