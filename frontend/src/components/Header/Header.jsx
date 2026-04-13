import { MapPin, Clock } from "lucide-react";
import styles from "./Header.module.css";

function Header({ opening_hour = 11, closing_hour = 15 }) {
  return (
    <header className={styles.header}>
      {/* Gauche : ville + horaires */}
      <div className={styles.left}>
        <div className={styles.infoBadge}>
          <MapPin size={11} strokeWidth={2.5} />
          Saint-Genis-Pouilly
        </div>
        <div className={styles.hoursBadge}>
          <Clock size={11} strokeWidth={2.5} />
          Lun–Ven · {opening_hour}h–{closing_hour}h
        </div>
      </div>

      {/* Centre : logo fond noir */}
      <div className={styles.logoWrap}>
        <img src="/kekosan.png" alt="Kekosan" className={styles.logo} />
      </div>

      {/* Droite : réseaux sociaux */}
      <div className={styles.right}>
        <a
          href="https://instagram.com/kekosan01630"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
          aria-label="Instagram"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </a>
        <a
          href="https://facebook.com/kekosan01630"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
          aria-label="Facebook"
        >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
      </div>
    </header>
  );
}

export default Header;
