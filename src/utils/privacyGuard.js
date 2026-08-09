/**
 * Utility functions for Privacy Guard & Allowlist-only domain masking.
 */

// Default work domains approved if custom allowlist isn't specified
export const DEFAULT_WORK_DOMAINS = [
  'github.com',
  'google.com',
  'atlassian.net',
  'slack.com',
  'salesforce.com',
  'figma.com',
  'localhost',
  'crm'
]

/**
 * Checks whether a given domain matches an active allowlist rule or approved work pattern.
 */
export function isAllowlistedDomain(domainName, allowlistRules = []) {
  if (!domainName) return false
  const clean = domainName.toLowerCase().trim()

  const rulesToTest = Array.isArray(allowlistRules) && allowlistRules.length > 0
    ? allowlistRules
    : DEFAULT_WORK_DOMAINS.map(d => ({ domainPattern: d, isActive: true }))

  for (const rule of rulesToTest) {
    if (rule.isActive === false) continue
    const pattern = (rule.domainPattern || '').toLowerCase().trim()
    const cleanPattern = pattern.replace(/^(https?:\/\/)?(www\.)?/, '')

    if (!cleanPattern) continue

    if (cleanPattern.startsWith('*.')) {
      const base = cleanPattern.replace('*.', '')
      if (clean === base || clean.endsWith('.' + base) || clean.includes(base)) {
        return true
      }
    } else if (cleanPattern.includes('*')) {
      const regexStr = '^' + cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      const regex = new RegExp(regexStr, 'i')
      if (regex.test(clean)) return true
    } else {
      if (clean === cleanPattern || clean.endsWith('.' + cleanPattern) || clean.includes(cleanPattern)) {
        return true
      }
    }
  }

  return false
}

/**
 * Returns a privacy-safe domain label.
 * If privacy mode is ON and the domain is not allowlisted, it returns "Unlisted Domain (Private)".
 */
export function sanitizeDomainPrivacy(domainName, allowlistRules = [], privacyEnabled = true) {
  if (!domainName) return 'Unlisted Domain (Private)'
  if (!privacyEnabled) return domainName

  if (isAllowlistedDomain(domainName, allowlistRules)) {
    return domainName
  }

  return 'Unlisted Domain (Private)'
}
