import { useState, useEffect } from 'react'
import { getWikipediaThumbUrl } from '../data/candidatePhotos'

// Cache en mémoire pour éviter de refetcher à chaque render
const photoCache = {}

function AvatarPlaceholder({ size }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--bg-3)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" fill="var(--text-muted)" opacity="0.45" />
        <path d="M2 22c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="var(--text-muted)" opacity="0.3" />
      </svg>
    </div>
  )
}

export default function CandidateAvatar({ name, size = 32 }) {
  const [photoUrl, setPhotoUrl] = useState(() =>
    typeof photoCache[name] === 'string' ? photoCache[name] : null
  )
  const [failed, setFailed] = useState(photoCache[name] === false)

  useEffect(() => {
    if (photoCache[name] !== undefined) return
    const apiUrl = getWikipediaThumbUrl(name, size)
    if (!apiUrl) {
      photoCache[name] = false
      setFailed(true)
      return
    }
    let cancelled = false
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const pages = data?.query?.pages ?? {}
        const page = Object.values(pages)[0]
        const url = page?.thumbnail?.source ?? null
        photoCache[name] = url ?? false
        if (url) setPhotoUrl(url)
        else setFailed(true)
      })
      .catch(() => {
        if (!cancelled) { photoCache[name] = false; setFailed(true) }
      })
    return () => { cancelled = true }
  }, [name, size])

  if (failed) return <AvatarPlaceholder size={size} />

  if (!photoUrl) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        flexShrink: 0,
      }} />
    )
  }

  return (
    <img
      src={photoUrl}
      alt={name}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        objectPosition: 'top',
        flexShrink: 0,
        border: '1px solid var(--border)',
        display: 'block',
      }}
      onError={() => { photoCache[name] = false; setFailed(true) }}
    />
  )
}
