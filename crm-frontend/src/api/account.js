import { api } from './auth'

export const resolveAccount = ({ domain, name }) => {
  const params = new URLSearchParams()
  if (domain) params.set('domain', String(domain).trim().toLowerCase())
  if (name) params.set('name', String(name).trim())
  return api.get(`/accounts/resolve?${params.toString()}`)
}
