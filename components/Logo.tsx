import Image from 'next/image'

const heightMap = {
    sm: 32,
    md: 48,
    lg: 64,
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const h = heightMap[size]
    const w = Math.round(h * (180 / 56)) // conserver le ratio original

  return (
        <Image
                src="/logo.png"
                alt="L'Établi Architecture & Design"
                width={w}
                height={h}
                priority
                style={{ objectFit: 'contain' }}
              />
      )
}
