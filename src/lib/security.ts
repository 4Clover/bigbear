/**
 * Security utilities for the BigBear application
 */

// Private/internal IP ranges that should be blocked for SSRF protection
const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./, // Carrier-grade NAT
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
]

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '*.local',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]

/**
 * Validates a URL to prevent SSRF attacks
 * @param urlString - The URL to validate
 * @returns true if the URL is safe, throws an error otherwise
 */
export const validateExternalUrl = (urlString: string): boolean => {
  let url: URL

  try {
    url = new URL(urlString)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Only allow HTTPS
  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed')
  }

  // Block internal hostnames
  const hostname = url.hostname.toLowerCase()

  for (const blocked of BLOCKED_HOSTNAMES) {
    if (blocked.startsWith('*.')) {
      const suffix = blocked.slice(1)
      if (hostname.endsWith(suffix) || hostname === suffix.slice(1)) {
        throw new Error('Internal hostnames are not allowed')
      }
    } else if (hostname === blocked) {
      throw new Error('Internal hostnames are not allowed')
    }
  }

  // Block IP addresses (private ranges)
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error('Private IP addresses are not allowed')
    }
  }

  // Block raw IP addresses in general (optional - can be made configurable)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    throw new Error('Raw IP addresses are not allowed - use domain names')
  }

  // Block cloud metadata endpoints
  if (
    hostname === '169.254.169.254' ||
    hostname.includes('metadata') ||
    hostname.includes('instance-data')
  ) {
    throw new Error('Cloud metadata endpoints are not allowed')
  }

  return true
}

/**
 * Escapes HTML entities to prevent XSS in email templates
 * @param text - The text to escape
 * @returns The escaped text
 */
export const escapeHtml = (text: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }

  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] ?? char)
}
