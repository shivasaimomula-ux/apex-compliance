/**
 * Unit tests: CORS allowlist (Task T17 / Audit #8).
 * Run: node --test tests/cors.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STAGE_ORIGINS,
  applyCorsHeaders,
  isOriginAllowed,
  parseCorsAllowlist,
  corsMiddleware,
} from '../lib/cors.js';

describe('parseCorsAllowlist', () => {
  it('defaults to known stage origins when unset', () => {
    const list = parseCorsAllowlist(undefined);
    assert.ok(list.includes('http://localhost:7860'));
    assert.ok(list.includes('http://localhost:8081'));
    assert.ok(list.includes('http://localhost:8000'));
    assert.ok(list.includes('http://localhost:8003'));
    assert.ok(list.includes('http://localhost:8010'));
    assert.ok(list.includes('http://localhost:8002'));
    assert.ok(list.includes('null'));
    assert.equal(list.length, DEFAULT_STAGE_ORIGINS.length);
  });

  it('parses JSON array and comma-separated lists', () => {
    assert.deepEqual(
      parseCorsAllowlist('["http://localhost:8010","https://apex.example"]', []),
      ['http://localhost:8010', 'https://apex.example'],
    );
    assert.deepEqual(
      parseCorsAllowlist('http://localhost:8003, https://apex.example', []),
      ['http://localhost:8003', 'https://apex.example'],
    );
  });

  it('rejects wildcard reflect-any', () => {
    assert.throws(() => parseCorsAllowlist('*'), /must not include \*/);
    assert.throws(() => parseCorsAllowlist('["*"]'), /must not include \*/);
  });
});

describe('isOriginAllowed / applyCorsHeaders', () => {
  const allowlist = parseCorsAllowlist(undefined);

  it('allows known stage origins and denies strangers', () => {
    assert.equal(isOriginAllowed('http://localhost:8010', allowlist), true);
    assert.equal(isOriginAllowed('http://127.0.0.1:8003', allowlist), true);
    assert.equal(isOriginAllowed('null', allowlist), true);
    assert.equal(isOriginAllowed('https://evil.example', allowlist), false);
    assert.equal(isOriginAllowed('http://localhost:9999', allowlist), false);
  });

  it('echoes only allowlisted Origin; never reflects arbitrary', () => {
    const headers = {};
    const res = {
      setHeader(k, v) {
        headers[k] = v;
      },
    };

    applyCorsHeaders({ headers: { origin: 'http://localhost:8010' } }, res, allowlist);
    assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:8010');

    const denied = {};
    const resDenied = {
      setHeader(k, v) {
        denied[k] = v;
      },
    };
    const ok = applyCorsHeaders(
      { headers: { origin: 'https://evil.example' } },
      resDenied,
      allowlist,
    );
    assert.equal(ok, false);
    assert.equal(denied['Access-Control-Allow-Origin'], undefined);
    assert.equal(denied.Vary, 'Origin');
  });

  it('omits ACAO when Origin is absent (glue/curl)', () => {
    const headers = {};
    const res = {
      setHeader(k, v) {
        headers[k] = v;
      },
    };
    assert.equal(applyCorsHeaders({ headers: {} }, res, allowlist), true);
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });
});

describe('corsMiddleware preflight', () => {
  it('OPTIONS allow → 204; deny → 403', () => {
    const mw = corsMiddleware(['http://localhost:8010']);

    let statusAllow;
    mw(
      { method: 'OPTIONS', headers: { origin: 'http://localhost:8010' } },
      {
        setHeader() {},
        sendStatus(code) {
          statusAllow = code;
        },
      },
      () => assert.fail('should not next on OPTIONS'),
    );
    assert.equal(statusAllow, 204);

    let statusDeny;
    mw(
      { method: 'OPTIONS', headers: { origin: 'https://evil.example' } },
      {
        setHeader() {},
        sendStatus(code) {
          statusDeny = code;
        },
      },
      () => assert.fail('should not next on OPTIONS'),
    );
    assert.equal(statusDeny, 403);
  });
});
