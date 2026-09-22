/**
 * APEX LLM provider resolution (N5.1 cost lock-in).
 * Preference: NVIDIA (NIM) > Anthropic (Claude). No Gemini on E today.
 */

export function anthropicKeyOk(env = process.env) {
  const k = env.ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.startsWith('sk-ant-');
}

export function nvidiaKeyOk(env = process.env) {
  const k = env.NVIDIA_API_KEY;
  return typeof k === 'string' && k.startsWith('nvapi-');
}

/**
 * Resolve the active provider: explicit APEX_PROVIDER wins (if its key is set),
 * otherwise prefer NVIDIA, then Anthropic (Claude). Returns null when no usable key.
 */
export function resolveProvider(env = process.env) {
  const p = String(env.APEX_PROVIDER || '').toLowerCase();
  if (p === 'nvidia' && nvidiaKeyOk(env)) return 'nvidia';
  if (p === 'anthropic' && anthropicKeyOk(env)) return 'anthropic';
  if (nvidiaKeyOk(env)) return 'nvidia';
  if (anthropicKeyOk(env)) return 'anthropic';
  return null;
}

export const COST_ORDER = ['nvidia', 'anthropic'];
