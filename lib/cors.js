/**
 * Stage-origin CORS allowlist for APEX (Stage E).
 *
 * Federated UIs call each other on known localhost ports. Reflecting arbitrary
 * `Origin` turns E into an open cross-site LLM relay (Audit #8 / Task T17).
 * Glue / curl callers typically send no Origin — CORS does not apply to them.
 */

/** Default allowlist: F voice/agent, A, E, B, C (+ 127.0.0.1 twins); `null` for file://. */
export const DEFAULT_STAGE_ORIGINS = Object.freeze([
  'http://localhost:7860',
  'http://localhost:8081',
  'http://localhost:8000',
  'http://localhost:8002',
  'http://localhost:8003',
  'http://localhost:8010',
  'http://127.0.0.1:7860',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8002',
  'http://127.0.0.1:8003',
  'http://127.0.0.1:8010',
  'null',
]);

/**
 * Parse CORS_ALLOW_ORIGINS env: JSON array, or comma-separated list.
 * Empty / unset → DEFAULT_STAGE_ORIGINS. Explicit `*` is rejected (never reflect-any).
 */
export function parseCorsAllowlist(raw, defaults = DEFAULT_STAGE_ORIGINS) {
  if (raw == null || String(raw).trim() === '') {
    return [...defaults];
  }
  const text = String(raw).trim();
  let items;
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('CORS_ALLOW_ORIGINS JSON must be an array of origin strings');
    }
    items = parsed.map((o) => String(o).trim()).filter(Boolean);
  } else {
    items = text.split(',').map((o) => o.trim()).filter(Boolean);
  }
  if (items.some((o) => o === '*')) {
    throw new Error('CORS_ALLOW_ORIGINS must not include * (no reflect-any Origin)');
  }
  return items;
}

export function isOriginAllowed(origin, allowlist) {
  if (origin == null || origin === '') return false;
  return allowlist.includes(origin);
}

/**
 * Apply allowlist CORS headers. Never echoes an arbitrary Origin.
 * @returns {boolean} true when Origin was present and allowed (or no Origin / non-browser).
 */
export function applyCorsHeaders(req, res, allowlist) {
  const origin = req.headers?.origin;
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  res.setHeader('Vary', 'Origin');

  if (!origin) {
    // Non-browser / same-tool callers (glue, curl): no ACAO needed.
    return true;
  }
  if (isOriginAllowed(origin, allowlist)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  // Denied: omit ACAO so the browser blocks the response.
  return false;
}

export function corsMiddleware(allowlist) {
  return (req, res, next) => {
    applyCorsHeaders(req, res, allowlist);
    if (req.method === 'OPTIONS') {
      const origin = req.headers?.origin;
      if (origin && !isOriginAllowed(origin, allowlist)) {
        return res.sendStatus(403);
      }
      return res.sendStatus(204);
    }
    return next();
  };
}
