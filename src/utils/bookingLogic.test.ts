import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookingWhatsAppMessage,
  buildDailySlotGrid,
  calculateBookingPrice,
  formatHourRange,
  generateBookingReference,
  hasSlotOverlap,
  normalizeIndianMobile,
  validateBookingInput,
} from './bookingLogic';
import type { PricingConfig } from '../types';

const unconfiguredPricing: PricingConfig = {
  hourlyRateInr: null,
  peakRateInr: null,
  peakStartHour: 18,
  peakEndHour: 22,
  offerTitle: null,
  offerDescription: null,
  offerDiscountPercent: null,
  updatedAt: '2026-11-13T00:00:00Z',
};

const configuredPricing: PricingConfig = {
  hourlyRateInr: 1200,
  peakRateInr: 1600,
  peakStartHour: 18,
  peakEndHour: 22,
  offerTitle: 'Midday Kickoff',
  offerDescription: '10% off on bookings',
  offerDiscountPercent: 10,
  updatedAt: '2026-11-13T00:00:00Z',
};

test('never invents prices when owner has not configured rates', () => {
  const result = calculateBookingPrice(18, 2, unconfiguredPricing);
  assert.equal(result.isPricePending, true);
  assert.equal(result.totalInr, null);
  assert.equal(result.subtotalInr, null);
});

test('calculates mixed standard + peak hours with offer discount accurately', () => {
  // 17:00 (standard 1200) + 18:00 (peak 1600) = 2800 subtotal, 10% discount = 280, total = 2520
  const result = calculateBookingPrice(17, 2, configuredPricing);
  assert.equal(result.isPricePending, false);
  assert.equal(result.subtotalInr, 2800);
  assert.equal(result.discountInr, 280);
  assert.equal(result.totalInr, 2520);
  assert.equal(result.hourlyBreakdown.length, 2);
  assert.equal(result.hourlyBreakdown[0].isPeak, false);
  assert.equal(result.hourlyBreakdown[1].isPeak, true);
});

test('calculates 600 INR standard and 800 INR peak rates across booking duration and slot grid', () => {
  const venuePricing: PricingConfig = {
    ...unconfiguredPricing,
    hourlyRateInr: 600,
    peakRateInr: 800,
  };
  const oneStandard = calculateBookingPrice(16, 1, venuePricing);
  assert.equal(oneStandard.isPricePending, false);
  assert.equal(oneStandard.totalInr, 600);

  const onePeak = calculateBookingPrice(18, 1, venuePricing);
  assert.equal(onePeak.totalInr, 800);

  const mixedTwo = calculateBookingPrice(17, 2, venuePricing);
  assert.equal(mixedTwo.totalInr, 1400);

  const grid = buildDailySlotGrid('2026-11-20', [], [], venuePricing);
  assert.equal(grid.length, 17);
  assert.equal(grid.find((s) => s.hour === 17)?.rateInr, 600);
  assert.equal(grid.find((s) => s.hour === 18)?.rateInr, 800);
});

test('detects slot overlaps against active bookings and blocked slots', () => {
  const bookings = [
    { bookingDate: '2026-11-20', startHour: 18, durationHours: 2, status: 'confirmed' as const },
    { bookingDate: '2026-11-20', startHour: 10, durationHours: 1, status: 'cancelled' as const },
  ];
  const blocked = [
    { blockDate: '2026-11-20', startHour: 15, reason: 'Turf brushing' },
  ];

  // Overlaps 18:00-20:00 confirmed booking
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 17, 2).conflict, true);
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 19, 1).conflict, true);
  // Cancelled booking does not block
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 10, 1).conflict, false);
  // Blocked slot prevents booking
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 15, 1).conflict, true);
  // Adjacent free slot succeeds
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 20, 2).conflict, false);
  // Past closing time fails
  assert.equal(hasSlotOverlap(bookings, blocked, '2026-11-20', 22, 2).conflict, true);
});

test('builds 17 daily slots from 06:00 AM to 11:00 PM with exact statuses', () => {
  const grid = buildDailySlotGrid(
    '2026-11-20',
    [{ bookingDate: '2026-11-20', startHour: 19, durationHours: 2, status: 'confirmed' }],
    [{ blockDate: '2026-11-20', startHour: 7, reason: 'Maintenance' }],
    configuredPricing,
  );
  assert.equal(grid.length, 17);
  assert.equal(grid.find((s) => s.hour === 7)?.status, 'blocked');
  assert.equal(grid.find((s) => s.hour === 19)?.status, 'booked');
  assert.equal(grid.find((s) => s.hour === 20)?.status, 'booked');
  assert.equal(grid.find((s) => s.hour === 21)?.status, 'available');
});

test('validates Indian mobile numbers and booking payload constraints', () => {
  assert.equal(normalizeIndianMobile('+91 97870 01896'), '9787001896');
  assert.equal(normalizeIndianMobile('9787001896'), '9787001896');
  assert.equal(normalizeIndianMobile('12345'), null);

  const ok = validateBookingInput({
    bookingDate: '2026-11-20',
    startHour: 18,
    durationHours: 2,
    customerName: 'Arjun Karthik',
    mobileNumber: '+91 97870 01896',
    playersCount: 10,
    todayIso: '2026-11-13',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.normalizedMobile, '9787001896');

  const past = validateBookingInput({
    bookingDate: '2026-11-01',
    startHour: 18,
    durationHours: 1,
    customerName: 'Arjun',
    mobileNumber: '9787001896',
    playersCount: 10,
    todayIso: '2026-11-13',
  });
  assert.equal(past.valid, false);
});

test('formats hour ranges, reference codes, and WhatsApp confirmation messages', () => {
  assert.equal(formatHourRange(18, 2), '06:00 PM – 08:00 PM');
  assert.equal(generateBookingReference('2026-11-20', 4321), 'CK-20261120-4321');
  const waMsg = buildBookingWhatsAppMessage({
    referenceCode: 'CK-20261120-4321',
    bookingDate: '2026-11-20',
    startHour: 18,
    durationHours: 2,
    customerName: 'Karthik',
    playersCount: 10,
    totalAmountInr: 2520,
  });
  assert.match(waMsg, /CK-20261120-4321/);
  assert.match(waMsg, /06:00 PM – 08:00 PM/);
});
