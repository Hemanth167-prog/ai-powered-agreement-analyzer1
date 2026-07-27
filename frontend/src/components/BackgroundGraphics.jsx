export default function BackgroundGraphics() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-grid">
      {/* Top Left: Law Column */}
      <div className="absolute top-[10%] left-[6%] w-60 h-60 text-seal opacity-[0.035] animate-float-slow">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M20 25 L50 12 L80 25 Z" />
          <path d="M18 25 H82 V29 H18 Z" />
          <path d="M28 29 V75 M38 29 V75 M50 29 V75 M62 29 V75 M72 29 V75" strokeWidth="1.8" />
          <path d="M18 75 H82 V79 H18 Z" />
          <path d="M15 79 H85 V85 H15 Z" />
        </svg>
      </div>

      {/* Top Right: AI Document & Connection Nodes */}
      <div className="absolute top-[15%] right-[10%] w-64 h-64 text-seal opacity-[0.035] animate-float-delayed">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M30 20 H60 L75 35 V80 C75 82.2 73.2 84 71 84 H30 C27.8 84 26 82.2 26 80 V24 C26 21.8 27.8 20 30 20 Z" />
          <path d="M60 20 V35 H75" />
          <path d="M34 40 H50 M34 48 H66 M34 56 H66" strokeWidth="0.8" opacity="0.6" />
          <circle cx="70" cy="65" r="2.5" fill="currentColor" />
          <circle cx="50" cy="75" r="2.5" fill="currentColor" />
          <circle cx="80" cy="80" r="2.5" fill="currentColor" />
          <path d="M70 65 L50 75 M70 65 L80 80 M50 75 L80 80" strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Bottom Left: Law Gavel */}
      <div className="absolute bottom-[15%] left-[10%] w-64 h-64 text-seal opacity-[0.03] animate-float-delayed">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M30 35 L55 20 L65 35 L40 50 Z" />
          <path d="M35 32 L45 42 M50 23 L60 33" strokeWidth="0.8" />
          <path d="M47.5 37.5 L75 65 C77 67 77 70 75 72 C73 74 70 74 68 72 L40.5 44.5" strokeWidth="2" />
          <path d="M20 75 L45 65 L65 75 L40 85 Z" />
          <path d="M15 77 C15 77, 40 87, 65 77" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Bottom Right: Scale of Justice */}
      <div className="absolute bottom-[10%] right-[6%] w-72 h-72 text-seal opacity-[0.035] animate-float-slow">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M50 85 L50 25 M30 85 L70 85 M40 85 L50 80 L60 85" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M25 35 L75 35" strokeLinecap="round" strokeWidth="1.8" />
          <circle cx="50" cy="35" r="2" fill="currentColor" />
          <path d="M25 35 L15 55 L35 55 Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 55 C 15 65, 35 65, 35 55" strokeLinecap="round" />
          <path d="M75 35 L65 55 L85 55 Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M65 55 C 65 65, 85 65, 85 55" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
