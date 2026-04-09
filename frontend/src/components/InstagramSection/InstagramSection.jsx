import styles from './InstagramSection.module.css'

function InstagramSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Actualités &amp; Créations</div>
        <div className={styles.title}>
          On cuisine<br />aussi des<br />
          <span className={styles.handle}>surprises.</span>
        </div>
        <div className={styles.divider} />
        <p className={styles.subtitle}>
          Produits éphémères, éditions limitées et nouveautés en avant-première.
          Suivez-nous pour ne rien manquer.
        </p>
        <a
          href="https://instagram.com/kekosan01630"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btn}
        >
          <svg className={styles.btnIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          @kekosan01630 sur Instagram
        </a>
      </div>
    </section>
  )
}

export default InstagramSection
