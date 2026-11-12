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
// CoursePage loads its chapter list in useEffect, which never runs in SSR; the first
// argument-less useState call (the course) is seeded with this value instead.
let presetCourse;
const reactWithPresetCourse = {
  ...React,
  useState: (...args) => (args.length === 0 ? [presetCourse, () => {}] : React.useState(...args)),
};

function load(relative) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } });
  const output = {};
  const localRequire = name => {
    if (name === 'react') return reactWithPresetCourse;
    if (name.endsWith('.css')) return {};
    if (name.includes('/store/authStore')) return { useAuthStore: selector => selector({ user: { role: 'STUDENT', roleId: 1 } }) };
    if (name.includes('/api/speakingApi')) return { SPEAKING_DEMO: false, getSpeakingScenarios: unexpected };
    if (name.includes('/api/studentChapterApi')) return { getStudentChapters: unexpected };
    if (name.includes('/api/courseApi')) return { getChapterStudy: unexpected };
    if (name.includes('/services/api')) return { apiClient: { get: unexpected } };
    if (name === './SpeakingSessionPage') return { DemoBanner: () => null };
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

const { CoursePage } = load('../pages/home/CoursePage.tsx');
const { SpeakingScenarioListPage } = load('../pages/speaking/SpeakingScenarioListPage.tsx');

function render(Component, route, url, seed) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  seed(client);
  return renderToString(React.createElement(QueryClientProvider, { client },
    React.createElement(MemoryRouter, { initialEntries: [url] },
      React.createElement(Routes, null, React.createElement(Route, { path: route, element: React.createElement(Component) }))))).replace(/<!-- -->/g, '');
}

const line = (speaker, text) => ({ speaker, segments: [{ text, free: false }], meaning: '', note: null });
const scenario = (id, title, script) => ({
  id, chapterId: 2, title, situation: 'Ở nhà hàng', aiRole: 'Nhân viên', studentRole: 'Khách',
  script, completedCount: 0,
});
const dialogue = scenario(7, 'Gọi món', [line('AI', 'いらっしゃいませ。'), line('STUDENT', 'お水をください。')]);
const monologue = scenario(8, 'Tự giới thiệu', [line('STUDENT', 'はじめまして。')]);

presetCourse = {
  name: 'Nhật 1', description: 'Khóa học sơ cấp',
  chapters: [{ id: 2, chapterNo: 1, title: 'Chương 1', description: '', testCount: 0, lessons: [] }],
};
const speakingLink = /href="\/courses\/1\/chapters\/2\/speaking"/;
const renderCourse = seed => render(CoursePage, '/courses/:courseId', '/courses/1', seed);

test('course chapter card links to speaking practice when the chapter has scenarios', () => {
  const html = renderCourse(client => client.setQueryData(['speaking-scenarios', 2], [dialogue]));
  assert.match(html, speakingLink);
  assert.match(html, /Luyện nói với AI/);
});

test('course chapter card hides speaking practice when there is nothing to practise', () => {
  const empty = renderCourse(client => client.setQueryData(['speaking-scenarios', 2], []));
  const loading = renderCourse(() => {});
  const failed = renderCourse(client => {
    client.getQueryCache().build(client, { queryKey: ['speaking-scenarios', 2] })
      .setState({ status: 'error', error: new Error('network'), fetchStatus: 'idle' });
  });
  for (const html of [empty, loading, failed]) {
    assert.match(html, /Chương 1/);
    assert.doesNotMatch(html, speakingLink);
  }
});

test('scenario list offers the swapped role only for scenarios with an AI line', () => {
  const html = render(SpeakingScenarioListPage, '/courses/:courseId/chapters/:chapterId/speaking',
    '/courses/1/chapters/2/speaking', client => {
      client.setQueryData(['chapter-study', 1, 2], { id: 2, chapterNo: 1, courseName: 'Nhật 1', lessons: [] });
      client.setQueryData(['speaking-scenarios', 2], [dialogue, monologue]);
    });
  assert.match(html, /Nhật 1 \/ Chương 1 \/ Luyện nói/);
  const cards = html.split('<article').slice(1);
  assert.equal(cards.length, 2);
  assert.match(cards[0], /Gọi món/);
  assert.match(cards[0], /Đóng vai Nhân viên/);
  assert.match(cards[1], /Tự giới thiệu/);
  assert.doesNotMatch(cards[1], /Đóng vai/);
  assert.equal((html.match(/Bắt đầu →/g) || []).length, 2);
});
