const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/auth.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const helpers = {};
new Function('exports', compiled.outputText)(helpers);

test('student role id from the database never grants admin access', () => {
  assert.equal(helpers.checkIsAdmin({ roleId: 1, role: 'STUDENT' }), false);
  assert.equal(helpers.checkIsAdmin({ roleId: 1 }), false);
});
test('role code takes precedence over numeric fallback', () => {
  assert.equal(helpers.checkIsAdmin({ roleId: 3, role: 'STUDENT' }), false);
  assert.equal(helpers.checkIsAdmin({ role: 'ROLE_ADMIN' }), true);
  assert.equal(helpers.checkIsAdmin({ roleId: 3 }), true);
  assert.equal(helpers.checkIsAdmin(null), false);
});
