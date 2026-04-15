import { useEffect, useRef, useState } from 'react'

// Retourne [ref, inView]
// — inView passe à true dès que l'élément entre dans le viewport
// — reste true une fois visible (pas de toggle)
export function useInView({ rootMargin = '200px', threshold = 0 } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect() // Ne plus observer une fois visible
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return [ref, inView]
}
