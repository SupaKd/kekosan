import { useEffect } from 'react'

// Intercepte Escape (desktop) et le bouton retour Android
export function useModalHistory(onClose) {
  useEffect(() => {
    // Sauvegarde l'état courant pour pouvoir le restaurer sans navigation
    const prevState = window.history.state
    const prevUrl = window.location.href

    // Pousse un état fictif uniquement sur mobile (touch) pour Android back button
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    if (isTouchDevice) {
      window.history.pushState({ modal: true }, '')
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
        // Retire l'état fictif sans déclencher de navigation visible
        // en remplaçant l'état actuel par l'état précédent
        if (window.history.state?.modal) {
          window.history.replaceState(prevState, '', prevUrl)
        }
      }
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
}
