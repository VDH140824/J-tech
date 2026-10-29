const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const redirects = [];
let currentUser = { role: 'STUDENT', roleId: 1 };
function load(relative) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } });
  const output = {};
  const localRequire = name => {
    if (name === 'react-router-dom') return { ...require(name), Navigate: ({ to }) => { redirects.push(to); return null; } };
    if (name.endsWith('.css')) return {};
    if (name.includes('/store/authStore')) return { useAuthStore: selector => selector({ user: currentUser }) };
    if (name.includes('/api/courseApi')) return {
      getCourse: async () => { throw new Error('unexpected fetch'); },
      getCourses: async () => { throw new Error('unexpected fetch'); },
      getChapterStudy: async () => { throw new Error('unexpected fetch'); },
    };
    if (name.includes('/services/api')) return { apiClient: { get: async () => { throw new Error('unexpected fetch'); } } };
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
const { ChapterPage } = load('../pages/home/ChapterPage.tsx');
const { CoursePage } = load('../pages/home/CoursePage.tsx');
const { ModeratorLessonListTab } = load('../pages/moderator/ModeratorLessonListTab.tsx');
const { ModeratorVocabularyListPage } = load('../pages/moderator/ModeratorVocabularyListPage.tsx');
const context = { courseName: 'Nhật 1', chapterNo: 1, chapterTitle: 'Chương 1' };
function render(Component, route, url, data, props) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  if (data) client.setQueryData(['chapter-study', 1, 2], data);
  return renderToString(React.createElement(QueryClientProvider, { client },
    React.createElement(MemoryRouter, { initialEntries: [url] },
      React.createElement(Routes, null, React.createElement(Route, { path: route, element: React.createElement(Component, props) }))))).replace(/<!-- -->/g, '');
}
const chapter = { id: 2, chapterNo: 1, title: 'Chương 1', courseId: 1, courseName: 'Nhật 1', lessons: [] };
const chapterRoute = '/courses/:courseId/chapters/:chapterId';

test('student course uses the shared moderator course layout instead of the separate card layout', () => {
  currentUser = { role: 'STUDENT', roleId: 1 };
  const html = render(CoursePage, '/courses/:courseId', '/courses/1');
  assert.match(html, /student-learning-page/);
  assert.match(html, /admin-page-container/);
  assert.match(html, /admin-filter-card/);
  assert.match(html, /Danh sách môn học/);
  assert.doesNotMatch(html, /course-detail-page/);
});

test('moderator course URL keeps the existing portal redirect', () => {
  currentUser = { role: 'MODERATOR', roleId: 2 };
  redirects.length = 0;
  render(CoursePage, '/courses/:courseId', '/courses/7');
  assert.deepEqual(redirects, ['/moderator/courses?courseId=7']);
});

test('student chapter uses the same five skill cards', () => {
  const html = render(ChapterPage, chapterRoute, '/courses/1/chapters/2', chapter);
  assert.match(html, /mod-skills-grid/);
  assert.equal((html.match(/class="mod-skill-choice-card"/g) || []).length, 5);
  assert.match(html, /Từ vựng/);
  assert.match(html, /Ngữ pháp/);
  assert.doesNotMatch(html, /Thêm bài học/);
});

test('student lesson table keeps the shared layout but hides authoring controls', () => {
  const props = { ...context, chapterId: 2, selectedSection: 'vocabulary', onSelectSection() {}, onBackToOverview() {}, onViewLessonItems() {} };
  const student = render(ModeratorLessonListTab, '/test', '/test', null, { ...props, readOnly: true, publishedLessons: [] });
  const moderator = render(ModeratorLessonListTab, '/test', '/test', null, props);
  assert.match(student, /mod-skill-tabs-nav/);
  assert.match(moderator, /mod-skill-tabs-nav/);
  assert.doesNotMatch(student, /Thêm bài học|Bản nháp \(DRAFT\)|Chỉnh sửa bài học|Xóa bài học/);
  assert.match(moderator, /Thêm bài học/);
});

test('student vocabulary uses the shared table page without create or edit controls', () => {
  const props = { ...context, lesson: { id: 3, lessonNo: 1, title: 'Từ vựng 1' }, skillLabel: 'Từ vựng', skillIcon: '📕', skillColor: '#0d9488', onBack() {} };
  const student = render(ModeratorVocabularyListPage, '/test', '/test', null, { ...props, readOnly: true });
  const moderator = render(ModeratorVocabularyListPage, '/test', '/test', null, props);
  assert.match(student, /mod-content-stats/);
  assert.match(student, /mod-toolbar-search/);
  assert.match(moderator, /mod-content-stats/);
  assert.doesNotMatch(student, /Thêm từ vựng|Chỉnh sửa|Xác nhận lưu trữ|Lọc trạng thái/);
  assert.match(moderator, /Thêm từ vựng/);
});

test('direct URL cannot show an unpublished lesson or a lesson belonging to another chapter', () => {
  for (const lesson of [
    { id: 3, chapterId: 2, skillType: 'VOCABULARY', status: 'DRAFT', title: 'Không được xem' },
    { id: 3, chapterId: 9, skillType: 'VOCABULARY', status: 'PUBLISHED', title: 'Không được xem' },
  ]) {
    const html = render(ChapterPage, chapterRoute, '/courses/1/chapters/2?lessonId=3', { ...chapter, lessons: [lesson] });
    assert.match(html, /Bài học không tồn tại trong chương hoặc chưa được xuất bản/);
    assert.doesNotMatch(html, /Không được xem/);
  }
});
