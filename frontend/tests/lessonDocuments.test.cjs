const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/lessonDocuments.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const exportsObject = {};
new Function('exports', compiled.outputText)(exportsObject);
const { parseLessonDocuments, serializeDocumentUrls } = exportsObject;
const pdfUrl = 'https://res.cloudinary.com/demo/raw/upload/bai-1.pdf';

test('accepts plain URLs, JSON strings and JSON arrays from existing lessons', () => {
  for (const value of [pdfUrl, JSON.stringify(pdfUrl), JSON.stringify([pdfUrl]), JSON.stringify([{ name: 'Bài 1', url: pdfUrl }])]) {
    assert.equal(parseLessonDocuments(value)[0].url, pdfUrl);
  }
});
test('never embeds script URLs, credentials or malformed document values', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com/file.pdf', '{invalid', '', undefined]) {
    assert.deepEqual(parseLessonDocuments(value), []);
  }
});
test('URL input becomes valid JSON suitable for lesson.documents and retains names', () => {
  const previous = JSON.stringify([{ name: 'Từ vựng bài 1', url: pdfUrl }]);
  const serialized = serializeDocumentUrls(` ${pdfUrl}\n${pdfUrl}\nhttps://example.com/second.pdf `, previous);
  const values = JSON.parse(serialized);
  assert.equal(values.length, 2);
  assert.equal(values[0].name, 'Từ vựng bài 1');
  assert.equal(parseLessonDocuments(serialized).length, 2);
  assert.throws(() => serializeDocumentUrls('not-a-url'));
});
test('clearing the URL field produces an empty JSON list', () => {
  assert.equal(serializeDocumentUrls('  '), '[]');
});
