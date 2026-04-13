import styles from './IngredientsStrip.module.css'

const ICONS = [
  { icon: '🌶️', label: 'Piment' },
  { icon: '🥬', label: 'Coriandre' },
  { icon: '🥖', label: 'Baguette' },
  { icon: '🧄', label: 'Ail' },
  { icon: '🥕', label: 'Carotte' },
  { icon: '🥒', label: 'Concombre' },
  { icon: '🍋', label: 'Citron' },
  { icon: '🌿', label: 'Herbes' },
  { icon: '🧅', label: 'Oignon' },
  { icon: '🫙', label: 'Marinade' },
  { icon: '🥚', label: 'Mayonnaise' },
  { icon: '🌶️', label: 'Sriracha' },
]

function IngredientsStrip() {
  return (
    <div className={styles.wrapper}>
      {ICONS.map((item, i) => (
        <span
          key={i}
          className={styles.icon}
          style={{
            left: `${(i / ICONS.length) * 100}%`,
            animationDuration: `${8 + (i % 5) * 2}s`,
            animationDelay: `${(i * 0.8) % 5}s`,
            fontSize: `${24 + (i % 3) * 10}px`,
          }}
          aria-label={item.label}
        >
          {item.icon}
        </span>
      ))}
    </div>
  )
}

export default IngredientsStrip
