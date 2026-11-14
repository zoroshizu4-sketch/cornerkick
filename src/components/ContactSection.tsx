import React, { useState } from 'react';
import { CheckCircle2, Instagram, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { buildWhatsAppLink, DISPLAY_PHONE } from '../utils/bookingLogic';
import { LUXURY_EASE, RevealSection } from './MotionPrimitives';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'err', text: data.error || 'Could not send message.' });
      } else {
        setStatus({
          type: 'ok',
          text: 'Enquiry received! Our Bharathi Nagar turf desk will reach out shortly.',
        });
        setName('');
        setPhone('');
        setEmail('');
        setMessage('');
      }
    } catch {
      setStatus({ type: 'err', text: 'Connection error sending your message.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Info (5 cols) */}
        <RevealSection className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
              Turf Desk & Tournament Inquiries
            </p>
            <h2
              id="contact-heading"
              className="mt-2 font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight text-white"
            >
              Connect With CORNER KICK
            </h2>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Hosting a corporate 5-a-side cup, weekend league, or regular evening squad session in
              Coimbatore? Call, WhatsApp, or drop an enquiry below.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <motion.a
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2, ease: LUXURY_EASE }}
              href={`tel:${DISPLAY_PHONE}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#0B0B0E] border border-white/10 hover:border-[#D4AF37]/60 transition-colors"
            >
              <Phone className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div>
                <span className="text-xs text-zinc-400 block">Direct Phone</span>
                <span className="font-mono-tabular text-base font-semibold text-white">
                  {DISPLAY_PHONE}
                </span>
              </div>
            </motion.a>

            <motion.a
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2, ease: LUXURY_EASE }}
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl bg-[#0B0B0E] border border-white/10 hover:border-[#D4AF37]/60 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-[#FFD700] shrink-0" />
              <div>
                <span className="text-xs text-zinc-400 block">WhatsApp Bookings</span>
                <span className="font-mono-tabular text-base font-semibold text-white">
                  +91 97870 01896
                </span>
              </div>
            </motion.a>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0B0B0E] border border-white/10">
              <MapPin className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div>
                <span className="text-xs text-zinc-400 block">Arena Address</span>
                <span className="text-sm font-medium text-white">
                  Bharathi Nagar, Coimbatore, Tamil Nadu, India
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <motion.a
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CORNER KICK WhatsApp"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0B0E] border border-white/15 text-xs font-medium text-zinc-300 hover:border-[#D4AF37] hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>WhatsApp</span>
            </motion.a>
            <motion.a
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CORNER KICK Instagram"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0B0E] border border-white/15 text-xs font-medium text-zinc-300 hover:border-[#D4AF37] hover:text-white transition-colors"
            >
              <Instagram className="w-4 h-4 text-[#D4AF37]" />
              <span>Instagram</span>
            </motion.a>
            <motion.a
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              href={`tel:${DISPLAY_PHONE}`}
              aria-label="Call CORNER KICK"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0B0E] border border-white/15 text-xs font-medium text-zinc-300 hover:border-[#D4AF37] hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <span>Turf Desk</span>
            </motion.a>
          </div>
        </RevealSection>

        {/* Right Form (7 cols) */}
        <RevealSection delay={0.1} className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl bg-[#0B0B0E] border border-white/10 p-6 sm:p-8 space-y-5"
          >
            <h3 className="font-display font-bold uppercase text-2xl text-white">
              Send an Enquiry
            </h3>

            <AnimatePresence>
              {status && (
                <motion.div
                  role="status"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={`p-4 rounded-lg border text-sm flex items-start gap-2.5 ${
                    status.type === 'ok'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/50 border-red-500/40 text-red-200'
                  }`}
                >
                  {status.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{status.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ct-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="ct-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="ct-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Mobile / WhatsApp *
                </label>
                <input
                  id="ct-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="97870 01896"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm font-mono-tabular text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ct-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email (Optional)
              </label>
              <input
                id="ct-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="captain@squad.in"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="ct-msg" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Message *
              </label>
              <textarea
                id="ct-msg"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your preferred match timings, corporate tournament dates, or coaching inquiry..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-white/15 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] resize-none transition-colors"
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="btn-gold-sheen inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg gold-metallic-bg text-[#050505] font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending...' : 'Send Enquiry'}</span>
            </motion.button>
          </form>
        </RevealSection>
      </div>
    </section>
  );
};
