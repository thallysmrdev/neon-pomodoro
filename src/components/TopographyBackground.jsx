import React from 'react';

export default function TopographyBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40">
      {/* Radial soft purple ambient glow behind peaks */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-44 bg-neon-purple/20 rounded-full blur-3xl pointer-events-none" />

      {/* Topographic Mountain Contour Lines */}
      <svg
        className="w-full h-56 object-cover"
        viewBox="0 0 380 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.3" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Mountain Contour Curves */}
        {/* Layer 1 - Peak */}
        <path
          d="M 190 20 Q 210 28 225 45 T 255 70 T 290 100 L 320 130"
          stroke="url(#neonGradient)"
          strokeWidth="1.8"
          filter="url(#neonGlow)"
        />
        <path
          d="M 190 20 Q 170 30 155 50 T 115 80 T 80 110 L 50 140"
          stroke="url(#neonGradient)"
          strokeWidth="1.8"
          filter="url(#neonGlow)"
        />

        {/* Repetitive contour strata mimicking wireframe mountain */}
        {[
          "M 190 32 Q 215 42 232 58 T 265 85 T 300 115 L 340 145",
          "M 190 32 Q 165 42 148 60 T 108 90 T 70 122 L 35 155",
          "M 190 44 Q 220 56 240 72 T 275 100 T 315 130 L 360 160",
          "M 190 44 Q 160 56 140 72 T 100 102 T 60 135 L 20 170",
          "M 190 56 Q 225 70 248 86 T 285 115 T 330 145 L 375 175",
          "M 190 56 Q 155 70 132 86 T 92 115 T 50 148 L 10 185",
          "M 190 68 Q 230 84 255 100 T 295 130 T 345 160 L 380 190",
          "M 190 68 Q 150 84 125 100 T 85 130 T 40 162 L 0 195",
          "M 190 80 Q 235 98 262 115 T 305 145 L 360 180",
          "M 190 80 Q 145 98 118 115 T 75 145 L 20 185",
          "M 190 92 Q 240 112 270 130 T 315 160 L 370 195",
          "M 190 92 Q 140 112 110 130 T 65 160 L 10 200",
          "M 190 104 Q 245 126 278 145 T 325 175",
          "M 190 104 Q 135 126 102 145 T 55 175",
          "M 190 116 Q 250 140 285 160 T 335 190",
          "M 190 116 Q 130 140 95 160 T 45 190",
          "M 190 128 Q 255 154 292 175",
          "M 190 128 Q 125 154 88 175",
          "M 190 140 Q 260 168 300 190",
          "M 190 140 Q 120 168 80 190",
        ].map((d, index) => (
          <path
            key={index}
            d={d}
            stroke="url(#neonGradient)"
            strokeWidth={1.2}
            strokeOpacity={Math.max(0.2, 0.9 - index * 0.035)}
          />
        ))}

        {/* Central Ridge highlights */}
        <path
          d="M 190 20 L 190 150"
          stroke="#C084FC"
          strokeWidth="1.5"
          strokeOpacity="0.7"
          strokeDasharray="2 3"
          filter="url(#neonGlow)"
        />
      </svg>
    </div>
  );
}
