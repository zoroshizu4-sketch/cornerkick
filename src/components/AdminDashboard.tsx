import React, { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Calendar,
  Check,
  ImagePlus,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BlockedSlotRecord,
  BookingRecord,
  EnquiryRecord,
  FacilityRecord,
  GalleryItem,
  PricingConfig,
  PromotionRecord,
  TestimonialRecord,
} from '../types';
import { formatHourRange, formatInr, OPERATING_END_HOUR, OPERATING_START_HOUR } from '../utils/bookingLogic';

interface AdminDashboardProps {
  onClose: () => void;
  onDataUpdated: () => void;
}

type AdminTab =
  | 'bookings'
  | 'availability'
  | 'pricing'
  | 'facilities'
  | 'gallery'
  | 'enquiries'
  | 'reviews'
  | 'settings';

interface DashboardSnapshot {
  bookings: BookingRecord[];
  blockedSlots: BlockedSlotRecord[];
  pricing: PricingConfig;
  facilities: FacilityRecord[];
  gallery: GalleryItem[];
  promotions: PromotionRecord[];
  testimonials: TestimonialRecord[];
  enquiries: EnquiryRecord[];
  googleMapsEmbedUrl: string;
}

const ADMIN_TOKEN_KEY = 'ck_admin_token';

function getStoredAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

async function adminFetch(
  input: string,
  init: RequestInit = {},
  explicitToken?: string | null,
): Promise<Response> {
  const token = explicitToken ?? getStoredAdminToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onDataUpdated,
}) => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Pricing form states
  const [hourlyRate, setHourlyRate] = useState('');
  const [peakRate, setPeakRate] = useState('');
  const [peakStart, setPeakStart] = useState(18);
  const [peakEnd, setPeakEnd] = useState(22);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');

  // Block slot state
  const [blockDate, setBlockDate] = useState(new Date().toISOString().slice(0, 10));
  const [blockHour, setBlockHour] = useState(18);
  const [blockReason, setBlockReason] = useState('Private Tournament');

  // New Promo state
  const [promoTitle, setPromoTitle] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscountText, setPromoDiscountText] = useState('');
  const [promoDesc, setPromoDesc] = useState('');

  // New Gallery state
  const [galTitle, setGalTitle] = useState('');
  const [galCat, setGalCat] = useState<GalleryItem['category']>('Turf');
  const [galUrl, setGalUrl] = useState('');
  const [galCaption, setGalCaption] = useState('');

  // Settings state
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [newPasscode, setNewPasscode] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const applyDashboardSnapshot = useCallback((snap: DashboardSnapshot) => {
    setData(snap);
    setHourlyRate(snap.pricing.hourlyRateInr !== null ? String(snap.pricing.hourlyRateInr) : '');
    setPeakRate(snap.pricing.peakRateInr !== null ? String(snap.pricing.peakRateInr) : '');
    setPeakStart(snap.pricing.peakStartHour);
    setPeakEnd(snap.pricing.peakEndHour);
    setOfferTitle(snap.pricing.offerTitle || '');
    setOfferDesc(snap.pricing.offerDescription || '');
    setOfferDiscount(
      snap.pricing.offerDiscountPercent !== null
        ? String(snap.pricing.offerDiscountPercent)
        : '',
    );
    setMapEmbedUrl(snap.googleMapsEmbedUrl);
    setAuthenticated(true);
  }, []);

  const fetchDashboard = useCallback(
    async (explicitToken?: string | null) => {
      const res = await adminFetch('/api/admin/dashboard', {}, explicitToken);
      if (res.status === 401) {
        setStoredAdminToken(null);
        setAuthenticated(false);
        return false;
      }
      if (res.ok) {
        const snap: DashboardSnapshot = await res.json();
        applyDashboardSnapshot(snap);
        return true;
      }
      return false;
    },
    [applyDashboardSnapshot],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminFetch('/api/admin/session');
        const json = await res.json();
        if (json.authenticated) {
          await fetchDashboard();
        } else {
          setStoredAdminToken(null);
          setAuthenticated(false);
        }
      } catch {
        setAuthenticated(false);
      }
    })();
  }, [fetchDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error || 'Authentication failed.');
        return;
      }
      if (json.token) {
        setStoredAdminToken(String(json.token));
      }
      setPasscode('');
      if (json.dashboard) {
        applyDashboardSnapshot(json.dashboard as DashboardSnapshot);
      } else {
        const loaded = await fetchDashboard(json.token ?? null);
        if (!loaded) {
          setLoginError('Session could not be established. Please try again.');
        }
      }
    } catch {
      setLoginError('Network error connecting to Owner Console.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    setStoredAdminToken(null);
    setAuthenticated(false);
    setData(null);
  };

  const updateBookingStatus = async (id: number, status: BookingRecord['status']) => {
    await adminFetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchDashboard();
    onDataUpdated();
    showToast(`Booking marked as ${status}.`);
  };

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockDate, startHour: blockHour, reason: blockReason }),
    });
    if (res.ok) {
      await fetchDashboard();
      onDataUpdated();
      showToast('Slot blocked.');
    }
  };

  const handleUnblockSlot = async (id: number) => {
    await adminFetch(`/api/admin/blocked-slots/${id}`, { method: 'DELETE' });
    await fetchDashboard();
    onDataUpdated();
    showToast('Slot unblocked.');
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hourlyRateInr: hourlyRate.trim() ? Number(hourlyRate) : null,
        peakRateInr: peakRate.trim() ? Number(peakRate) : null,
        peakStartHour: peakStart,
        peakEndHour: peakEnd,
        offerTitle: offerTitle.trim() || null,
        offerDescription: offerDesc.trim() || null,
        offerDiscountPercent: offerDiscount.trim() ? Number(offerDiscount) : null,
      }),
    });
    if (res.ok) {
      await fetchDashboard();
      onDataUpdated();
      showToast('Pricing & offers saved to live site.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Error saving pricing.');
    }
  };

  const toggleFacilityConfirm = async (facility: FacilityRecord) => {
    await adminFetch(`/api/admin/facilities/${facility.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !facility.confirmed }),
    });
    await fetchDashboard();
    onDataUpdated();
    showToast(`${facility.title} ${!facility.confirmed ? 'confirmed' : 'hidden'}.`);
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: promoTitle,
        code: promoCode,
        discountText: promoDiscountText,
        description: promoDesc,
      }),
    });
    if (res.ok) {
      setPromoTitle('');
      setPromoCode('');
      setPromoDiscountText('');
      setPromoDesc('');
      await fetchDashboard();
      onDataUpdated();
      showToast('Promotion published.');
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: galTitle,
        category: galCat,
        imageUrl: galUrl,
        caption: galCaption,
      }),
    });
    if (res.ok) {
      setGalTitle('');
      setGalUrl('');
      setGalCaption('');
      await fetchDashboard();
      onDataUpdated();
      showToast('Gallery photo added.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleMapsEmbedUrl: mapEmbedUrl,
        newPasscode: newPasscode || undefined,
      }),
    });
    if (res.ok) {
      setNewPasscode('');
      await fetchDashboard();
      onDataUpdated();
      showToast('Settings saved.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CORNER KICK Owner Admin Console"
      className="fixed inset-0 z-50 bg-black/92 overflow-y-auto p-3 sm:p-6"
    >
      <div className="max-w-6xl mx-auto rounded-xl bg-[#0B0B0E] border border-[#D4AF37]/40 min-h-[82vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
            <h2 className="font-display font-bold uppercase text-2xl tracking-wide text-white">
              CORNER KICK Owner Console
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141418] border border-white/15 text-xs text-zinc-300 hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close owner console"
              className="w-9 h-9 rounded-lg bg-[#141418] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {toast && (
          <div className="mx-5 sm:mx-8 mt-4 p-3 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-xs font-medium text-[#FFD700]">
            {toast}
          </div>
        )}

        {/* Auth Gate */}
        {authenticated === null ? (
          <div className="flex-1 flex items-center justify-center p-12 text-sm text-zinc-400">
            Verifying owner session...
          </div>
        ) : !authenticated ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-sm rounded-xl bg-[#050505] border border-white/15 p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">
                  Protected Access
                </span>
              </div>
              <h3 className="font-display font-bold uppercase text-2xl text-white">
                Owner Sign In
              </h3>
              <p className="text-xs text-zinc-400">
                Enter your owner passcode configured in environment settings to manage bookings,
                pricing, confirmed facilities, and slots.
              </p>

              {loginError && (
                <p className="p-2.5 rounded bg-red-950/60 border border-red-500/40 text-xs text-red-200">
                  {loginError}
                </p>
              )}

              <div>
                <label htmlFor="admin-passcode" className="block text-xs text-zinc-300 mb-1.5">
                  Owner Passcode
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0D10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-3 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60"
              >
                {loginSubmitting ? 'Unlocking...' : 'Unlock Owner Console'}
              </button>
            </form>
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 px-5 sm:px-8 py-3 border-b border-white/10 bg-[#070709]">
              {(
                [
                  ['bookings', `Bookings (${data.bookings.length})`],
                  ['availability', 'Block Slots'],
                  ['pricing', 'Pricing & Offers'],
                  ['facilities', 'Confirm Facilities'],
                  ['gallery', 'Gallery'],
                  ['enquiries', `Enquiries (${data.enquiries.length})`],
                  ['reviews', `Reviews (${data.testimonials.length})`],
                  ['settings', 'Venue Settings'],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === tabKey
                      ? 'bg-[#D4AF37] text-[#050505]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5 sm:p-8 flex-1 space-y-6">
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold uppercase text-2xl text-white">
                    Bookings & Match History
                  </h3>
                  {data.bookings.length === 0 ? (
                    <p className="text-sm text-zinc-400">No bookings recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#050505] text-zinc-400 uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Ref</th>
                            <th className="p-3">Date & Slot</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Players</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {data.bookings.map((b) => (
                            <tr key={b.id} className="hover:bg-white/[0.02]">
                              <td className="p-3 font-mono-tabular font-semibold text-[#FFD700]">
                                {b.referenceCode}
                              </td>
                              <td className="p-3 font-mono-tabular text-zinc-200">
                                {b.bookingDate}
                                <span className="block text-zinc-400">
                                  {formatHourRange(b.startHour, b.durationHours)}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-white block">
                                  {b.customerName}
                                </span>
                                <span className="font-mono-tabular text-zinc-400">
                                  {b.mobileNumber}
                                </span>
                              </td>
                              <td className="p-3 font-mono-tabular text-zinc-300">
                                {b.playersCount}
                              </td>
                              <td className="p-3 font-mono-tabular text-zinc-200">
                                {formatInr(b.totalAmountInr)}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-xs font-semibold uppercase ${
                                    b.status === 'confirmed'
                                      ? 'text-emerald-400'
                                      : b.status === 'cancelled'
                                        ? 'text-red-400'
                                        : 'text-amber-400'
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {b.status !== 'confirmed' && (
                                    <button
                                      type="button"
                                      onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                      className="px-2.5 py-1 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                  )}
                                  {b.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                      className="px-2.5 py-1 rounded bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'availability' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <form
                    onSubmit={handleBlockSlot}
                    className="rounded-xl bg-[#050505] border border-white/10 p-5 space-y-4"
                  >
                    <h3 className="font-display font-bold uppercase text-xl text-white flex items-center gap-2">
                      <Ban className="w-4 h-4 text-[#D4AF37]" />
                      <span>Block a Time Slot</span>
                    </h3>
                    <div>
                      <label htmlFor="blk-date" className="block text-xs text-zinc-400 mb-1">
                        Date
                      </label>
                      <input
                        id="blk-date"
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="blk-hour" className="block text-xs text-zinc-400 mb-1">
                        Start Hour
                      </label>
                      <select
                        id="blk-hour"
                        value={blockHour}
                        onChange={(e) => setBlockHour(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm text-white"
                      >
                        {Array.from(
                          { length: OPERATING_END_HOUR - OPERATING_START_HOUR },
                          (_, i) => OPERATING_START_HOUR + i,
                        ).map((h) => (
                          <option key={h} value={h}>
                            {formatHourRange(h, 1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="blk-reason" className="block text-xs text-zinc-400 mb-1">
                        Reason
                      </label>
                      <input
                        id="blk-reason"
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Block Slot
                    </button>
                  </form>

                  <div className="rounded-xl bg-[#050505] border border-white/10 p-5 space-y-3">
                    <h3 className="font-display font-bold uppercase text-xl text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      <span>Active Blocked Slots</span>
                    </h3>
                    {data.blockedSlots.length === 0 ? (
                      <p className="text-xs text-zinc-400">No slots currently blocked.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.blockedSlots.map((blk) => (
                          <div
                            key={blk.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D10] border border-white/10 text-xs"
                          >
                            <div>
                              <span className="font-mono-tabular font-semibold text-white">
                                {blk.blockDate} · {formatHourRange(blk.startHour, 1)}
                              </span>
                              <span className="block text-zinc-400">{blk.reason}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnblockSlot(blk.id)}
                              className="p-2 rounded text-red-400 hover:bg-red-950/50 cursor-pointer"
                              aria-label="Unblock slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={handleSavePricing}
                    className="rounded-xl bg-[#050505] border border-white/10 p-5 space-y-4"
                  >
                    <h3 className="font-display font-bold uppercase text-xl text-white">
                      Hourly & Peak-Hour Rates (INR ₹)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Leave empty to display &ldquo;Rate on Request&rdquo;. Once saved, the live
                      booking calculator uses these exact rates.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="pr-std" className="block text-xs text-zinc-400 mb-1">
                          Standard Hourly Rate (₹)
                        </label>
                        <input
                          id="pr-std"
                          type="number"
                          min={0}
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          placeholder="e.g. 1200"
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm font-mono-tabular text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="pr-peak" className="block text-xs text-zinc-400 mb-1">
                          Peak Evening Rate (₹)
                        </label>
                        <input
                          id="pr-peak"
                          type="number"
                          min={0}
                          value={peakRate}
                          onChange={(e) => setPeakRate(e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm font-mono-tabular text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="pr-ps" className="block text-xs text-zinc-400 mb-1">
                          Peak Start Hour (24h)
                        </label>
                        <input
                          id="pr-ps"
                          type="number"
                          min={6}
                          max={22}
                          value={peakStart}
                          onChange={(e) => setPeakStart(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm font-mono-tabular text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="pr-pe" className="block text-xs text-zinc-400 mb-1">
                          Peak End Hour (24h)
                        </label>
                        <input
                          id="pr-pe"
                          type="number"
                          min={7}
                          max={23}
                          value={peakEnd}
                          onChange={(e) => setPeakEnd(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm font-mono-tabular text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="pr-off-t" className="block text-xs text-zinc-400 mb-1">
                          Active Offer Title
                        </label>
                        <input
                          id="pr-off-t"
                          type="text"
                          value={offerTitle}
                          onChange={(e) => setOfferTitle(e.target.value)}
                          placeholder="e.g. Weekday Morning Offer"
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="pr-off-pct" className="block text-xs text-zinc-400 mb-1">
                          Discount % (0–90)
                        </label>
                        <input
                          id="pr-off-pct"
                          type="number"
                          min={0}
                          max={90}
                          value={offerDiscount}
                          onChange={(e) => setOfferDiscount(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm font-mono-tabular text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="pr-off-d" className="block text-xs text-zinc-400 mb-1">
                        Offer Notes
                      </label>
                      <input
                        id="pr-off-d"
                        type="text"
                        value={offerDesc}
                        onChange={(e) => setOfferDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Save Rates & Offers
                    </button>
                  </form>

                  {/* Promotions CRUD */}
                  <div className="rounded-xl bg-[#050505] border border-white/10 p-5 space-y-4">
                    <h3 className="font-display font-bold uppercase text-xl text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#D4AF37]" />
                      <span>Promotions</span>
                    </h3>
                    <form onSubmit={handleAddPromo} className="space-y-3 pb-4 border-b border-white/10">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={promoTitle}
                          onChange={(e) => setPromoTitle(e.target.value)}
                          placeholder="Promo title"
                          className="px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Code (optional)"
                          className="px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs font-mono-tabular text-white"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        value={promoDiscountText}
                        onChange={(e) => setPromoDiscountText(e.target.value)}
                        placeholder="Offer highlight (e.g. ₹200 Off Morning Slots)"
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={promoDesc}
                        onChange={(e) => setPromoDesc(e.target.value)}
                        placeholder="Terms / details"
                        className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#D4AF37] text-[#050505] font-bold text-xs uppercase cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Promotion</span>
                      </button>
                    </form>

                    <div className="space-y-2">
                      {data.promotions.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded bg-[#0D0D10] border border-white/10 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white">{p.title}</span>
                            <span className="block text-[#D4AF37]">{p.discountText}</span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
                              await fetchDashboard();
                              onDataUpdated();
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-950/40 rounded cursor-pointer"
                            aria-label="Delete promotion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'facilities' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display font-bold uppercase text-2xl text-white">
                      Owner-Confirmed Facilities
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Only confirmed amenities are displayed on the public CORNER KICK website.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.facilities.map((fac) => (
                      <div
                        key={fac.id}
                        className={`p-5 rounded-xl border ${
                          fac.confirmed
                            ? 'bg-[#0D0D10] border-[#D4AF37]/60'
                            : 'bg-[#050505] border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-xs text-[#D4AF37] font-medium">
                              {fac.category}
                            </span>
                            <h4 className="text-base font-bold text-white mt-0.5">{fac.title}</h4>
                            <p className="text-xs text-zinc-400 mt-1.5">{fac.description}</p>
                            <p className="text-[11px] font-mono-tabular text-zinc-500 mt-2">
                              {fac.specs}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleFacilityConfirm(fac)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase shrink-0 cursor-pointer transition-colors ${
                              fac.confirmed
                                ? 'bg-[#D4AF37] text-[#050505]'
                                : 'bg-[#141418] border border-white/20 text-zinc-300 hover:border-[#D4AF37]'
                            }`}
                          >
                            {fac.confirmed ? 'Confirmed' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'gallery' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleAddGallery}
                    className="rounded-xl bg-[#050505] border border-white/10 p-5 space-y-3"
                  >
                    <h3 className="font-display font-bold uppercase text-xl text-white flex items-center gap-2">
                      <ImagePlus className="w-4 h-4 text-[#D4AF37]" />
                      <span>Add Venue Photo</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={galTitle}
                        onChange={(e) => setGalTitle(e.target.value)}
                        placeholder="Photo title"
                        className="px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={galCat}
                        onChange={(e) => setGalCat(e.target.value as GalleryItem['category'])}
                        className="px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                      >
                        <option value="Turf">Turf</option>
                        <option value="Matches">Matches</option>
                        <option value="Night Football">Night Football</option>
                        <option value="Celebrations">Celebrations</option>
                        <option value="Action">Action</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={galUrl}
                        onChange={(e) => setGalUrl(e.target.value)}
                        placeholder="Image URL"
                        className="px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={galCaption}
                      onChange={(e) => setGalCaption(e.target.value)}
                      placeholder="Short caption"
                      className="w-full px-3 py-2 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase cursor-pointer"
                    >
                      Add to Gallery
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {data.gallery.map((g) => (
                      <div
                        key={g.id}
                        className="rounded-lg bg-[#050505] border border-white/10 overflow-hidden flex flex-col"
                      >
                        <img
                          src={g.imageUrl}
                          alt={g.title}
                          referrerPolicy="no-referrer"
                          className="h-36 w-full object-cover"
                        />
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{g.title}</p>
                            <p className="text-[11px] text-[#D4AF37]">{g.category}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE' });
                              await fetchDashboard();
                              onDataUpdated();
                            }}
                            aria-label={`Delete ${g.title}`}
                            className="p-1.5 text-red-400 hover:bg-red-950/40 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'enquiries' && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold uppercase text-2xl text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                    <span>Customer Enquiries</span>
                  </h3>
                  {data.enquiries.length === 0 ? (
                    <p className="text-sm text-zinc-400">No enquiries received yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.enquiries.map((enq) => (
                        <div
                          key={enq.id}
                          className="p-4 rounded-xl bg-[#050505] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-bold text-white">{enq.name}</span>
                              <span className="font-mono-tabular text-[#D4AF37]">{enq.phone}</span>
                              {enq.email && <span className="text-zinc-400">{enq.email}</span>}
                            </div>
                            <p className="mt-1.5 text-sm text-zinc-300">{enq.message}</p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(`/api/admin/enquiries/${enq.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: enq.status === 'new' ? 'replied' : 'new',
                                }),
                              });
                              await fetchDashboard();
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                              enq.status === 'replied'
                                ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                                : 'bg-[#141418] border border-white/20 text-white'
                            }`}
                          >
                            {enq.status === 'replied' ? 'Replied' : 'Mark Replied'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold uppercase text-2xl text-white">
                    Moderate Genuine Player Reviews
                  </h3>
                  {data.testimonials.length === 0 ? (
                    <p className="text-sm text-zinc-400">No player reviews submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.testimonials.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 rounded-xl bg-[#050505] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-xs text-[#D4AF37] font-semibold">
                              {t.authorName} · {t.teamOrRole} · {t.rating}/5
                            </p>
                            <p className="mt-1 text-sm text-zinc-200">“{t.quote}”</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                await adminFetch(`/api/admin/testimonials/${t.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ approved: !t.approved }),
                                });
                                await fetchDashboard();
                                onDataUpdated();
                              }}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                                t.approved
                                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-[#D4AF37] text-[#050505]'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{t.approved ? 'Published' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await adminFetch(`/api/admin/testimonials/${t.id}`, {
                                  method: 'DELETE',
                                });
                                await fetchDashboard();
                                onDataUpdated();
                              }}
                              className="p-1.5 text-red-400 hover:bg-red-950/40 rounded cursor-pointer"
                              aria-label="Delete review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <form
                  onSubmit={handleSaveSettings}
                  className="max-w-xl rounded-xl bg-[#050505] border border-white/10 p-6 space-y-4"
                >
                  <h3 className="font-display font-bold uppercase text-2xl text-white">
                    Venue & Security Settings
                  </h3>
                  <div>
                    <label htmlFor="set-map" className="block text-xs text-zinc-400 mb-1">
                      Google Maps Embed URL (Bharathi Nagar, Coimbatore)
                    </label>
                    <input
                      id="set-map"
                      type="url"
                      value={mapEmbedUrl}
                      onChange={(e) => setMapEmbedUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="set-pass" className="block text-xs text-zinc-400 mb-1">
                      Update Owner Passcode (leave blank to keep current)
                    </label>
                    <input
                      id="set-pass"
                      type="password"
                      minLength={6}
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 rounded bg-[#0D0D10] border border-white/15 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Save Settings
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
