import React, { useState, useEffect } from 'react';

const CartoonTruckSVG = () => (
  <svg
    width="144"
    height="144"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Main Truck Cargo Box */}
    <rect x="4" y="18" width="34" height="26" rx="3" fill="var(--paper)" />
    <path d="M10 26h12M10 32h16" strokeWidth="1.5" opacity="0.6" />

    {/* Cab */}
    <path d="M38 22h12l7 9v13H38V22z" fill="var(--paper)" />

    {/* Centered Cab Window (3.5px spacing from front windshield slope) */}
    <path d="M40.5 24.5h7l3.5 5v4.5H40.5v-9.5z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    
    {/* Simple Driver Avatar (centered in window) */}
    <circle cx="45.5" cy="28.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="var(--paper)" />
    <path d="M42 33.5c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" stroke="currentColor" strokeWidth="1.3" fill="none" />


    {/* Wheels */}
    <circle cx="16" cy="46" r="6" fill="var(--paper)" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="16" cy="46" r="2" fill="var(--ink)" />
    
    <circle cx="48" cy="46" r="6" fill="var(--paper)" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="48" cy="46" r="2" fill="var(--ink)" />

    {/* Rich Cartoon Tire Smoke Puffs trailing behind rear wheel */}
    <g className="smoke-puff-group">
      <circle className="smoke-puff smoke-1" cx="9" cy="47" r="3" fill="var(--mist)" opacity="0.7" stroke="none" />
      <circle className="smoke-puff smoke-2" cx="4" cy="46" r="4.5" fill="var(--mist)" opacity="0.6" stroke="none" />
      <circle className="smoke-puff smoke-3" cx="-2" cy="45" r="6" fill="var(--mist)" opacity="0.5" stroke="none" />
      <circle className="smoke-puff smoke-4" cx="-8" cy="44" r="7.5" fill="var(--mist)" opacity="0.4" stroke="none" />
      <circle className="smoke-puff smoke-5" cx="-15" cy="43" r="9" fill="var(--mist)" opacity="0.3" stroke="none" />
    </g>
  </svg>
);

export default function SplashIntro() {
  const [show, setShow] = useState(() => {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
      }
    } catch (e) {
      // matchMedia unsupported
    }
    return true;
  });

  const [fading, setFading] = useState(false);

  // Auto-trigger fadeout at 1.45s (drive animation duration at 3/4 speed)
  useEffect(() => {
    if (!show) return;
    const driveTimer = setTimeout(() => setFading(true), 1450);
    return () => clearTimeout(driveTimer);
  }, [show]);

  // 1. ACCESSIBILITY: Attach keydown listener on window to dismiss on any keypress
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = () => {
      setFading(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  const dismiss = () => {
    setFading(true);
  };

  // 3. TIMING CONSISTENCY: Unmount via onTransitionEnd when CSS fade-out completes
  const handleTransitionEnd = (e) => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && fading) {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className={`splash-overlay ${fading ? 'fade-out' : ''}`}
      onClick={dismiss}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && dismiss()}
      onTransitionEnd={handleTransitionEnd}
      role="button"
      tabIndex={0}
      aria-label="Skip intro animation"
      title="Click or press any key to skip"
    >
      <div className="splash-truck">
        <CartoonTruckSVG />
      </div>
      <div className="splash-logo">
        <div className="sidebar-logo-icon" style={{ width: 36, height: 36, fontSize: 14 }}>LM</div>
        <div className="splash-wordmark">Last-Mile Tracker</div>
      </div>
    </div>
  );
}
