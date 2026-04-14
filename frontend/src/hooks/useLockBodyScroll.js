import { useEffect } from 'react'

// Bloque le scroll de la page pendant qu'un modal est ouvert
export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      // Lire top depuis le DOM au moment du cleanup (pas depuis la closure)
      // pour éviter un décalage si scrollY a changé entre-temps
      const storedTop = document.body.style.top
      const restoredY = storedTop ? parseInt(storedTop, 10) * -1 : 0
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      // scrollTo synchrone juste après la suppression des styles — même tick
      window.scrollTo({ top: restoredY, behavior: 'instant' })
    }
  }, [active])
}
