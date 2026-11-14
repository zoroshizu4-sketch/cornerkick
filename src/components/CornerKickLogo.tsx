import React from 'react';

interface CornerKickLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  sweep?: boolean;
  className?: string;
}

export const CornerKickLogo: React.FC<CornerKickLogoProps> = ({
  size = 'md',
  sweep = false,
  className = '',
}) => {
  const dimensions = {
    sm: { icon: 24, text: 'text-xl' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 44, text: 'text-4xl sm:text-5xl' },
    xl: { icon: 60, text: 'text-5xl sm:text-7xl' },
  }[size];

  return (
    <span
      className={`group inline-flex items-center gap-3 select-none ${
        sweep ? 'gold-sweep-overlay px-2 py-1 rounded' : ''
      } ${className}`}
    >
      <svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-3"
      >
        <defs>
          <linearGradient id="ckGoldGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E39E" />
            <stop offset="45%" stopColor="#D4AF37" />
            <stop offset="75%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#9D7615" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="10" stroke="url(#ckGoldGrad)" strokeWidth="2.5" fill="#08080A" />
        {/* Corner arc & flag */}
        <path d="M14 50 V16 H48" stroke="url(#ckGoldGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14 34 A16 16 0 0 1 30 50" stroke="url(#ckGoldGrad)" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M18 16 L36 22 L18 28 Z" fill="url(#ckGoldGrad)" />
        {/* Football emblem */}
        <circle cx="42" cy="40" r="10" stroke="url(#ckGoldGrad)" strokeWidth="2.2" fill="#0B0B0E" />
        <polygon points="42,34 47,38 45,44 39,44 37,38" fill="url(#ckGoldGrad)" />
      </svg>
      <span
        className={`font-display font-extrabold tracking-[0.14em] uppercase leading-none gold-gradient-text ${dimensions.text}`}
      >
        CORNER KICK
      </span>
    </span>
  );
};
