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
          @kekosan01630 sur Instagram
        </a>
      </div>
    </section>
  )
}

export default InstagramSection
