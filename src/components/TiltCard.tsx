import React, { useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg)');
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; visible: boolean }>({
    x: 50,
    y: 50,
    visible: false,
  });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const px = xPct / 100 - 0.5;
    const py = yPct / 100 - 0.5;
    const rx = (-py * 7).toFixed(2);
    const ry = (px * 7).toFixed(2);
    setTransform(`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`);
    setSpotlight({ x: xPct, y: yPct, visible: true });
  };

  const handleLeave = () => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setSpotlight((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ transform }}
      className={`relative rounded-xl transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      <div
        aria-hidden="true"
        style={{
          opacity: spotlight.visible ? 1 : 0,
          background: `radial-gradient(420px circle at ${spotlight.x}% ${spotlight.y}%, rgba(255, 215, 0, 0.14), transparent 65%)`,
        }}
        className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300 z-10"
      />
      {children}
    </div>
  );
};
