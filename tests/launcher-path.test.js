/**
 * Assert Start APEX.command launches harden-e only (Audit Finding #16 / Task T4).
 * Run: node --test tests/launcher-path.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const launcherPath = join(root, 'Start APEX.command');
const source = readFileSync(launcherPath, 'utf8');

describe('Start APEX.command (harden-E launcher)', () => {
  it('does not hard-code cd into the base Desktop tree', () => {
    assert.equal(
      /cd\s+"\/Users\/[^"]*\/Desktop\/apex_compliance_platform"/.test(source),
      false,
      'launcher must not cd to base apex_compliance_platform',
    );
    assert.equal(
      source.includes('/Desktop/apex_compliance_platform"'),
      false,
      'no quoted path ending at base tree name',
    );
  });

  it('resolves from SCRIPT_DIR / $0 and requires harden-e marker', () => {
    assert.match(source, /SCRIPT_DIR=/);
    assert.match(source, /dirname\s+"\$0"/);
    assert.match(source, /apex_compliance_platform-harden-e/);
    assert.match(source, /HARDEN-E|harden-e/);
  });

  it('refuses when resolved path is the base tree', () => {
    assert.match(source, /REFUSED:\s*wrong APEX tree/);
    assert.match(source, /BASE_TREE_NAME="apex_compliance_platform"/);
    assert.match(source, /exit 1/);
  });
});
