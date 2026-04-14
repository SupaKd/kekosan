import { useState, useEffect, useRef } from 'react'

/**
 * Détecte un pull-to-refresh natif sur mobile.
 * @param {Function} onRefresh - Appelée quand le pull est déclenché (doit retourner une Promise)
 * @param {Object} options
 * @param {number} options.threshold - Distance en px pour déclencher (défaut 80)
 */
export function usePullToRefresh(onRefresh, { threshold = 80 } = {}) {
  const [pulling, setPulling] = useState(false)
  const [pullYDisplay, setPullYDisplay] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Refs pour les valeurs lues dans les handlers — évite de les mettre en deps
  const startY = useRef(null)
  const active = useRef(false)
  const pullYRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    const onTouchMove = (e) => {
      if (!active.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        active.current = false
        return
      }
      const resistance = Math.min(delta * 0.45, threshold * 1.2)
      pullYRef.current = resistance
      setPulling(true)
      setPullYDisplay(resistance)
    }

    const onTouchEnd = async () => {
      if (!active.current) return
      active.current = false
      const currentPullY = pullYRef.current
      pullYRef.current = 0
      if (currentPullY >= threshold * 0.45) {
        setRefreshing(true)
        setPullYDisplay(0)
        setPulling(false)
        try {
          await onRefreshRef.current()
        } finally {
          setRefreshing(false)
        }
      } else {
        setPulling(false)
        setPullYDisplay(0)
      }
      startY.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [threshold])

  return { pulling, pullY: pullYDisplay, refreshing }
}
