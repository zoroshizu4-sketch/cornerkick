import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

export const LUXURY_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ScrollProgressBar: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-[#9D7615] via-[#FFD700] to-[#F5E39E] z-50 pointer-events-none"
    />
  );
};

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

export const RevealSection: React.FC<RevealSectionProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 14,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.45, delay, ease: LUXURY_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export const StaggerGroup: React.FC<StaggerGroupProps> = ({
  children,
  className = '',
  stagger = 0.06,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: LUXURY_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = '',
  durationMs = 900,
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isInView, value, durationMs, shouldReduceMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {displayValue}
      {suffix}
    </span>
  );
};

interface HeroBackdropMotionProps {
  src: string;
  alt: string;
}

const EMBERS = [
  { left: '14%', bottom: '18%', size: 3, duration: '6.8s', delay: '0s' },
  { left: '28%', bottom: '12%', size: 2, duration: '8.2s', delay: '1.2s' },
  { left: '46%', bottom: '22%', size: 3, duration: '7.4s', delay: '0.6s' },
  { left: '64%', bottom: '15%', size: 2.5, duration: '9.1s', delay: '2.1s' },
  { left: '78%', bottom: '25%', size: 3.5, duration: '7.8s', delay: '0.9s' },
  { left: '88%', bottom: '14%', size: 2, duration: '8.5s', delay: '1.7s' },
];

export const HeroBackdropMotion: React.FC<HeroBackdropMotionProps> = ({ src, alt }) => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 700], [0, shouldReduceMotion ? 0 : 85]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ y: parallaxY }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-60 hero-ken-burns"
        />
      </motion.div>

      {/* Subtle architectural pitch corner-arc line animation */}
      <svg
        aria-hidden="true"
        viewBox="0 0 420 420"
        fill="none"
        className="pointer-events-none absolute -right-12 -bottom-12 w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] opacity-25"
      >
        <motion.path
          d="M 380 40 L 380 380 L 40 380"
          stroke="#D4AF37"
          strokeWidth="1.5"
          initial={shouldReduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: LUXURY_EASE }}
        />
        <motion.path
          d="M 380 210 A 170 170 0 0 0 210 380"
          stroke="#FFD700"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          initial={shouldReduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.6, delay: 0.25, ease: LUXURY_EASE }}
        />
      </svg>

      {/* Soft ambient floating gold light specks */}
      {!shouldReduceMotion && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          {EMBERS.map((ember, idx) => (
            <span
              key={idx}
              style={
                {
                  left: ember.left,
                  bottom: ember.bottom,
                  width: `${ember.size}px`,
                  height: `${ember.size}px`,
                  '--ember-duration': ember.duration,
                  '--ember-delay': ember.delay,
                } as React.CSSProperties
              }
              className="absolute rounded-full bg-[#FFD700]/70 blur-[0.5px] gold-ember"
            />
          ))}
        </div>
      )}
    </>
  );
};
