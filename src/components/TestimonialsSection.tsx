import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Quote, Star, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { TestimonialRecord } from '../types';
import { LUXURY_EASE, RevealSection } from './MotionPrimitives';

interface TestimonialsSectionProps {
  testimonials: TestimonialRecord[];
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ testimonials }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showModal, setShowModal] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [teamOrRole, setTeamOrRole] = useState('');
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, teamOrRole, rating, quote, bookingRef }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Unable to submit review.' });
      } else {
        setFeedback({
          type: 'ok',
          text: data.message || 'Review submitted for owner verification.',
        });
        setAuthorName('');
        setTeamOrRole('');
        setQuote('');
        setBookingRef('');
      }
    } catch {
      setFeedback({ type: 'err', text: 'Connection error submitting review.' });
    } finally {
      setSubmitting(false);
    }
  };

  const current = testimonials.length > 0 ? testimonials[activeIndex % testimonials.length] : null;

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
    >
      <RevealSection className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
            Verified Match Feedback
          </p>
          <h2
            id="testimonials-heading"
            className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white"
          >
            Player Voices
          </h2>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setFeedback(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#D4AF37]/50 text-xs font-semibold uppercase tracking-wider text-[#F5E39E] hover:border-[#FFD700] hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Share Match Review</span>
        </motion.button>
      </RevealSection>

      <RevealSection delay={0.08}>
        {current ? (
          <div className="rounded-xl bg-[#0B0B0E] border border-white/10 p-6 sm:p-10 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.3, ease: LUXURY_EASE }}
              >
                <div className="flex items-center justify-between gap-4">
                  <Quote className="w-8 h-8 text-[#D4AF37]/60" />
                  <div className="flex items-center gap-1" aria-label={`Rated ${current.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < current.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <blockquote className="mt-6 text-lg sm:text-2xl font-medium text-white leading-relaxed max-w-4xl">
                  “{current.quote}”
                </blockquote>

                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{current.authorName}</p>
                    <p className="text-xs text-zinc-400">
                      {current.teamOrRole}
                      {current.bookingRef ? ` · Verified Ref ${current.bookingRef}` : ''}
                    </p>
                  </div>

                  {testimonials.length > 1 && (
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          setDirection(-1);
                          setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
                        }}
                        aria-label="Previous review"
                        className="w-10 h-10 rounded-lg bg-[#141418] border border-white/15 flex items-center justify-center text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </motion.button>
                      <span className="font-mono-tabular text-xs text-zinc-400 px-2">
                        {(activeIndex % testimonials.length) + 1} / {testimonials.length}
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          setDirection(1);
                          setActiveIndex((prev) => (prev + 1) % testimonials.length);
                        }}
                        aria-label="Next review"
                        className="w-10 h-10 rounded-lg bg-[#141418] border border-white/15 flex items-center justify-center text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-xl bg-[#0B0B0E] border border-white/10 p-8 sm:p-12 text-center">
            <p className="text-base font-semibold text-white">
              Only genuine, owner-verified player reviews appear here.
            </p>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
              Played a 5-a-side match at CORNER KICK in Bharathi Nagar? Submit your honest feedback
              with your booking reference.
            </p>
          </div>
        )}
      </RevealSection>

      {/* Submit Review Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Submit a genuine match review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: LUXURY_EASE }}
              className="w-full max-w-lg rounded-xl bg-[#0D0D10] border border-[#D4AF37]/40 p-6 sm:p-8 relative"
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close review modal"
                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-[#141418] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-display font-bold uppercase text-2xl text-white">
                Submit Player Review
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Reviews are published after verification by CORNER KICK management.
              </p>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    feedback.type === 'ok'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/50 border-red-500/40 text-red-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <div>
                <label htmlFor="rev-name" className="block text-xs font-medium text-zinc-300 mb-1">
                  Your Name *
                </label>
                <input
                  id="rev-name"
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rev-role" className="block text-xs font-medium text-zinc-300 mb-1">
                    Squad / Role
                  </label>
                  <input
                    id="rev-role"
                    type="text"
                    value={teamOrRole}
                    onChange={(e) => setTeamOrRole(e.target.value)}
                    placeholder="e.g. Weekend Squad Captain"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label htmlFor="rev-ref" className="block text-xs font-medium text-zinc-300 mb-1">
                    Booking Reference (Optional)
                  </label>
                  <input
                    id="rev-ref"
                    type="text"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    placeholder="CK-YYYYMMDD-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-300 mb-1.5">Rating</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      aria-label={`Rate ${starVal} stars`}
                      className="p-1.5 rounded bg-[#050505] border border-white/10 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          starVal <= rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="rev-quote" className="block text-xs font-medium text-zinc-300 mb-1">
                  Your Review *
                </label>
                <textarea
                  id="rev-quote"
                  rows={3}
                  required
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Share your experience of the open turf surface, pitch quality, and booking process..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-gold-sheen w-full py-3 rounded-lg gold-metallic-bg text-[#050505] font-bold text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
