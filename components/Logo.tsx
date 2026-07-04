export default function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="no-invert"
    >
      <defs>
        <radialGradient id="logoBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0533" />
          <stop offset="100%" stopColor="#0a0014" />
        </radialGradient>
        <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6b21a8" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ec4899" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="outerGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#logoBg)" />

      {/* Gradient border ring */}
      <circle
        cx="50" cy="50" r="47"
        fill="none"
        stroke="url(#armGrad)"
        strokeWidth="1.5"
        strokeOpacity="0.65"
      />

      {/* Subtle inner glow */}
      <circle cx="50" cy="50" r="30" fill="#6b21a8" fillOpacity="0.07" />

      {/* ── Hybrid د / D — one continuous stroke ── */}
      {/* Tip (like د's start) → right-bulging bowl (D) → baseline tail gliding left (د) */}
      <path
        d="M 38,28 C 62,23 76,36 74,50 C 72,64 60,71 36,69.5 C 30,69 25,67.5 20.5,64.5"
        stroke="url(#armGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      {/* Subtle D stem hint */}
      <path
        d="M 36,31.5 C 34.8,43 34.4,55 35.6,66.5"
        stroke="url(#stemGrad)"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        filter="url(#glow)"
      />

      {/* Galaxy star accent above the tip */}
      <circle cx="52" cy="18" r="5.5" fill="url(#starGrad)" filter="url(#outerGlow)" />
      <circle cx="52" cy="18" r="2.5" fill="white" opacity="0.95" />

      {/* Scattered mini stars */}
      <circle cx="78" cy="21" r="1.8" fill="#f59e0b" opacity="0.85" />
      <circle cx="84" cy="58" r="1.2" fill="#ec4899" opacity="0.75" />
      <circle cx="18" cy="76" r="1.6" fill="#c084fc" opacity="0.7" />
      <circle cx="76" cy="82" r="1" fill="#f59e0b" opacity="0.6" />
      <circle cx="19" cy="32" r="1" fill="#06b6d4" opacity="0.65" />
      <circle cx="66" cy="12" r="1.2" fill="white" opacity="0.55" />
      <circle cx="11" cy="46" r="1" fill="#ec4899" opacity="0.55" />
      <circle cx="88" cy="37" r="0.8" fill="white" opacity="0.5" />
    </svg>
  )
}
