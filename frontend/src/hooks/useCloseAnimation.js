import { useState, useCallback } from 'react'

// Retourne { closing, triggerClose }
// — closing : true pendant l'animation de sortie
// — triggerClose : à appeler à la place de onClose directement
// L'animation dure `duration` ms, puis onClose est appelé
export function useCloseAnimation(onClose, duration = 280) {
  const [closing, setClosing] = useState(false)

  const triggerClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, duration)
  }, [onClose, duration])

  return { closing, triggerClose }
}
