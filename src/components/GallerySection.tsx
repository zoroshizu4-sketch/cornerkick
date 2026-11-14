import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Camera } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { GalleryItem } from '../types';
import { LUXURY_EASE, RevealSection } from './MotionPrimitives';

interface GallerySectionProps {
  items: GalleryItem[];
}

const CATEGORIES = ['All', 'Turf', 'Matches', 'Night Football', 'Celebrations', 'Action'] as const;

export const GallerySection: React.FC<GallerySectionProps> = ({ items }) => {
  const [filter, setFilter] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [brokenIds, setBrokenIds] = useState<Record<number, boolean>>({});

  const filtered =
    filter === 'All' ? items : items.filter((item) => item.category === filter);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % filtered.length,
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + filtered.length) % filtered.length,
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filtered.length]);

  const activeItem = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
    >
      <RevealSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
            Arena Visuals
          </p>
          <h2
            id="gallery-heading"
            className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white"
          >
            Open Turf Gallery
          </h2>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-[#0D0D10] border border-white/10"
          role="tablist"
          aria-label="Gallery category filter"
        >
          {CATEGORIES.map((cat) => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(cat);
                  setLightboxIndex(null);
                }}
                className={`relative px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active ? 'text-[#050505] font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="gallery-active-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-md bg-[#D4AF37]"
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            );
          })}
        </div>
      </RevealSection>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: LUXURY_EASE }}
          className="rounded-xl bg-[#0B0B0E] border border-white/10 p-12 text-center"
        >
          <Camera className="w-8 h-8 text-[#D4AF37] mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            No photos uploaded in the {filter} category yet.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => {
              const spanClass =
                idx === 0
                  ? 'md:col-span-8 aspect-[16/9]'
                  : idx === 1
                    ? 'md:col-span-4 aspect-[4/3] md:aspect-auto'
                    : 'md:col-span-4 aspect-[4/3]';
              const isBroken = Boolean(brokenIds[item.id]);

              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 14 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.24), ease: LUXURY_EASE }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`group relative rounded-xl overflow-hidden bg-[#0D0D10] border border-white/10 hover:border-[#D4AF37]/60 text-left cursor-pointer transition-colors ${spanClass}`}
                >
                  {isBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F0F13] to-[#050505] p-6 text-center">
                      <Camera className="w-7 h-7 text-[#D4AF37] mb-2" />
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                    </div>
                  ) : (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenIds((prev) => ({ ...prev, [item.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  <div className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-black/70 border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200">
                    <Maximize2 className="w-4 h-4 text-[#FFD700]" />
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-5 transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                    <p className="text-xs text-[#D4AF37] font-medium">{item.category}</p>
                    <h3 className="mt-0.5 text-lg font-bold text-white">{item.title}</h3>
                    {item.caption && (
                      <p className="mt-1 text-xs text-zinc-300 line-clamp-1">{item.caption}</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={activeItem.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close gallery preview"
              className="absolute top-5 right-5 w-11 h-11 rounded-lg bg-[#141418] border border-white/20 flex items-center justify-center text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {filtered.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === null ? 0 : (prev - 1 + filtered.length) % filtered.length,
                    )
                  }
                  aria-label="Previous photo"
                  className="absolute left-4 sm:left-8 w-11 h-11 rounded-lg bg-[#141418] border border-white/20 flex items-center justify-center text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === null ? 0 : (prev + 1) % filtered.length,
                    )
                  }
                  aria-label="Next photo"
                  className="absolute right-4 sm:right-8 w-11 h-11 rounded-lg bg-[#141418] border border-white/20 flex items-center justify-center text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.28, ease: LUXURY_EASE }}
                className="max-w-5xl w-full flex flex-col items-center"
              >
                <img
                  src={activeItem.imageUrl}
                  alt={activeItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[76vh] w-auto max-w-full rounded-xl object-contain border border-[#D4AF37]/30"
                />
                <div className="mt-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                    {activeItem.category}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">{activeItem.title}</h3>
                  {activeItem.caption && (
                    <p className="mt-1 text-sm text-zinc-400">{activeItem.caption}</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
