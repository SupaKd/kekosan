import { useState, useEffect } from 'react'
import { getCatalog, getFormulas } from '../api/products'

export function useCatalog() {
  const [catalog, setCatalog] = useState({})
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([getCatalog(), getFormulas()])
      .then(([catalogData, formulasData]) => {
        setCatalog(catalogData)
        setFormulas(formulasData)
      })
      .catch(() => setError('Impossible de charger le menu.'))
      .finally(() => setLoading(false))
  }, [])

  return { catalog, formulas, loading, error }
}
