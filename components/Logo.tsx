/* eslint-disable @next/next/no-img-element */
// Dietak logo — the original AI-generated apple mark (د + D back-to-back
// with a leaf), cropped from the source artwork. Served from /public/logo.png.
export default function Logo({ size = 80 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Dietak دايتك"
      width={size}
      height={size}
      className="no-invert"
      style={{
        borderRadius: '22%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  )
}
