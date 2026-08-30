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

/**
 * Groups multiple discrete periodic heartbeat chunks (e.g. 30s + 30s + 19s)
 * into a single unified row per destination/URL with accurate total summed duration.
 */
export function groupActivitiesByDomainOrUrl(rawActivities = []) {
  if (!Array.isArray(rawActivities) || rawActivities.length === 0) return []

  const groupMap = new Map()

  rawActivities.forEach((act) => {
    const rawDomain = (act.domain || '').trim()
    const cleanKey = (rawDomain || act.url || 'other').toLowerCase()
    const dur = Number(act.durationSeconds) || 0
    const timeMs = new Date(act.startTime || act.endTime || act.createdAt || act.updatedAt || Date.now()).getTime()

    if (!groupMap.has(cleanKey)) {
      groupMap.set(cleanKey, {
        id: act.id || cleanKey,
        domain: rawDomain || cleanKey,
        url: act.url || '',
        pageTitle: act.pageTitle && act.pageTitle !== 'Untitled' ? act.pageTitle : (rawDomain || cleanKey),
        category: act.category || 'productive',
        totalDurationSeconds: dur,
        sessionCount: 1,
        latestRecordedAt: isNaN(timeMs) ? Date.now() : timeMs,
        earliestStartTime: isNaN(timeMs) ? Date.now() : timeMs,
        isIdle: Boolean(act.isIdle)
      })
    } else {
      const existing = groupMap.get(cleanKey)
      existing.totalDurationSeconds += dur
      existing.sessionCount += 1
      if (!isNaN(timeMs) && timeMs > existing.latestRecordedAt) {
        existing.latestRecordedAt = timeMs
        if (act.pageTitle && act.pageTitle !== 'Untitled') existing.pageTitle = act.pageTitle
        if (act.url) existing.url = act.url
        existing.isIdle = Boolean(act.isIdle)
      }
      if (!isNaN(timeMs) && timeMs < existing.earliestStartTime) {
        existing.earliestStartTime = timeMs
      }
    }
  })

  return Array.from(groupMap.values()).sort((a, b) => b.latestRecordedAt - a.latestRecordedAt)
}

/**
 * Formats seconds into human-readable duration (e.g. '1m 24s', '45s', '1h 12m')
 */
export function formatAccurateDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  if (total === 0) return '0s'
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return `${secs}s`
}

