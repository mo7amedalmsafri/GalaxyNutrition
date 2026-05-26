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

      {/* ── Arabic letter غ as galaxy arms ── */}
      {/* Main sweeping arc (body of غ) */}
      <path
        d="M 30,42 C 14,40 11,56 22,66 C 33,76 54,77 66,64 C 74,54 70,40 60,40"
        stroke="url(#armGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      {/* Hook stroke (right upstroke of غ) */}
      <path
        d="M 60,40 C 66,32 62,23 53,26"
        stroke="url(#armGrad)"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Nukta of غ → glowing star */}
      <circle cx="36" cy="24" r="5.5" fill="url(#starGrad)" filter="url(#outerGlow)" />
      <circle cx="36" cy="24" r="2.5" fill="white" opacity="0.95" />

      {/* Scattered mini stars */}
      <circle cx="76" cy="19" r="1.8" fill="#f59e0b" opacity="0.85" />
      <circle cx="83" cy="58" r="1.2" fill="#ec4899" opacity="0.75" />
      <circle cx="18" cy="76" r="1.6" fill="#c084fc" opacity="0.7" />
      <circle cx="79" cy="80" r="1" fill="#f59e0b" opacity="0.6" />
      <circle cx="20" cy="30" r="1" fill="#06b6d4" opacity="0.65" />
      <circle cx="68" cy="12" r="1.2" fill="white" opacity="0.55" />
      <circle cx="11" cy="44" r="1" fill="#ec4899" opacity="0.55" />
      <circle cx="88" cy="35" r="0.8" fill="white" opacity="0.5" />
    </svg>
  )
}
