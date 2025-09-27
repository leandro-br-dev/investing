/**
 * Cache utilities for API responses
 */

export function getCacheHeaders(maxAge: number = 300) {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    'CDN-Cache-Control': `public, max-age=${maxAge}`,
    'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`,
  }
}

export function getNoCacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
}

export function getShortCacheHeaders() {
  return getCacheHeaders(60) // 1 minute
}

export function getMediumCacheHeaders() {
  return getCacheHeaders(300) // 5 minutes
}

export function getLongCacheHeaders() {
  return getCacheHeaders(1800) // 30 minutes
}

export function getStaticCacheHeaders() {
  return getCacheHeaders(86400) // 24 hours
}