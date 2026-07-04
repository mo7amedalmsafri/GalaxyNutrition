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
        {/* Gold D: yellow top → orange bottom */}
        <linearGradient id="goldGrad" x1="50%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#FFD84D" />
          <stop offset="55%" stopColor="#FBAF1E" />
          <stop offset="100%" stopColor="#F07C12" />
        </linearGradient>
        {/* Green د: lime top → teal bottom */}
        <linearGradient id="greenGrad" x1="60%" y1="0%" x2="30%" y2="100%">
          <stop offset="0%" stopColor="#9BE428" />
          <stop offset="55%" stopColor="#3ECB6A" />
          <stop offset="100%" stopColor="#14C9C0" />
        </linearGradient>
        {/* Leaf */}
        <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4FC93D" />
          <stop offset="100%" stopColor="#B3EC2E" />
        </linearGradient>
      </defs>

      {/* Dark circle background */}
      <circle cx="50" cy="50" r="48" fill="#08080c" />
      <circle
        cx="50" cy="50" r="47"
        fill="none"
        stroke="url(#greenGrad)"
        strokeWidth="1.2"
        strokeOpacity="0.35"
      />

      {/* Emblem, scaled slightly to fit the circle */}
      <g transform="translate(50,50) scale(0.88) translate(-50,-50)">
        {/* Gold Latin D (right) — bowl right, underside swoosh */}
        <path fill="url(#goldGrad)" fillRule="evenodd" clipRule="evenodd"
          d="M 52,16
             L 58,15.5
             C 75,15 85,28 85,45
             C 85,61 76,71.5 60,74
             C 54,75 47.5,77.5 42.5,80.5
             C 46.5,74.5 48.8,70 49.3,65.5
             L 49.3,23
             C 49.8,20 50.7,17.5 52,16
             Z
             M 58,28.5
             C 67.5,28.5 74,35.5 74,45
             C 74,54.5 67.5,61.5 58,61.5
             L 56.5,61.5
             L 56.5,28.5
             Z" />

        {/* Green Arabic د (left, back-to-back ribbon) */}
        <path fill="url(#greenGrad)"
          d="M 46,20
             C 33,17.5 21.5,26.5 19.8,40
             C 18.3,52.5 24.5,63.5 34.5,68.5
             L 27.5,78
             C 33.5,74.5 38,72.8 42,72
             C 33,66.5 27.3,55.5 28.2,44.5
             C 29,34 36,27 46.5,27
             C 47.2,24.5 47,22 46,20
             Z" />

        {/* Leaf on top */}
        <path fill="url(#leafGrad)"
          d="M 47.5,17.5
             C 43,9 33,6 24.5,8.5
             C 25,17 31.5,23.5 40.5,24
             C 43.5,24.2 46,21.5 47.5,17.5
             Z" />
        {/* Leaf vein slit */}
        <path d="M 28,11 C 33,13.5 38.5,17.5 43.5,22"
          stroke="#08080c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
