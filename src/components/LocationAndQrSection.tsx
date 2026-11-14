import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, MapPin, Navigation, Phone, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { DISPLAY_PHONE } from '../utils/bookingLogic';
import { LUXURY_EASE, RevealSection } from './MotionPrimitives';

interface LocationAndQrSectionProps {
  googleMapsEmbedUrl: string;
}

const CENTER_LOGO_SVG = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="qrLogoGold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F5E39E" />
      <stop offset="45%" stop-color="#D4AF37" />
      <stop offset="75%" stop-color="#FFD700" />
      <stop offset="100%" stop-color="#9D7615" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="10" stroke="url(#qrLogoGold)" stroke-width="2.5" fill="#08080A" />
  <path d="M14 50 V16 H48" stroke="url(#qrLogoGold)" stroke-width="2.5" stroke-linecap="round" />
  <path d="M14 34 A16 16 0 0 1 30 50" stroke="url(#qrLogoGold)" stroke-width="2" stroke-dasharray="3 3" />
  <path d="M18 16 L36 22 L18 28 Z" fill="url(#qrLogoGold)" />
  <circle cx="42" cy="40" r="10" stroke="url(#qrLogoGold)" stroke-width="2.2" fill="#0B0B0E" />
  <polygon points="42,34 47,38 45,44 39,44 37,38" fill="url(#qrLogoGold)" />
</svg>
`.trim();

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const LocationAndQrSection: React.FC<LocationAndQrSectionProps> = ({
  googleMapsEmbedUrl,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrTarget, setQrTarget] = useState<'website' | 'booking'>('website');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [downloadDataUrl, setDownloadDataUrl] = useState<string>('');

  useEffect(() => {
    const origin = window.location.origin;
    const targetUrl = qrTarget === 'booking' ? `${origin}/#book` : origin;
    setQrUrl(targetUrl);

    let cancelled = false;
    const canvas = qrCanvasRef.current;
    if (canvas) {
      void QRCode.toCanvas(
        canvas,
        targetUrl,
        {
          width: 240,
          margin: 3,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#FFFFFF',
            light: '#050505',
          },
        },
        (err) => {
          if (err || cancelled) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setDownloadDataUrl(canvas.toDataURL('image/png'));
            return;
          }

          const logoImg = new Image();
          logoImg.onload = () => {
            if (cancelled) return;
            const badgeSize = 54;
            const logoSize = 44;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            ctx.save();
            drawRoundedRect(
              ctx,
              cx - badgeSize / 2,
              cy - badgeSize / 2,
              badgeSize,
              badgeSize,
              10,
            );
            ctx.fillStyle = '#050505';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#D4AF37';
            ctx.stroke();
            ctx.drawImage(
              logoImg,
              cx - logoSize / 2,
              cy - logoSize / 2,
              logoSize,
              logoSize,
            );
            ctx.restore();

            setDownloadDataUrl(canvas.toDataURL('image/png'));
          };
          logoImg.onerror = () => {
            if (!cancelled) {
              setDownloadDataUrl(canvas.toDataURL('image/png'));
            }
          };
          logoImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CENTER_LOGO_SVG)}`;
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [qrTarget]);

  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=Bharathi+Nagar,Coimbatore,Tamil+Nadu,India';

  return (
    <section
      id="location"
      aria-labelledby="location-heading"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Location & Configurable Map (7 cols) */}
        <RevealSection className="lg:col-span-7 rounded-xl bg-[#0B0B0E] border border-white/10 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
              Find The Pitch
            </p>
            <h2
              id="location-heading"
              className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white"
            >
              Bharathi Nagar, Coimbatore
            </h2>
            <p className="mt-3 text-sm text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>CORNER KICK 5-a-Side Football Turf · Bharathi Nagar, Coimbatore, Tamil Nadu, India</span>
            </p>
          </div>

          <div className="mt-6 rounded-xl overflow-hidden border border-white/15 bg-[#050505] aspect-[16/9]">
            {googleMapsEmbedUrl ? (
              <iframe
                title="CORNER KICK Bharathi Nagar Coimbatore Map"
                src={googleMapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full border-0 grayscale contrast-125 opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-zinc-400">
                Google Maps embed URL can be configured by the owner in Admin Settings.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-sheen inline-flex items-center gap-2 px-6 py-3 rounded-lg gold-metallic-bg text-[#050505] font-bold text-xs sm:text-sm uppercase tracking-wider hover:brightness-110 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>GET DIRECTIONS</span>
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`tel:${DISPLAY_PHONE}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#D4AF37]/50 text-[#F5E39E] font-semibold text-xs sm:text-sm uppercase tracking-wider hover:border-[#FFD700] hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>CALL NOW · {DISPLAY_PHONE}</span>
            </motion.a>
          </div>
        </RevealSection>

        {/* Scannable Black & Gold QR Code Card (5 cols) */}
        <RevealSection
          delay={0.1}
          className="lg:col-span-5 rounded-xl bg-[#0B0B0E] border border-[#D4AF37]/40 p-6 sm:p-8 flex flex-col items-center justify-between text-center"
        >
          <div id="qr" className="w-full">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
              <QrCode className="w-4 h-4" />
              <span>Instant Arena Access</span>
            </div>
            <h3 className="mt-2 font-display font-bold uppercase text-3xl text-white">
              Scan To Open Website
            </h3>
            <p className="mt-2 text-xs text-zinc-400 max-w-xs mx-auto">
              Point any smartphone camera at this white QR code with our centered emblem to open
              CORNER KICK directly on your device.
            </p>
          </div>

          {/* Toggle QR destination */}
          <div
            className="mt-5 inline-flex p-1 rounded-lg bg-[#050505] border border-white/10"
            role="group"
            aria-label="QR Code Destination"
          >
            {(
              [
                ['website', 'Website Home'],
                ['booking', 'Direct Booking Page'],
              ] as const
            ).map(([key, label]) => {
              const active = qrTarget === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQrTarget(key)}
                  className={`relative px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    active ? 'text-[#050505]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="qr-target-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-md bg-[#D4AF37]"
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={qrTarget}
            initial={{ scale: 0.96, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: LUXURY_EASE }}
            className="relative my-6 p-4 rounded-xl bg-[#050505] border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.12)] overflow-hidden"
          >
            {/* Subtle animated gold laser scan sweep across QR frame */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-2 h-6 bg-gradient-to-b from-transparent via-[#FFD700]/20 to-transparent qr-scan-beam"
            />
            <canvas
              ref={qrCanvasRef}
              data-testid="corner-kick-qr"
              aria-label={`Scannable QR code opening ${qrUrl}`}
              className="relative z-10 w-[210px] h-[210px] sm:w-[230px] sm:h-[230px] block"
            />
          </motion.div>

          <div className="w-full space-y-3">
            <p className="font-mono-tabular text-[11px] text-zinc-400 truncate px-2" title={qrUrl}>
              {qrUrl}
            </p>

            {downloadDataUrl && (
              <motion.a
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                href={downloadDataUrl}
                download={`corner-kick-${qrTarget}-qr.png`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#D4AF37]/60 text-[#FFD700] text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#050505] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download QR Code</span>
              </motion.a>
            )}
          </div>
        </RevealSection>
      </div>
    </section>
  );
};
