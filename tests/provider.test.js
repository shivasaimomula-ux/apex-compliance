/**
 * N5.1 — E provider cost order: NVIDIA preferred, Claude fallback.
 * Run: node --test tests/provider.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COST_ORDER,
  resolveProvider,
  nvidiaKeyOk,
  anthropicKeyOk,
} from '../lib/provider.js';

describe('COST_ORDER', () => {
  it('is nvidia then anthropic', () => {
    assert.deepEqual(COST_ORDER, ['nvidia', 'anthropic']);
  });
});

describe('resolveProvider', () => {
  it('prefers NVIDIA when both keys present', () => {
    const env = {
      NVIDIA_API_KEY: 'nvapi-test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    };
    assert.equal(resolveProvider(env), 'nvidia');
  });

  it('falls back to Anthropic when NVIDIA missing', () => {
    const env = { ANTHROPIC_API_KEY: 'sk-ant-test' };
    assert.equal(resolveProvider(env), 'anthropic');
  });

  it('honors explicit APEX_PROVIDER=anthropic when key present', () => {
    const env = {
      APEX_PROVIDER: 'anthropic',
      NVIDIA_API_KEY: 'nvapi-test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    };
    assert.equal(resolveProvider(env), 'anthropic');
  });

  it('returns null with no usable keys', () => {
    assert.equal(resolveProvider({}), null);
  });

  it('rejects malformed keys', () => {
    assert.equal(nvidiaKeyOk({ NVIDIA_API_KEY: 'bad' }), false);
    assert.equal(anthropicKeyOk({ ANTHROPIC_API_KEY: 'bad' }), false);
  });
});
