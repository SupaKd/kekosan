const SLOT_INTERVAL = 30  // minutes entre chaque créneau
const MIN_DELAY     = 30  // minutes minimum avant le premier créneau dispo
const SERVICE_START = 11  // heure d'ouverture (inclus)
const SERVICE_END   = 15  // heure de fermeture (dernier créneau possible : 14h30)

// Retourne { available: bool, slots: ['11:00', '11:30', ...], message: string | null }
// message est défini uniquement quand available = false (raison lisible par le client)
// La disponibilité réelle est contrôlée par le toggle admin (service_open)
export function getAvailableSlots() {
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

  const earliest = new Date(now.getTime() + MIN_DELAY * 60000)

  const slots = []

  // Génère tous les créneaux fixes de la journée dans la plage 11h-15h
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
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
  }

  const message = slots.length === 0
    ? `Le service est terminé pour aujourd'hui (dernier créneau : ${SERVICE_END - 1}h${String(60 - SLOT_INTERVAL).padStart(2, '0')}). Revenez demain à partir de ${SERVICE_START}h !`
    : null

  return { available: slots.length > 0, slots, message }
}
