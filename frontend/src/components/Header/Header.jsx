import styles from "./Header.module.css";

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.zoneBadge}>
        <span className={styles.dot} />
        Saint-Genis-Pouilly
      </div>
      <div className={styles.hoursBadge}>
        Lun–Ven · 11h–15h
      </div>
    </header>
  );
}

export default Header;
