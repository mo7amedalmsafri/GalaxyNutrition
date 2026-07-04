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
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#97E325" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
        <linearGradient id="dalGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
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
        stroke="url(#brandGrad)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />

      {/* Subtle inner glow */}
      <circle cx="50" cy="50" r="30" fill="#00D4FF" fillOpacity="0.05" />

      {/* ── Progress-ring D ── */}
      {/* Track: faint full D outline */}
      <path
        d="M 36,29 C 35,42.5 35,57 36,70 M 36,29 C 63,23.5 76,36 74.5,50 C 73,64 61.5,72.5 36,70"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Progress: stem + most of the bowl, brand green→cyan */}
      <path
        d="M 36,70 C 35,57 35,42.5 36,29 C 57.5,24.5 70,31.5 74,43"
        stroke="url(#brandGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      {/* Progress endpoint: glowing star dot */}
      <circle cx="74" cy="43" r="4.6" fill="url(#starGrad)" filter="url(#outerGlow)" />
      <circle cx="74" cy="43" r="2" fill="white" opacity="0.95" />

      {/* د tail: baseline sweeping left, cyan→violet */}
      <path
        d="M 36,70 C 30,69.8 25,68 20.5,64"
        stroke="url(#dalGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
        filter="url(#glow)"
      />

      {/* Scattered mini stars */}
      <circle cx="80" cy="64" r="1.4" fill="#00D4FF" opacity="0.7" />
      <circle cx="20" cy="32" r="1.2" fill="#97E325" opacity="0.7" />
      <circle cx="68" cy="14" r="1.2" fill="white" opacity="0.5" />
      <circle cx="16" cy="76" r="1.4" fill="#8b5cf6" opacity="0.6" />
      <circle cx="86" cy="26" r="1" fill="#97E325" opacity="0.6" />
    </svg>
  )
}
