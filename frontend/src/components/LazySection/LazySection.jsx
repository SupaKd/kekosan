import { useInView } from '../../hooks/useInView'

// Wrape une section — ne rend le contenu que quand la section
// approche du viewport (rootMargin 300px d'avance)
// La hauteur minimale évite les sauts de layout au scroll
function LazySection({ children, minHeight = 400, className, ...props }) {
  const [ref, inView] = useInView({ rootMargin: '300px' })

  return (
    <div
      ref={ref}
      className={className}
      style={!inView ? { minHeight } : undefined}
      {...props}
    >
      {inView ? children : null}
    </div>
  )
}

export default LazySection
