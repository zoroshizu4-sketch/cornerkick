import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Lock,
  MessageCircle,
  Users,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BookingRecord, PricingConfig, SlotAvailability } from '../types';
import { LUXURY_EASE, RevealSection } from './MotionPrimitives';
import {
  buildBookingWhatsAppMessage,
  buildWhatsAppLink,
  calculateBookingPrice,
  formatHourRange,
  formatInr,
  validateBookingInput,
} from '../utils/bookingLogic';

interface BookingSectionProps {
  pricing: PricingConfig;
  preferredSlotFilter?: 'all' | 'peak' | 'standard' | null;
  onBookingCreated: () => void;
}

function addDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function formatReadableDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  pricing,
  preferredSlotFilter,
  onBookingCreated,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const maxDateIso = useMemo(() => addDaysIso(todayIso, 30), [todayIso]);

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [activePricing, setActivePricing] = useState<PricingConfig>(pricing);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState<1 | 2 | 3>(1);

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [playersCount, setPlayersCount] = useState(10);
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  const loadAvailability = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
      if (!res.ok) {
        throw new Error('Could not load turf availability.');
      }
      const data = await res.json();
      setSlots(data.slots ?? []);
      if (data.pricing) {
        setActivePricing(data.pricing);
      }
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : 'Network error loading slots.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    setActivePricing(pricing);
  }, [pricing]);

  useEffect(() => {
    void loadAvailability(selectedDate);
  }, [selectedDate, loadAvailability]);

  // If user clicked a pricing tier BOOK NOW CTA, select first matching available slot
  useEffect(() => {
    if (!preferredSlotFilter || slots.length === 0) return;
    const match = slots.find((s) => {
      if (s.status !== 'available') return false;
      if (preferredSlotFilter === 'peak') return s.isPeak;
      if (preferredSlotFilter === 'standard') return !s.isPeak;
      return true;
    });
    if (match) {
      setSelectedStartHour(match.hour);
    }
  }, [preferredSlotFilter, slots]);

  // Check if selectedStartHour + durationHours fits consecutively with all slots available
  const canFitDuration = useCallback(
    (startHour: number | null, dur: 1 | 2 | 3): boolean => {
      if (startHour === null) return false;
      for (let i = 0; i < dur; i++) {
        const slot = slots.find((s) => s.hour === startHour + i);
        if (!slot || slot.status !== 'available') return false;
      }
      return true;
    },
    [slots],
  );

  useEffect(() => {
    if (selectedStartHour !== null && !canFitDuration(selectedStartHour, durationHours)) {
      if (canFitDuration(selectedStartHour, 1)) {
        setDurationHours(1);
      } else {
        setSelectedStartHour(null);
      }
    }
  }, [selectedStartHour, durationHours, canFitDuration]);

  const priceCalc = useMemo(() => {
    if (selectedStartHour === null) return null;
    return calculateBookingPrice(selectedStartHour, durationHours, activePricing);
  }, [selectedStartHour, durationHours, activePricing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedStartHour === null) {
      setFormError('Please select an available start slot from the schedule.');
      return;
    }

    const validation = validateBookingInput({
      bookingDate: selectedDate,
      startHour: selectedStartHour,
      durationHours,
      customerName,
      mobileNumber,
      playersCount,
      todayIso,
    });

    if (!validation.valid) {
      setFormError(validation.error || 'Please check your booking details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingDate: selectedDate,
          startHour: selectedStartHour,
          durationHours,
          customerName,
          mobileNumber,
          playersCount,
          specialRequests,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Unable to complete booking. Please pick another slot.');
        await loadAvailability(selectedDate);
        return;
      }

      // Only show confirmation once server persisted and returned the booking record
      setConfirmedBooking(data.booking);
      setSelectedStartHour(null);
      await loadAvailability(selectedDate);
      onBookingCreated();
    } catch {
      setFormError('Connection error while saving reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickDates = useMemo(() => {
    return [0, 1, 2, 3, 4].map((offset) => {
      const iso = addDaysIso(todayIso, offset);
      const label =
        offset === 0
          ? 'Today'
          : offset === 1
            ? 'Tomorrow'
            : new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              });
      return { iso, label };
    });
  }, [todayIso]);

  return (
    <section
      id="book"
      aria-labelledby="booking-heading"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
    >
      <RevealSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
            Live Pitch Reservations
          </p>
          <h2
            id="booking-heading"
            className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white [text-wrap:balance]"
          >
            Book Your 5-a-Side Slot
          </h2>
        </div>
        <p className="text-sm text-zinc-400 max-w-md">
          Real-time slot availability at Bharathi Nagar, Coimbatore. Every reservation is verified
          server-side to prevent double booking.
        </p>
      </RevealSection>

      <AnimatePresence mode="wait">
      {confirmedBooking ? (
        <motion.div
          key="booking-confirmed"
          data-testid="booking-confirmation"
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.35, ease: LUXURY_EASE }}
          className="rounded-xl bg-[#0D0D10] border border-[#D4AF37]/60 p-6 sm:p-10 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-9 h-9 text-[#FFD700] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-semibold">
                Reservation Saved & Confirmed
              </p>
              <h3 className="mt-1 font-display font-bold uppercase text-3xl text-white">
                See You On The Pitch, {confirmedBooking.customerName}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Keep your booking reference code handy at the CORNER KICK turf desk.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-lg bg-[#050505] border border-white/10">
                <div>
                  <span className="text-xs text-zinc-400 block">Reference Number</span>
                  <span className="font-mono-tabular text-lg font-bold text-[#FFD700]">
                    {confirmedBooking.referenceCode}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Match Date</span>
                  <span className="text-base font-semibold text-white">
                    {formatReadableDate(confirmedBooking.bookingDate)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Time & Duration</span>
                  <span className="font-mono-tabular text-base font-semibold text-white">
                    {formatHourRange(confirmedBooking.startHour, confirmedBooking.durationHours)} (
                    {confirmedBooking.durationHours} hr
                    {confirmedBooking.durationHours > 1 ? 's' : ''})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Total Payable</span>
                  <span className="font-mono-tabular text-base font-semibold text-[#F5E39E]">
                    {confirmedBooking.totalAmountInr !== null
                      ? formatInr(confirmedBooking.totalAmountInr)
                      : 'Confirmed by Turf Desk'}
                  </span>
                </div>
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <a
                  href={buildWhatsAppLink(buildBookingWhatsAppMessage(confirmedBooking))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold-sheen inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-sm tracking-wide uppercase hover:brightness-110 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Continue Booking on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setConfirmedBooking(null)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-white/20 text-sm font-semibold text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                >
                  <span>Book Another Slot</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="booking-form-grid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: LUXURY_EASE }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left 7 Columns: Calendar & Slot Matrix */}
          <div className="lg:col-span-7 rounded-xl bg-[#0B0B0E] border border-white/10 p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-[#D4AF37]" />
                <label htmlFor="booking-date-input" className="text-sm font-semibold text-white">
                  1. Select Match Date
                </label>
              </div>

              <input
                id="booking-date-input"
                type="date"
                min={todayIso}
                max={maxDateIso}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setSelectedStartHour(null);
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-[#050505] border border-white/20 text-sm text-white font-mono-tabular focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Quick Date Switcher */}
            <div className="flex flex-wrap gap-2 mt-4">
              {quickDates.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.iso);
                    setSelectedStartHour(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedDate === d.iso
                      ? 'bg-[#D4AF37] text-[#050505] font-bold'
                      : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Duration Selector */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <span className="text-sm font-semibold text-white">2. Playing Duration</span>
              <div className="flex items-center gap-2" role="group" aria-label="Playing duration">
                {([1, 2, 3] as const).map((hrs) => {
                  const disabled =
                    selectedStartHour !== null && !canFitDuration(selectedStartHour, hrs);
                  return (
                    <button
                      key={hrs}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDurationHours(hrs)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        durationHours === hrs
                          ? 'bg-[#D4AF37] text-[#050505]'
                          : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      {hrs} Hour{hrs > 1 ? 's' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Available</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Already Booked</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-amber-500/80" />
                <span>Blocked</span>
              </span>
            </div>

            {/* Slots Grid */}
            <div className="mt-4">
              {loadingSlots ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-16 rounded-lg bg-[#141418] animate-pulse border border-white/5"
                    />
                  ))}
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/40 text-sm text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{slotsError}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {slots.map((slot) => {
                    const isSelected =
                      selectedStartHour !== null &&
                      slot.hour >= selectedStartHour &&
                      slot.hour < selectedStartHour + durationHours;
                    const unavailable = slot.status !== 'available';

                    return (
                      <motion.button
                        key={slot.hour}
                        type="button"
                        disabled={unavailable}
                        whileHover={unavailable ? undefined : { y: -2 }}
                        whileTap={unavailable ? undefined : { scale: 0.97 }}
                        onClick={() => {
                          setFormError(null);
                          setSelectedStartHour(slot.hour);
                        }}
                        aria-pressed={isSelected}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-[#D4AF37]/20 border-[#FFD700] text-white shadow-[0_0_18px_rgba(212,175,55,0.18)]'
                            : unavailable
                              ? 'bg-[#08080A] border-white/5 text-zinc-500 opacity-65'
                              : 'bg-[#121216] border-white/10 text-zinc-200 hover:border-[#D4AF37]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono-tabular text-xs font-semibold">
                            {slot.label.split(' – ')[0]}
                          </span>
                          {slot.status === 'booked' ? (
                            <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          ) : slot.status === 'blocked' ? (
                            <Ban className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                          ) : (
                            <span className="text-[11px] font-medium text-[#D4AF37]">
                              {slot.isPeak ? 'Peak' : 'Open'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] font-mono-tabular text-zinc-400 truncate">
                          {slot.status === 'booked'
                            ? 'Booked'
                            : slot.status === 'blocked'
                              ? slot.reason || 'Blocked'
                              : slot.rateInr !== null
                                ? formatInr(slot.rateInr)
                                : 'Rate on request'}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Customer Details & Checkout */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 rounded-xl bg-[#0B0B0E] border border-[#D4AF37]/30 p-5 sm:p-7 space-y-5"
          >
            <div className="pb-4 border-b border-white/10">
              <h3 className="font-display font-bold uppercase text-2xl text-white">
                3. Squad Details & Confirm
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                {selectedStartHour !== null ? (
                  <span className="text-[#FFD700] font-mono-tabular font-medium">
                    {formatReadableDate(selectedDate)} ·{' '}
                    {formatHourRange(selectedStartHour, durationHours)}
                  </span>
                ) : (
                  'Select a time slot on the left to lock your kick-off.'
                )}
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-950/50 border border-red-500/40 text-xs sm:text-sm text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label htmlFor="bk-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Captain / Customer Name *
              </label>
              <input
                id="bk-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Karthik Sundar"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bk-mobile" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Mobile Number *
                </label>
                <input
                  id="bk-mobile"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm font-mono-tabular text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label htmlFor="bk-players" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Players Count (2–14)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="bk-players"
                    type="number"
                    min={2}
                    max={14}
                    required
                    value={playersCount}
                    onChange={(e) => setPlayersCount(Number(e.target.value))}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="bk-notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Special Requests (Optional)
              </label>
              <textarea
                id="bk-notes"
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Bibs, spare football, tournament inquiry..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>

            {/* Automatic Price Calculation Box */}
            <div className="p-4 rounded-lg bg-[#050505] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Selected Duration</span>
                <span className="font-mono-tabular text-zinc-200">
                  {durationHours} Hour{durationHours > 1 ? 's' : ''}
                </span>
              </div>

              {priceCalc && !priceCalc.isPricePending ? (
                <>
                  {priceCalc.discountInr > 0 && (
                    <div className="flex items-center justify-between text-xs text-[#D4AF37]">
                      <span>{activePricing.offerTitle || 'Active Offer'}</span>
                      <span className="font-mono-tabular">-{formatInr(priceCalc.discountInr)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total Amount</span>
                    <span className="font-mono-tabular text-xl font-bold text-[#FFD700]">
                      {formatInr(priceCalc.totalInr)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Turf Tariff</span>
                    <span className="text-xs font-semibold text-[#D4AF37]">
                      Confirmed at Desk / WhatsApp
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Owner-configured rates are confirmed directly once your slot is reserved.
                  </p>
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={submitting || selectedStartHour === null}
              whileHover={selectedStartHour !== null ? { scale: 1.015 } : undefined}
              whileTap={selectedStartHour !== null ? { scale: 0.985 } : undefined}
              className="btn-gold-sheen w-full py-3.5 px-6 rounded-lg gold-metallic-bg text-[#050505] font-bold text-sm tracking-[0.1em] uppercase hover:brightness-110 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Reserving Slot...' : 'Confirm Slot Reservation'}
            </motion.button>

            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#D4AF37]/35 text-xs font-semibold text-[#F5E39E] hover:border-[#FFD700] hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Need Help? Chat on WhatsApp (+91 97870 01896)</span>
            </a>
          </form>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
};
