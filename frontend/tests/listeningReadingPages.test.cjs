const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

const unexpected = async () => { throw new Error('unexpected fetch'); };

function load(relative) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } });
  const output = {};
  const localRequire = name => {
    if (name.endsWith('.css')) return {};
    if (name.includes('/services/api')) return { apiClient: { get: unexpected, post: unexpected } };
    if (name.includes('/api/courseApi')) return { getCourses: unexpected, getCourse: unexpected };
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(file), name);
      const target = [base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate));
      if (!target) throw new Error('Cannot resolve ' + name);
      return load(path.relative(__dirname, target));
    }
    return require(name);
  };
  new Function('exports', 'require', compiled.outputText)(output, localRequire);
  return output;
}

const { ListeningPage } = load('../pages/listening/ListeningPage.tsx');
const { AiReadingPage } = load('../pages/reading/AiReadingPage.tsx');
const { AiReadingHistoryPage } = load('../pages/reading/AiReadingHistoryPage.tsx');
const { scopeLabel } = load('../utils/scopeLabel.ts');
const { parseFurigana, stripFurigana } = load('../utils/furigana.ts');
const { FuriganaText } = load('../components/learning/FuriganaText.tsx');

function render(Component, route, url, seed) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  seed(client);
  return renderToString(React.createElement(QueryClientProvider, { client },
    React.createElement(MemoryRouter, { initialEntries: [url] },
      React.createElement(Routes, null, React.createElement(Route, { path: route, element: React.createElement(Component) }))))).replace(/<!-- -->/g, '');
}

const courses = [{ id: 1, code: 'JPD113', name: 'Nhật 1', chapterCount: 2 }, { id: 2, code: 'JPD123', name: 'Nhật 2', chapterCount: 2 }];
const options = { A: 'えき', B: 'がっこう', C: 'びょういん', D: 'うち' };

test('scopeLabel joins course and lesson number', () => {
  assert.equal(scopeLabel('Nhật 1', 3), 'Nhật 1 · Bài 3');
  assert.equal(scopeLabel('Nhật 2', null), 'Nhật 2');
});

test('listening page shows play button, ABCD questions and a gray-subtitled list of other lessons', () => {
  const html = render(ListeningPage, '/listening/:lessonId', '/listening/11', client => {
    client.setQueryData(['courses'], courses);
    client.setQueryData(['listening', 11], {
      lessonId: 11, exerciseId: 5, title: 'Nghe bài 1', courseId: 1, courseName: 'Nhật 1', chapterNo: 1,
      audioUrl: null, scriptJp: 'わたしは がくせいです。', completed: false,
      questions: [{ id: 7, content: 'どこへ いきますか。', options }],
    });
    client.setQueryData(['listening-list', 1], [
      { lessonId: 11, title: 'Nghe bài 1', courseId: 1, courseName: 'Nhật 1', chapterNo: 1, completed: false },
      { lessonId: 12, title: 'Nghe bài 2', courseId: 1, courseName: 'Nhật 1', chapterNo: 2, completed: true },
    ]);
  });
  assert.match(html, /どこへ いきますか。/);
  for (const letter of ['A', 'B', 'C', 'D']) assert.match(html, new RegExp(`value="${letter}"`));
  assert.match(html, /href="\/listening\/12"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /listening-item-sub[^>]*>Nhật 1 · Bài 2/);
  assert.match(html, /role="tab"[^>]*>Nhật 1|>Nhật 1<\/button>/);
  // The transcript stays hidden until the learner submits.
  assert.doesNotMatch(html, /わたしは がくせいです。/);
});

test('ai reading page renders the passage and questions of a loaded session', () => {
  const html = render(AiReadingPage, '/ai-reading', '/ai-reading?session=9', client => {
    client.setQueryData(['courses'], courses);
    client.setQueryData(['course', 1], { id: 1, name: 'Nhật 1', chapters: [{ id: 3, chapterNo: 1, title: 'はじめまして' }] });
    client.setQueryData(['ai-reading', 9], {
      id: 9, title: 'わたしの まち', passageJp: 'わたしの まちは しずかです。', courseId: 1, courseName: 'Nhật 1',
      chapterId: 3, chapterNo: 1, lessonId: null, status: 'GENERATED', createdAt: '2026-11-22T10:00:00',
      questions: [{ index: 0, content: 'まちは どうですか。', options }], result: null,
    });
  });
  assert.match(html, /わたしの まちは しずかです。/);
  assert.match(html, /まちは どうですか。/);
  assert.match(html, /Nộp bài/);
  assert.match(html, /Bài 1: はじめまして/);
  assert.doesNotMatch(html, /Hiện bản dịch/);
});

test('ai reading page shows the result and translation toggle for a submitted session', () => {
  const html = render(AiReadingPage, '/ai-reading', '/ai-reading?session=9', client => {
    client.setQueryData(['courses'], courses);
    client.setQueryData(['course', 1], { id: 1, name: 'Nhật 1', chapters: [] });
    client.setQueryData(['ai-reading', 9], {
      id: 9, title: 'わたしの まち', passageJp: 'しずかです。', courseId: 1, courseName: 'Nhật 1',
      chapterId: null, chapterNo: null, lessonId: null, status: 'SUBMITTED', createdAt: '2026-11-22T10:00:00',
      questions: [{ index: 0, content: 'まちは どうですか。', options }],
      result: { total: 1, correct: 1, score: 100, passingScore: 80, passed: true, coinsAwarded: 5, translationVi: 'Yên tĩnh.',
        results: [{ index: 0, selected: 'A', correctAnswer: 'A', correct: true, explanation: null }] },
    });
  });
  assert.match(html, /Đúng 1\/1 câu · 100 điểm/);
  assert.match(html, /Nhận 5 coin/);
  assert.match(html, /Hiện bản dịch/);
  assert.match(html, /Tạo bài mới/);
});

test('ai reading history links each item to its session', () => {
  const html = render(AiReadingHistoryPage, '/ai-reading/history', '/ai-reading/history', client => {
    client.setQueryData(['ai-reading-history', 0], { page: 0, size: 10, total: 1, items: [{
      id: 9, title: 'わたしの まち', courseName: 'Nhật 2', chapterNo: 4, status: 'SUBMITTED', totalQuestions: 5,
      correctCount: 4, coinsAwarded: 5, createdAt: '2026-11-22T10:00:00', submittedAt: '2026-11-22T10:05:00' }] });
  });
  assert.match(html, /href="\/ai-reading\?session=9"/);
  assert.match(html, /Nhật 2 · Bài 4/);
  assert.match(html, /4\/5 câu đúng/);
});

test('furigana markup parses into kanji/reading segments and strips to plain text', () => {
  assert.deepEqual(parseFurigana('{私|わたし}は{学生|がくせい}です。'), [
    { text: '私', reading: 'わたし' }, { text: 'は' }, { text: '学生', reading: 'がくせい' }, { text: 'です。' },
  ]);
  assert.deepEqual(parseFurigana('{今日|}'), [{ text: '今日' }]);
  assert.equal(stripFurigana('{行|い}きます'), '行きます');
  assert.equal(stripFurigana(null), '');
  assert.equal(stripFurigana('ひらがなだけ'), 'ひらがなだけ');
  // Braces the AI wraps around kana without a reading are dropped instead of shown.
  assert.deepEqual(parseFurigana('{ベトナム}の{大学|だいがく}'), [
    { text: 'ベトナム' }, { text: 'の' }, { text: '大学', reading: 'だいがく' },
  ]);
  assert.equal(stripFurigana('{アメリカ}の大学'), 'アメリカの大学');
});

test('ai reading page no longer offers read-aloud for the passage', () => {
  const html = render(AiReadingPage, '/ai-reading', '/ai-reading?session=9', client => {
    client.setQueryData(['courses'], courses);
    client.setQueryData(['course', 1], { id: 1, name: 'Nhật 1', chapters: [] });
    client.setQueryData(['ai-reading', 9], {
      id: 9, title: 'まち', passageJp: 'しずかです。', courseId: 1, courseName: 'Nhật 1',
      chapterId: null, chapterNo: null, lessonId: null, status: 'GENERATED', createdAt: '2026-11-22T10:00:00',
      questions: [{ index: 0, content: 'どうですか。', options }], result: null,
    });
  });
  assert.doesNotMatch(html, /script-speech/);
  assert.match(html, /ふりがな/);
});

test('furigana text renders ruby only when readings are shown', () => {
  const on = renderToString(React.createElement(FuriganaText, { text: '{日本|にほん}へ', showReading: true }));
  assert.match(on, /<ruby>日本<rp>\(<\/rp><rt>にほん<\/rt><rp>\)<\/rp><\/ruby>へ/);
  const off = renderToString(React.createElement(FuriganaText, { text: '{日本|にほん}へ', showReading: false }));
  assert.equal(off.replace(/<!-- -->/g, ''), '日本へ');
});

test('ai reading page hides furigana by default and offers the toggle', () => {
  const html = render(AiReadingPage, '/ai-reading', '/ai-reading?session=9', client => {
    client.setQueryData(['courses'], courses);
    client.setQueryData(['course', 1], { id: 1, name: 'Nhật 1', chapters: [] });
    client.setQueryData(['ai-reading', 9], {
      id: 9, title: '{私|わたし}の{町|まち}', passageJp: '{私|わたし}は{学生|がくせい}です。', courseId: 1, courseName: 'Nhật 1',
      chapterId: null, chapterNo: null, lessonId: null, status: 'GENERATED', createdAt: '2026-11-22T10:00:00',
      questions: [{ index: 0, content: '{誰|だれ}ですか。', options }], result: null,
    });
  });
  assert.match(html, /私は学生です。/);
  assert.match(html, /誰ですか。/);
  assert.doesNotMatch(html, /<rt>/);
  assert.doesNotMatch(html, /\{私\|/);
  assert.match(html, /aria-pressed="false"[^>]*>.*ふりがな/);
});