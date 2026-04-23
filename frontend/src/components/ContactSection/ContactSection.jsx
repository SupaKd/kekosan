import { useState } from 'react'
import styles from './ContactSection.module.css'
import client from '../../api/client'

const FIELDS = [
  { id: 'contact-name',         key: 'name',         label: 'Nom',              type: 'text',  required: true,  placeholder: 'Votre nom' },
  { id: 'contact-email',        key: 'email',        label: 'Adresse e-mail',   type: 'email', required: true,  placeholder: 'votre@email.com' },
  { id: 'contact-order',        key: 'order_number', label: 'Numéro de commande', type: 'text', required: false, placeholder: 'ex : 1042' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!form.name.trim())              errors.name         = 'Le nom est requis.'
  if (!form.email.trim())             errors.email        = "L'adresse e-mail est requise."
  else if (!EMAIL_RE.test(form.email)) errors.email       = "L'adresse e-mail n'est pas valide."
  if (!form.message.trim())           errors.message      = 'Le message est requis.'
  return errors
}

function ContactSection() {
  const [form, setForm]         = useState({ name: '', email: '', order_number: '', message: '' })
  const [errors, setErrors]     = useState({})
  const [status, setStatus]     = useState(null) // null | 'sending' | 'success' | 'error'
  const [serverError, setServerError] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  const set = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }
    setStatus('sending')
    setServerError('')
    try {
      await client.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        order_number: form.order_number.trim() || undefined,
        message: form.message.trim(),
      })
      setSentEmail(form.email.trim())
      setStatus('success')
      setForm({ name: '', email: '', order_number: '', message: '' })
    } catch (err) {
      setServerError(err.response?.data?.error || 'Une erreur est survenue. Réessayez.')
      setStatus('error')
    }
  }

  const isSending = status === 'sending'

  return (
    <section className={styles.section} aria-labelledby="contact-heading">
      <div className={styles.inner}>
        <span className={styles.eyebrow} aria-hidden="true">Nous contacter</span>
        <h2 className={styles.title} id="contact-heading">Une question ?</h2>
        <p className={styles.subtitle}>
          Un problème avec votre commande ou une simple question ? Écrivez-nous, nous vous répondrons rapidement.
        </p>

        {status === 'success' ? (
          <div className={styles.successBox} role="status" aria-live="polite">
            <div className={styles.successIconWrap} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#ffd60a" />
                <path d="M9 16.5l5 5 9-9" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.successContent}>
              <p className={styles.successTitle}>Message envoyé !</p>
              <p className={styles.successSub}>Nous vous répondrons au plus vite à <strong>{sentEmail}</strong>.</p>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Formulaire de contact">

            <div className={styles.row}>
              {FIELDS.slice(0, 2).map(({ id, key, label, type, required, placeholder }) => (
                <div className={styles.field} key={key}>
                  <label className={styles.label} htmlFor={id}>
                    {label}
                    {required
                      ? <span className={styles.required} aria-hidden="true"> *</span>
                      : <span className={styles.optional}> (optionnel)</span>
                    }
                  </label>
                  <input
                    id={id}
                    className={`${styles.input} ${errors[key] ? styles.inputError : ''}`}
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={set(key)}
                    disabled={isSending}
                    aria-required={required}
                    aria-invalid={!!errors[key]}
                    aria-describedby={errors[key] ? `${id}-error` : undefined}
                    autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : 'off'}
                  />
                  {errors[key] && (
                    <span id={`${id}-error`} className={styles.fieldError} role="alert">
                      {errors[key]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Numéro de commande */}
            {(() => {
              const { id, key, label, type, placeholder } = FIELDS[2]
              return (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={id}>
                    {label} <span className={styles.optional}>(optionnel)</span>
                  </label>
                  <input
                    id={id}
                    className={styles.input}
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={set(key)}
                    disabled={isSending}
                    aria-required="false"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              )
            })()}

            {/* Message */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-message">
                Message <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                placeholder="Votre message…"
                rows={5}
                value={form.message}
                onChange={set('message')}
                disabled={isSending}
                aria-required="true"
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
              />
              {errors.message && (
                <span id="contact-message-error" className={styles.fieldError} role="alert">
                  {errors.message}
                </span>
              )}
            </div>

            {serverError && (
              <p className={styles.serverError} role="alert" aria-live="assertive">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className={`${styles.submitBtn} ${isSending ? styles.submitBtnSending : ''}`}
              disabled={isSending}
              aria-busy={isSending}
            >
              {isSending
                ? <><span className={styles.spinner} aria-hidden="true" /> Envoi en cours…</>
                : 'Envoyer le message'
              }
            </button>

            <p className={styles.requiredNote} aria-hidden="true">
              <span className={styles.required}>*</span> Champs obligatoires
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

export default ContactSection
