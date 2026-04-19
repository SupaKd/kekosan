import { MapPin, Clock } from "lucide-react";
import styles from "./Header.module.css";

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function formatOpenDays(open_days) {
  if (!open_days || open_days.length === 0) return 'Fermé'
  // Regroupement en plages consécutives ex: [1,2,3,5] → "Lun–Mer · Ven"
  const sorted = [...open_days].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i] }
    else { ranges.push([start, end]); start = sorted[i]; end = sorted[i] }
  }
  ranges.push([start, end])
  return ranges.map(([s, e]) => s === e ? DAY_ABBR[s] : `${DAY_ABBR[s]}–${DAY_ABBR[e]}`).join(' · ')
}

function Header({ opening_hour = 11, closing_hour = 15, open_days = [1, 2, 3, 4, 5] }) {
  return (
    <header className={styles.header}>

      {/* Logo à gauche */}
      <div className={styles.logoWrap}>
        <img src="/logokekosan.png" alt="Kekosan" className={styles.logo} />
      </div>

      {/* Droite : horaires + réseaux sociaux */}
      <div className={styles.right}>
        <div className={styles.infos}>
          <div className={styles.infoBadge}>
            <MapPin size={11} strokeWidth={2.5} />
            Saint-Genis-Pouilly
          </div>
          <div className={styles.hoursBadge}>
            <Clock size={11} strokeWidth={2.5} />
            {formatOpenDays(open_days)} · {opening_hour}h–{closing_hour}h
          </div>
        </div>

        <div className={styles.socials}>
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
      </div>

    </header>
  );
}

export default Header;
