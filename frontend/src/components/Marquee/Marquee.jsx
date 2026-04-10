import styles from "./Marquee.module.css";

const ROW1 = [
  { text: "Bánh Mì Artisanal", icon: "🥖" },
  { text: "Cuisine Artisanale", icon: "🍳" },
  { text: "Fait Maison", icon: "👨‍🍳" },
  { text: "Commande en Ligne", icon: "📱" },
  { text: "Frais du Jour", icon: "🌿" },
  { text: "Livraison Rapide", icon: "⚡" },
  { text: "Saveurs Authentiques", icon: "🌶️" },
];

const ROW2 = [
  { text: "Bánh Mì Kekosan", icon: "✦" },
  { text: "Saint-Genis-Pouilly", icon: "📍" },
  { text: "Fait avec Amour", icon: "❤️" },
  { text: "Qualité Artisanale", icon: "✨" },
  { text: "Recette Maison", icon: "📜" },
  { text: "Toujours Frais", icon: "🥬" },
  { text: "Commandez Maintenant", icon: "🛒" },
];

function MarqueeRow({ items, variant, reverse, speed }) {
  const doubled = [...items, ...items];
  return (
    <div
      className={`${styles.track} ${styles[variant]} ${
        reverse ? styles.reverse : ""
      }`}
      style={{ animationDuration: `${speed}s` }}
    >
      {doubled.map((item, i) => (
        <span key={i} className={`${styles.item} ${styles[`item_${variant}`]}`}>
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.text}>{item.text}</span>
        </span>
      ))}
    </div>
  );
}

function Marquee() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.scene}>
        <MarqueeRow items={ROW1} variant="top" speed={55} />
        <MarqueeRow items={ROW2} variant="center" reverse speed={80} />
      </div>
    </div>
  );
}

export default Marquee;
