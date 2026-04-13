const SLOT_INTERVAL = 30  // minutes entre chaque créneau
const MIN_DELAY     = 30  // minutes minimum avant le premier créneau dispo

// Retourne { available: bool, slots: ['11:00', '11:30', ...], message: string | null }
// message est défini uniquement quand available = false (raison lisible par le client)
// La disponibilité réelle est contrôlée par le toggle admin (service_open)
// opening_hour, closing_hour et closed_days sont lus depuis la DB et passés en paramètre
// availability = objet { 'YYYY-MM-DD|HH:MM': placesRestantes } retourné par /slot-availability
export function getAvailableSlots({ opening_hour = 11, closing_hour = 15, closed_days = [], availability = {} } = {}) {
  const SERVICE_START = opening_hour
  const SERVICE_END   = closing_hour

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))

  // Pas de livraison le week-end (0 = dimanche, 6 = samedi)
  const dow = now.getDay()
  if (dow === 0 || dow === 6) {
    return {
      available: false,
      slots: [],
      message: 'Nous ne livrons pas le week-end. Revenez nous voir du lundi au vendredi !',
    }
  }

  // Vérification des jours de fermeture exceptionnelle
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (closed_days.includes(todayStr)) {
    return {
      available: false,
      slots: [],
      message: 'Nous sommes fermés exceptionnellement aujourd\'hui. Revenez bientôt !',
    }
  }

  const earliest = new Date(now.getTime() + MIN_DELAY * 60000)

  const slots = []

  // Génère tous les créneaux fixes de la journée dans la plage horaire
  for (let h = SERVICE_START; h < SERVICE_END; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      const candidate = new Date(now)
      candidate.setHours(h, m, 0, 0)

      // Le créneau doit être suffisamment dans le futur
      // Si le créneau est déjà passé aujourd'hui, on vérifie si c'est demain (cas minuit)
      const candidateTime = candidate >= earliest ? candidate : (() => {
        const next = new Date(candidate)
        next.setDate(next.getDate() + 1)
        return next
      })()

      if (candidateTime >= earliest) {
        const slotStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const slotDateStr = `${candidateTime.getFullYear()}-${String(candidateTime.getMonth() + 1).padStart(2, '0')}-${String(candidateTime.getDate()).padStart(2, '0')}`
        const key = `${slotDateStr}|${slotStr}`
        // Exclut le créneau si places restantes = 0 (clé présente et vaut 0)
        if (key in availability && availability[key] === 0) continue
        slots.push(slotStr)
      }
    }
  }

  const message = slots.length === 0
    ? `Le service est terminé pour aujourd'hui (dernier créneau : ${SERVICE_END - 1}h${String(60 - SLOT_INTERVAL).padStart(2, '0')}). Revenez demain à partir de ${SERVICE_START}h !`
    : null

  return { available: slots.length > 0, slots, message }
}
