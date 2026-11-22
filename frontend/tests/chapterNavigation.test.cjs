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
function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } });
  const output = {};
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
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
      return load(path.relative(__dirname, target), mocks);
    }
    return require(name);
  };
  new Function('exports', 'require', compiled.outputText)(output, localRequire);
  return output;
}
const { ChapterPage } = load('../pages/home/ChapterPage.tsx');
const { CoursePage } = load('../pages/home/CoursePage.tsx');
const { ModeratorLessonListTab } = load('../pages/moderator/ModeratorLessonListTab.tsx');
const { ModeratorVocabularyListPage } = load('../pages/moderator/vocabulary/ModeratorVocabularyListPage.tsx');
const context = { courseName: 'Nhật 1', chapterNo: 1, chapterTitle: 'Chương 1' };
function render(Component, route, url, data, props, cachedQueries = []) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  if (data) client.setQueryData(['chapter-study', 1, 2], data);
  for (const [key, value] of cachedQueries) client.setQueryData(key, value);
  return renderToString(React.createElement(QueryClientProvider, { client },
    React.createElement(MemoryRouter, { initialEntries: [url] },
      React.createElement(Routes, null, React.createElement(Route, { path: route, element: React.createElement(Component, props) }))))).replace(/<!-- -->/g, '');
}
const chapter = { id: 2, chapterNo: 1, title: 'Chương 1', courseId: 1, courseName: 'Nhật 1', lessons: [] };
const chapterRoute = '/courses/:courseId/chapters/:chapterId';

test('student course initially loads the published chapter list', () => {
  currentUser = { role: 'STUDENT', roleId: 1 };
  const html = render(CoursePage, '/courses/:courseId', '/courses/1');
  assert.match(html, /student-course-page/);
  assert.match(html, /Đang tải danh sách chương/);
  assert.doesNotMatch(html, /Thêm bài học/);
});

test('moderator course URL keeps the existing portal redirect', () => {
  currentUser = { role: 'MODERATOR', roleId: 2 };
  redirects.length = 0;
  render(CoursePage, '/courses/:courseId', '/courses/7');
  assert.deepEqual(redirects, ['/moderator/courses?courseId=7']);
});

test('student chapter without a skill returns to its course chapter', () => {
  redirects.length = 0;
  render(ChapterPage, chapterRoute, '/courses/1/chapters/2', chapter);
  assert.deepEqual(redirects, ['/courses/1#chapter-2']);
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

const grammarLessons = [
  { id: 31, chapterId: 2, skillType: 'GRAMMAR', lessonNo: 1, title: 'Câu khẳng định danh từ', displayOrder: 2, status: 'PUBLISHED' },
  { id: 32, chapterId: 2, skillType: 'GRAMMAR', lessonNo: 1, title: 'Hỏi quốc gia, quê quán', displayOrder: 1, status: 'PUBLISHED' },
  { id: 33, chapterId: 2, skillType: 'GRAMMAR', lessonNo: 2, title: 'Câu nghi vấn danh từ', displayOrder: 3, status: 'PUBLISHED' },
];
const grammarChapter = { ...chapter, lessons: [
  ...grammarLessons,
  ...['DRAFT', 'HIDDEN', 'ARCHIVED'].map((status, i) => ({ ...grammarLessons[0], id: 40 + i, status, title: `Nội dung ${status}` })),
  { ...grammarLessons[0], id: 45, chapterId: 9, title: 'Nội dung chương khác' },
  { ...grammarLessons[0], id: 46, skillType: 'VOCABULARY', title: 'Nội dung từ vựng' },
] };

function courseWithLessons(chapters) {
  const snapshot = { id: 1, name: 'Nhật 1', chapters };
  const { CoursePage: LoadedCoursePage } = load('../pages/home/CoursePage.tsx', {
    // SSR does not run the fetch effect; seed the course state with an API response.
    react: { ...React, useState(initial) {
      const [value, setValue] = React.useState(initial);
      return [initial === undefined ? snapshot : value, setValue];
    } },
  });
  currentUser = { role: 'STUDENT', roleId: 1 };
  return render(LoadedCoursePage, '/courses/:courseId', '/courses/1#chapter-2');
}

function studentLesson(lesson, overrides = {}) {
  return { ...lesson, itemCount: 1, videoCount: 0, durationSeconds: 0, exerciseCount: 0, testCount: 0, completed: false, ...overrides };
}

test('course groups grammar by chapter and lesson number, totals statistics, and keeps other skills', () => {
  const chapters = [{ ...chapter, testCount: 0, lessons: [
    studentLesson(grammarLessons[0], { videoCount: 1, durationSeconds: 20, exerciseCount: 2, completed: true }),
    studentLesson(grammarLessons[2]),
    studentLesson({ ...grammarLessons[0], id: 50, skillType: 'VOCABULARY', title: 'Từ vựng bài 1' }),
    studentLesson(grammarLessons[1], { itemCount: 2, videoCount: 1, durationSeconds: 30, exerciseCount: 3, testCount: 1 }),
  ] }, { ...chapter, id: 9, chapterNo: 2, testCount: 0, lessons: [studentLesson({ ...grammarLessons[0], id: 51, chapterId: 9 })] }];
  const before = JSON.stringify(chapters);
  const html = courseWithLessons(chapters);
  const grammarRows = [...html.matchAll(/<li>.*?<\/li>/gs)].map(match => match[0]).filter(row => row.includes('skill=GRAMMAR'));
  assert.equal(grammarRows.length, 3);
  const first = grammarRows.find(row => row.includes('/chapters/2?skill=GRAMMAR&amp;lessonNo=1'));
  assert.ok(first);
  assert.match(first, /Ngữ pháp bài 1/);
  assert.match(first, /3 nội dung · 2 video · 1 phút video · 5 bài tập · 1 bài kiểm tra/);
  assert.match(first, /Chưa hoàn thành/);
  assert.doesNotMatch(first, /lessonId=|Câu khẳng định danh từ|Hỏi quốc gia/);
  assert.match(html, /chapters\/2\?skill=GRAMMAR&amp;lessonNo=2/);
  assert.match(html, /chapters\/9\?skill=GRAMMAR&amp;lessonNo=1/);
  assert.match(html, /chapters\/2\?skill=VOCABULARY/);
  assert.match(html, /Từ vựng bài 1/);
  assert.equal(JSON.stringify(chapters), before, 'rendering must not alter source lessons or progress');
});

test('grammar row is complete only when every member is complete', () => {
  for (const completed of [false, true]) {
    const html = courseWithLessons([{ ...chapter, testCount: 0, lessons: [
      studentLesson(grammarLessons[0], { completed: true }),
      studentLesson(grammarLessons[1], { completed }),
    ] }]);
    const row = html.match(/<li>.*?<\/li>/s)[0];
    assert.equal(row.includes('lesson-status completed'), completed);
  }
});

test('grammar group displays only published cards for the selected number and chapter', () => {
  const html = render(ChapterPage, chapterRoute, '/courses/1/chapters/2?skill=GRAMMAR&lessonNo=1', grammarChapter);
  assert.match(html, /Ngữ pháp · Bài 1/);
  assert.equal((html.match(/class="kanji-tile"/g) || []).length, 2);
  assert.equal((html.match(/TÀI LIỆU &amp; BÀI TẬP/g) || []).length, 2);
  assert.ok(html.indexOf(grammarLessons[1].title) < html.indexOf(grammarLessons[0].title));
  assert.doesNotMatch(html, /Câu nghi vấn danh từ|Nội dung DRAFT|Nội dung HIDDEN|Nội dung ARCHIVED|Nội dung chương khác|Nội dung từ vựng/);
});

test('grammar chapter displays one group per lesson number and empty groups never show other lessons', () => {
  const index = render(ChapterPage, chapterRoute, '/courses/1/chapters/2?skill=GRAMMAR', grammarChapter);
  assert.equal((index.match(/class="kanji-tile"/g) || []).length, 2);
  assert.match(index, /2 bài ngữ pháp/);
  const empty = render(ChapterPage, chapterRoute, '/courses/1/chapters/2?skill=GRAMMAR&lessonNo=99', grammarChapter);
  assert.match(empty, /Bài 99 chưa có nội dung ngữ pháp được xuất bản/);
  assert.doesNotMatch(empty, /class="kanji-tile"/);
});

test('invalid grammar lesson numbers cannot display a different group', () => {
  for (const number of ['', '0', '-1', 'abc', '1.5', '9007199254740992']) {
    const html = render(ChapterPage, chapterRoute, `/courses/1/chapters/2?skill=GRAMMAR&lessonNo=${number}`, grammarChapter);
    assert.match(html, /Số bài ngữ pháp không hợp lệ/);
    assert.doesNotMatch(html, /class="kanji-tile"/);
  }
});

function grammarNavigation(url) {
  let location = new URL(url, 'http://localhost');
  const buttons = [];
  const runtime = require('react/jsx-runtime');
  const capture = method => (type, props, key) => {
    if (type === 'button' && props.onClick) buttons.push(props);
    return runtime[method](type, props, key);
  };
  const { ChapterPage: Page } = load('../pages/home/ChapterPage.tsx', {
    'react-router-dom': { ...require('react-router-dom'),
      useParams: () => ({ courseId: '1', chapterId: '2' }),
      useNavigate: () => target => { location = new URL(target, location); },
      useSearchParams: () => [new URLSearchParams(location.search), update => {
        const next = typeof update === 'function' ? update(new URLSearchParams(location.search)) : update;
        location.search = new URLSearchParams(next).toString();
      }],
    },
    'react/jsx-runtime': { ...runtime, jsx: capture('jsx'), jsxs: capture('jsxs') },
  });
  const cachedQueries = grammarLessons.map(lesson => [['student-grammar-lesson', lesson.id], {
    ...lesson, courseName: 'Nhật 1', chapterNo: 1, grammars: [], exerciseCount: 0,
    miniTest: { id: 71, title: 'Mini test danh từ', questionCount: 2, durationMinutes: 5, passingScore: 70 },
  }]);
  const text = children => Array.isArray(children) ? children.map(text).join('')
    : React.isValidElement(children) ? text(children.props.children) : String(children ?? '');
  return {
    render() {
      buttons.length = 0;
      return render(Page, chapterRoute, location.pathname + location.search, grammarChapter, undefined, cachedQueries);
    },
    click(label) {
      const button = buttons.find(props => text(props.children).includes(label));
      assert.ok(button, `Missing button: ${label}`);
      button.onClick();
    },
    get location() { return location; },
  };
}

test('grammar navigation opens the selected member and returns to its group and course chapter', () => {
  const page = grammarNavigation('/courses/1/chapters/2?skill=GRAMMAR');
  page.render();
  page.click('Ngữ pháp bài 1');
  assert.equal(page.location.search, '?skill=GRAMMAR&lessonNo=1');
  assert.equal((page.render().match(/class="kanji-tile"/g) || []).length, 2);
  page.click('Hỏi quốc gia, quê quán');
  assert.equal(page.location.searchParams.get('lessonId'), '32');
  let html = page.render();
  assert.match(html, /<h2>Hỏi quốc gia, quê quán<\/h2>/);
  assert.match(html, /MINI TEST/);
  page.click('TÀI LIỆU & BÀI TẬP');
  assert.equal(page.location.searchParams.get('grammarView'), 'material');
  html = page.render();
  assert.match(html, /role="tabpanel"/);
  page.click('Bài tập');
  assert.equal(page.location.searchParams.get('grammarView'), 'exercise');
  page.render();
  page.click('Quay lại');
  assert.equal(page.location.searchParams.has('grammarView'), false);
  page.render();
  page.click('Quay lại');
  assert.equal(page.location.search, '?skill=GRAMMAR&lessonNo=1');
  page.render();
  page.click('Quay lại chương');
  assert.equal(page.location.pathname + page.location.hash, '/courses/1#chapter-2');
});

test('existing grammar lesson links still open and return to the correct lesson-number group', () => {
  const page = grammarNavigation('/courses/1/chapters/2?skill=GRAMMAR&lessonId=33');
  assert.match(page.render(), /<h2>Câu nghi vấn danh từ<\/h2>/);
  page.click('Quay lại');
  assert.equal(page.location.search, '?skill=GRAMMAR&lessonNo=2');
  assert.equal((page.render().match(/class="kanji-tile"/g) || []).length, 1);
});
