import { useEffect, useRef } from 'react'

// Intercepte Escape (desktop) et le bouton retour Android
export function useModalHistory(onClose) {
  useEffect(() => {
    const prevState = window.history.state
    const prevUrl = window.location.href

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

    // Flag local — ne dépend pas de window.history.state au cleanup
    // (l'état peut avoir changé pendant l'animation de fermeture de 280ms)
    let pushed = false
    if (isTouchDevice) {
      window.history.pushState({ modal: true }, '')
      pushed = true
    }

    const onPopState = () => onClose()
    const onKeyDown = (e) => e.key === 'Escape' && onClose()

    if (isTouchDevice) {
      window.addEventListener('popstate', onPopState)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      if (isTouchDevice) {
        window.removeEventListener('popstate', onPopState)
        // Retire l'état fictif si on l'avait bien poussé
        if (pushed) {
          window.history.replaceState(prevState, '', prevUrl)
          pushed = false
        }
      }
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
}
