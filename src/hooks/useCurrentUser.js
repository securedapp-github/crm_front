import { useMemo } from 'react'

const STAFF_ROLES = ['admin', 'tech', 'operations', 'support', 'hr', 'marketing', 'sales', 'growth', 'finance']

export function parseRoles(roleStr = '') {
  return roleStr.split(',').map(r => r.trim().toLowerCase()).filter(Boolean)
}

export function useCurrentUser() {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])

  const roles = useMemo(() => parseRoles(user.role || ''), [user])

  const hasRole = useMemo(() => {
    const roleSet = new Set(roles)
    return (role) => {
      if (Array.isArray(role)) return role.some(r => roleSet.has(r))
      return roleSet.has(role)
    }
  }, [roles])

  const isOps = useMemo(() => roles.some(r => r === 'admin' || r === 'operations'), [roles])
  const isStaff = useMemo(() => roles.some(r => STAFF_ROLES.includes(r)), [roles])
  const isDeptMember = useMemo(() => isStaff && !isOps, [isStaff, isOps])

  return { user, roles, hasRole, isOps, isStaff, isDeptMember }
}
