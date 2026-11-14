import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Menu,
  MessageCircle,
  Shield,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import openTurfHeroImg from './assets/images/open_turf_hero_1794655807932.jpg';
import aboutTurfImg from './assets/images/about_turf_closeup_1794585974129.jpg';
import { AdminDashboard } from './components/AdminDashboard';
import { BookingSection } from './components/BookingSection';
import { ContactSection } from './components/ContactSection';
import { CornerKickLogo } from './components/CornerKickLogo';
import { GallerySection } from './components/GallerySection';
import { GoldCursorTrail } from './components/GoldCursorTrail';
import { LocationAndQrSection } from './components/LocationAndQrSection';
import {
  AnimatedCounter,
  HeroBackdropMotion,
  LUXURY_EASE,
  RevealSection,
  ScrollProgressBar,
  StaggerGroup,
  StaggerItem,
} from './components/MotionPrimitives';
import { TestimonialsSection } from './components/TestimonialsSection';
import { TiltCard } from './components/TiltCard';
import type { PublicSiteData } from './types';
import { buildWhatsAppLink, formatHourRange, formatInr } from './utils/bookingLogic';

const DEFAULT_PUBLIC_DATA: PublicSiteData = {
  pricing: {
    hourlyRateInr: 600,
    peakRateInr: 800,
    peakStartHour: 18,
    peakEndHour: 22,
    offerTitle: null,
    offerDescription: null,
    offerDiscountPercent: null,
    updatedAt: '',
  },
  facilities: [],
  gallery: [],
  promotions: [],
  testimonials: [],
  googleMapsEmbedUrl:
    'https://www.google.com/maps?q=Bharathi+Nagar,+Coimbatore,+Tamil+Nadu,+India&output=embed',
  stats: {
    confirmedBookingsCount: 0,
  },
};

export default function App() {
  const [siteData, setSiteData] = useState<PublicSiteData>(DEFAULT_PUBLIC_DATA);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.hash === '#admin',
  );
  const [preferredSlotFilter, setPreferredSlotFilter] = useState<'all' | 'peak' | 'standard' | null>(
    null,
  );
  const [scrolled, setScrolled] = useState(false);

  const loadSiteData = useCallback(async () => {
    try {
      const res = await fetch('/api/public-data');
      if (res.ok) {
        const json: PublicSiteData = await res.json();
        setSiteData(json);
      }
    } catch {
      // Keep graceful defaults if offline
    }
  }, []);

  useEffect(() => {
    void loadSiteData();
  }, [loadSiteData]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBookWithFilter = (filter: 'all' | 'peak' | 'standard') => {
    setPreferredSlotFilter(filter);
    document.querySelector('#book')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasConfiguredRates =
    siteData.pricing.hourlyRateInr !== null && siteData.pricing.hourlyRateInr > 0;

  return (
    <MotionConfig reducedMotion="user">
    <div
      data-state="main"
      className="min-h-screen bg-[#050505] text-white relative"
    >
      <ScrollProgressBar />
      <GoldCursorTrail />

      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 ${
          scrolled
            ? 'bg-[#050505]/95 border-b border-white/10 backdrop-blur-md'
            : 'bg-gradient-to-b from-black/85 to-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <a href="#hero" className="whitespace-nowrap shrink-0">
            <CornerKickLogo size="sm" />
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-300"
          >
            {[
              ['#hero', 'Home'],
              ['#about', 'About'],
              ['#gallery', 'Gallery'],
              ['#pricing', 'Pricing'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="nav-link-underline whitespace-nowrap shrink-0 hover:text-[#FFD700] transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action (+ mobile menu button) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#book"
              className="btn-gold-sheen hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider whitespace-nowrap shrink-0 hover:brightness-110 transition-all"
            >
              Book Now
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden w-10 h-10 rounded-lg bg-[#0D0D10] border border-white/15 flex items-center justify-center text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              aria-label="Mobile Navigation"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: LUXURY_EASE }}
              className="lg:hidden bg-[#08080A] border-b border-white/10 px-4 py-5 space-y-2"
            >
              {[
                ['#hero', 'Home'],
                ['#about', 'About'],
                ['#book', 'Book Now'],
                ['#pricing', 'Pricing'],
                ['#gallery', 'Gallery'],
                ['#location', 'Location & QR'],
                ['#contact', 'Contact'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/5 hover:text-[#FFD700]"
                >
                  {label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminOpen(true);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#D4AF37] hover:bg-white/5 cursor-pointer"
              >
                Owner Admin Console
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* 1. CINEMATIC HERO */}
        <section
          id="hero"
          className="relative min-h-[92vh] flex items-center pt-24 pb-20 px-4 sm:px-8 overflow-hidden"
        >
          <HeroBackdropMotion
            src={openTurfHeroImg}
            alt="CORNER KICK open-air 5-a-side football turf arena at dusk"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-[#050505]/40 to-transparent"
          />

          <div className="relative z-10 max-w-7xl mx-auto w-full">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
              }}
              className="max-w-3xl"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: LUXURY_EASE } },
                }}
                className="mb-6"
              >
                <CornerKickLogo size="lg" sweep />
              </motion.div>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: LUXURY_EASE } },
                }}
                className="text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-[#D4AF37]"
              >
                5-a-Side Football Turf · Bharathi Nagar, Coimbatore
              </motion.p>

              <motion.h1
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: LUXURY_EASE } },
                }}
                className="mt-3 font-display font-extrabold uppercase tracking-[0.03em] text-[clamp(2.75rem,6vw,5.25rem)] leading-[0.94] text-white [text-wrap:balance]"
              >
                YOUR GAME. YOUR ARENA.
              </motion.h1>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: LUXURY_EASE } },
                }}
                className="mt-4 text-base sm:text-xl text-zinc-300 max-w-xl"
              >
                Experience football like never before.
              </motion.p>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: LUXURY_EASE } },
                }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="#book"
                  className="btn-gold-sheen inline-flex items-center gap-2.5 px-7 py-4 rounded-lg gold-metallic-bg text-[#050505] font-bold text-sm uppercase tracking-[0.1em] hover:brightness-110 transition-all"
                >
                  <span>BOOK NOW</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.a>

                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  href="#about"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-[#0D0D10]/85 border border-[#D4AF37]/50 text-[#F5E39E] font-semibold text-sm uppercase tracking-[0.1em] hover:border-[#FFD700] hover:text-white transition-colors"
                >
                  <span>EXPLORE TURF</span>
                </motion.a>
              </motion.div>
            </motion.div>
          </div>

          <a
            href="#about"
            aria-label="Scroll to about CORNER KICK"
            className="hidden sm:inline-flex flex-col items-center gap-1 absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-zinc-400 hover:text-[#FFD700] transition-colors animate-float-gentle"
          >
            <span className="text-[10px] uppercase tracking-[0.26em]">Explore</span>
            <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
          </a>
        </section>

        {/* 2. ABOUT CORNER KICK */}
        <section
          id="about"
          aria-labelledby="about-heading"
          className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <RevealSection className="lg:col-span-6 rounded-xl overflow-hidden border border-white/10 bg-[#0B0B0E] min-h-[320px] group">
              <img
                src={aboutTurfImg}
                alt="Match football resting on the white corner kick arc at CORNER KICK Coimbatore"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </RevealSection>

            <RevealSection delay={0.1} className="lg:col-span-6 flex flex-col justify-between space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
                  Coimbatore’s Open-Air Arena
                </p>
                <h2
                  id="about-heading"
                  className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white [text-wrap:balance]"
                >
                  Built For Fast-Paced 5-a-Side Football
                </h2>
                <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Located in Bharathi Nagar, Coimbatore, CORNER KICK is an open-air 5-a-side
                  turf designed for intense matches from early morning kick-offs through evening
                  fixtures. Reserve your pitch online in seconds with instant reference confirmation
                  and direct WhatsApp coordination.
                </p>
              </div>

              {/* Actual Business Facts & Live DB Counters Only */}
              <StaggerGroup className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                <StaggerItem>
                  <span className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#FFD700] block">
                    5 v 5
                  </span>
                  <span className="mt-1 text-xs text-zinc-400 block">Match Format</span>
                </StaggerItem>
                <StaggerItem>
                  <span className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white block">
                    <AnimatedCounter value={17} />
                  </span>
                  <span className="mt-1 text-xs text-zinc-400 block">Daily Slots (6AM–11PM)</span>
                </StaggerItem>
                <StaggerItem>
                  <span className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white block">
                    <AnimatedCounter value={siteData.stats.confirmedBookingsCount} />
                  </span>
                  <span className="mt-1 text-xs text-zinc-400 block">Active Reservations</span>
                </StaggerItem>
                <StaggerItem>
                  <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#D4AF37] block">
                    <AnimatedCounter value={siteData.pricing.hourlyRateInr ?? 600} suffix=" Rupees" />
                  </span>
                  <span className="mt-1 text-xs text-zinc-400 block">Direct Turf Booking</span>
                </StaggerItem>
              </StaggerGroup>
            </RevealSection>
          </div>
        </section>

        {/* 3. ONLINE BOOKING SYSTEM */}
        <BookingSection
          pricing={siteData.pricing}
          preferredSlotFilter={preferredSlotFilter}
          onBookingCreated={loadSiteData}
        />

        {/* 5. PRICING & OFFERS (NEVER INVENTED) */}
        <section
          id="pricing"
          aria-labelledby="pricing-heading"
          className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
        >
          <RevealSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
                Transparent INR Tariff
              </p>
              <h2
                id="pricing-heading"
                className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white"
              >
                Turf Rates & Offers
              </h2>
            </div>
            {siteData.pricing.offerTitle && (
              <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-xs">
                <span className="font-bold text-[#FFD700] uppercase tracking-wider block">
                  {siteData.pricing.offerTitle}
                  {siteData.pricing.offerDiscountPercent
                    ? ` · ${siteData.pricing.offerDiscountPercent}% Off`
                    : ''}
                </span>
                {siteData.pricing.offerDescription && (
                  <span className="text-zinc-300 mt-0.5 block">
                    {siteData.pricing.offerDescription}
                  </span>
                )}
              </div>
            )}
          </RevealSection>

          {hasConfiguredRates ? (
            <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StaggerItem>
                <TiltCard className="h-full">
                  <div className="h-full rounded-xl bg-[#0B0B0E] border border-white/15 p-7 sm:p-9 flex flex-col justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                        Daylight & Standard Hours
                      </p>
                      <h3 className="mt-2 font-display font-bold uppercase text-3xl text-white">
                        Standard Pitch Hour
                      </h3>
                      <p className="mt-4 font-mono-tabular text-4xl font-bold text-[#F5E39E]">
                        {formatInr(siteData.pricing.hourlyRateInr)}
                        <span className="text-sm font-normal text-zinc-400"> / hour</span>
                      </p>
                      <p className="mt-4 text-sm text-zinc-400">
                        Full 5-a-side open turf pitch access during standard daylight hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToBookWithFilter('standard')}
                      className="mt-8 w-full py-3.5 rounded-lg border border-[#D4AF37]/60 text-[#FFD700] font-bold text-xs uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#050505] transition-colors cursor-pointer"
                    >
                      BOOK NOW
                    </button>
                  </div>
                </TiltCard>
              </StaggerItem>

              <StaggerItem>
                <TiltCard className="h-full">
                  <div className="h-full rounded-xl bg-[#0D0D11] border border-[#D4AF37]/60 p-7 sm:p-9 flex flex-col justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                        Prime Evening Hours ·{' '}
                        {formatHourRange(
                          siteData.pricing.peakStartHour,
                          siteData.pricing.peakEndHour - siteData.pricing.peakStartHour,
                        )}
                      </p>
                      <h3 className="mt-2 font-display font-bold uppercase text-3xl text-white">
                        Peak Evening Arena
                      </h3>
                      <p className="mt-4 font-mono-tabular text-4xl font-bold text-[#FFD700]">
                        {formatInr(
                          siteData.pricing.peakRateInr ?? siteData.pricing.hourlyRateInr,
                        )}
                        <span className="text-sm font-normal text-zinc-400"> / hour</span>
                      </p>
                      <p className="mt-4 text-sm text-zinc-400">
                        High-demand evening & prime-time slots on our open-air 5-a-side turf.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToBookWithFilter('peak')}
                      className="btn-gold-sheen mt-8 w-full py-3.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
                    >
                      BOOK NOW
                    </button>
                  </div>
                </TiltCard>
              </StaggerItem>
            </StaggerGroup>
          ) : (
            <div className="rounded-xl bg-[#0B0B0E] border border-[#D4AF37]/40 p-7 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">
                  Direct Owner Tariff
                </p>
                <h3 className="mt-2 font-display font-bold uppercase text-3xl text-white">
                  Hourly & Peak Rates Confirmed On Request
                </h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
                  CORNER KICK publishes exact INR hourly rates directly from the owner console.
                  Reserve your preferred time slot online now or request today’s slot tariff on
                  WhatsApp.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <a
                  href="#book"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider"
                >
                  <Calendar className="w-4 h-4" />
                  <span>BOOK NOW</span>
                </a>
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-[#D4AF37]/50 text-[#F5E39E] font-semibold text-xs uppercase tracking-wider hover:border-[#FFD700]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Rates</span>
                </a>
              </div>
            </div>
          )}

          {siteData.promotions.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
              {siteData.promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="p-5 rounded-xl bg-[#0B0B0E] border border-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#D4AF37]">{promo.discountText}</span>
                      {promo.code && (
                        <span className="font-mono-tabular text-zinc-300">{promo.code}</span>
                      )}
                    </div>
                    <h4 className="mt-2 text-base font-bold text-white">{promo.title}</h4>
                    {promo.description && (
                      <p className="mt-1 text-xs text-zinc-400">{promo.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6. CINEMATIC GALLERY */}
        <GallerySection items={siteData.gallery} />

        {/* 7. VERIFIED TESTIMONIALS */}
        <TestimonialsSection testimonials={siteData.testimonials} />

        {/* 8. LOCATION & SCANNABLE QR CODE */}
        <LocationAndQrSection googleMapsEmbedUrl={siteData.googleMapsEmbedUrl} />

        {/* 9. CONTACT */}
        <ContactSection />
      </main>

      {/* Quiet Luxury Footer */}
      <footer className="border-t border-white/10 bg-[#030304] py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <CornerKickLogo size="sm" />
            <p className="mt-2 text-xs text-zinc-400">
              5-a-Side Football Turf · Bharathi Nagar, Coimbatore, Tamil Nadu, India
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400">
            <a href="#book" className="hover:text-[#FFD700] transition-colors">
              Book Slot
            </a>
            <a href="#qr" className="hover:text-[#FFD700] transition-colors">
              Scan QR
            </a>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#D4AF37] hover:text-[#FFD700] transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Owner Portal</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Gold WhatsApp Button (respects <= 15% mobile sticky height) */}
      <motion.a
        href={buildWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Book on WhatsApp (+919787001896)"
        initial={{ opacity: 0, scale: 0.88, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35, ease: LUXURY_EASE }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="btn-gold-sheen fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full gold-metallic-bg text-[#050505] font-bold text-xs uppercase tracking-wider shadow-[0_10px_30px_rgba(212,175,55,0.35)]"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">WhatsApp Book</span>
      </motion.a>

      {adminOpen && (
        <AdminDashboard
          onClose={() => {
            setAdminOpen(false);
            if (window.location.hash === '#admin') {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
          onDataUpdated={loadSiteData}
        />
      )}
    </div>
    </MotionConfig>
  );
}
