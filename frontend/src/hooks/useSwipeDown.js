import { useRef, useEffect } from 'react'

// Ferme le modal si l'utilisateur swipe vers le bas
// — anime le modal pendant le drag et ferme avec transition fluide
// — rebondit si le seuil n'est pas atteint
export function useSwipeDown(onClose, {
  threshold = 120,
  velocityThreshold = 0.5,
  enabled = true,
  modalRef = null, // ref optionnelle vers l'élément à animer (par défaut : le parent du handle)
} = {}) {
  const handleRef = useRef(null)
  const startY = useRef(null)
  const currentY = useRef(0)
  const velocity = useRef(0)
  const lastTime = useRef(null)
  const animTargetRef = useRef(null)
  // Ref pour toujours capturer la dernière version de onClose sans re-inscrire les listeners
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!enabled) return
    const handle = handleRef.current
    if (!handle) return

    // L'élément à animer : modalRef fourni, sinon le parent du handle
    const getTarget = () => modalRef?.current || handle.parentElement

    const onTouchStart = (e) => {
      startY.current = e.touches[0].clientY
      currentY.current = 0
      velocity.current = 0
      lastTime.current = Date.now()
      const target = getTarget()
      animTargetRef.current = target
      if (target) target.style.transition = 'none'
    }

    const onTouchMove = (e) => {
      if (startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy < 0) return // seulement vers le bas
      const now = Date.now()
      const dt = now - lastTime.current
      if (dt > 0) velocity.current = (dy - currentY.current) / dt
      currentY.current = dy
      lastTime.current = now
      const target = animTargetRef.current
      if (target) target.style.transform = `translateY(${dy}px)`
    }

    const onTouchEnd = () => {
      const dy = currentY.current
      const v = velocity.current
      const target = animTargetRef.current
      if (target) {
        target.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
      }
      if (dy > threshold || v > velocityThreshold) {
        // Fermeture
        if (navigator.vibrate) navigator.vibrate(10)
        if (target) target.style.transform = 'translateY(100%)'
        setTimeout(() => {
          if (target) { target.style.transform = ''; target.style.transition = '' }
          onCloseRef.current()
        }, 280)
      } else {
        // Rebond
        if (target) target.style.transform = 'translateY(0)'
        setTimeout(() => {
          if (target) target.style.transition = ''
        }, 300)
      }
      startY.current = null
      currentY.current = 0
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true })
    handle.addEventListener('touchmove', onTouchMove, { passive: true })
    handle.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      handle.removeEventListener('touchstart', onTouchStart)
      handle.removeEventListener('touchmove', onTouchMove)
      handle.removeEventListener('touchend', onTouchEnd)
    }
  }, [threshold, velocityThreshold, enabled])

  return handleRef
}
