import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export interface TaxCatalogItem {
  code: string
  name: string
  percentage: string | null
  extra: any
  sort_order: number
}

export function useTaxCatalog(catalogType: string, country = 'EC') {
  const [items, setItems] = useState<TaxCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!catalogType) return
    setLoading(true)
    fetch(`${API_URL}/tax-catalogs?catalog_type=${catalogType}&country=${country}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((body) => setItems(body?.data ?? body))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [catalogType, country])

  return { items, loading }
}