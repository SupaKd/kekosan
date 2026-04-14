import { useRef, useEffect } from 'react'

// Ferme le modal si l'utilisateur swipe vers le bas de plus de `threshold` px
export function useSwipeDown(onClose, { threshold = 80, enabled = true } = {}) {
  const ref = useRef(null)
  const startY = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const onTouchStart = (e) => {
      startY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e) => {
      if (startY.current === null) return
      const delta = e.changedTouches[0].clientY - startY.current
      if (delta > threshold) onClose()
      startY.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onClose, threshold, enabled])

  return ref
}
