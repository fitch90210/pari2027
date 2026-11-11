import { useEffect, useRef } from 'react'

const COLORS = ['#f2f2f0', '#4a7fa5', '#a8a8a8', '#f2f2f0', '#4a7fa5']

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

export default function Confetti({ onDone }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: randomBetween(canvas.width * 0.2, canvas.width * 0.8),
      y: randomBetween(-20, -80),
      w: randomBetween(6, 12),
      h: randomBetween(3, 6),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: randomBetween(-2.5, 2.5),
      vy: randomBetween(2, 5),
      angle: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.15, 0.15),
      opacity: 1,
    }))

    let frame
    let done = false

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allGone = true

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08 // gravity
        p.angle += p.spin
        if (p.y > canvas.height * 0.6) p.opacity -= 0.025
        p.opacity = Math.max(0, p.opacity)
        if (p.opacity > 0) allGone = false

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (allGone && !done) {
        done = true
        onDone?.()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  )
}
