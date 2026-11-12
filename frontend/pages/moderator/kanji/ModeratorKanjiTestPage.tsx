import { useEffect, useState, type FormEvent } from "react";
import {
  getKanjiTestSetup,
  saveKanjiTest,
  kanjiTestError,
  type KanjiTestInput,
  type ChapterKanjiQuestion,
} from "../../../api/kanjiTestApi";
import type { KanjiExerciseInput } from "../../../api/kanjiExerciseApi";
import "../../home/StudentKanjiFlashcards.css";

function sameQuestion(a: KanjiExerciseInput, b: KanjiExerciseInput) {
  const normalize = (q: KanjiExerciseInput) =>
    JSON.stringify([
      q.questionType,
      q.content,
      q.explanation,
      q.difficulty,
      q.options,
      q.correctAnswer,
      Object.entries(q.matches || {}).sort(([a], [b]) => a.localeCompare(b)),
    ]);
  return normalize(a) === normalize(b);
}
export function ModeratorKanjiTestPage({
  chapterId,
  chapterNo,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  onBack: () => void;
}) {
  const [input, setInput] = useState<KanjiTestInput>({
    title: `Test chữ Hán · Chương ${chapterNo}`,
    description: "",
    durationMinutes: 20,
    passingScore: 70,
    status: "DRAFT",
    questions: [],
  });
  const [bank, setBank] = useState<ChapterKanjiQuestion[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const control = new AbortController();
    setLoading(true);
    setLoaded(false);
    setError("");
    getKanjiTestSetup(chapterId, control.signal)
      .then((data) => {
        if (control.signal.aborted) return;
        setBank(data.bank);
        if (data.test) {
          setInput(data.test);
          const ids = data.test.questions.map(
            (q) => data.bank.find((b) => sameQuestion(b.question, q))?.id,
          );
          setSelected(ids.filter((id): id is number => id !== undefined));
          if (ids.some((id) => id === undefined))
            setNotice(
              "Một số câu hỏi trong Test đã thay đổi hoặc không còn hoạt động. Hãy chọn lại trước khi lưu.",
            );
        } else setSelected([]);
        setLoaded(true);
      })
      .catch((e) => {
        if (!control.signal.aborted) setError(kanjiTestError(e));
      })
      .finally(() => {
        if (!control.signal.aborted) setLoading(false);
      });
    return () => control.abort();
  }, [chapterId, retry]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (!selected.length) {
      setError("Chọn ít nhất một câu hỏi từ ngân hàng của chương.");
      return;
    }
    const questions = selected.map(
      (id) => bank.find((b) => b.id === id)!.question,
    );
    if (questions.some((q) => !q.explanation?.trim())) {
      setError(
        "Mỗi câu được chọn cần có giải thích. Hãy bổ sung trong mục Bài tập Kanji của bài tương ứng.",
      );
      return;
    }
    setBusy(true);
    try {
      const data = await saveKanjiTest(chapterId, { ...input, questions });
      if (data.test) setInput(data.test);
      setNotice("Đã lưu Test chương. Student chỉ thấy Test đã xuất bản.");
    } catch (e) {
      setError(kanjiTestError(e));
    } finally {
      setBusy(false);
    }
  };
  const filtered = bank.filter(
    (b) => filter === "ALL" || String(b.lessonId) === filter,
  );
  return (
    <section className="student-kanji-page kanji-test-editor">
      <button
        type="button"
        className="kanji-text-button"
        disabled={busy}
        onClick={onBack}
      >
        ← Kanji · Chương {chapterNo}
      </button>
      <h2>Test chữ Hán · Chương {chapterNo}</h2>
      <p>
        Một Test tổng hợp các bài trong chương. Các lượt làm đã bắt đầu giữ
        nguyên câu hỏi và lời giải.
      </p>
      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Đang tải Test và ngân hàng câu hỏi…</p>
      ) : !loaded ? (
        <button onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Tiêu đề
              <input
                required
                maxLength={200}
                value={input.title}
                onChange={(e) => setInput({ ...input, title: e.target.value })}
              />
            </label>
            <label>
              Mô tả
              <textarea
                maxLength={10000}
                value={input.description || ""}
                onChange={(e) =>
                  setInput({ ...input, description: e.target.value })
                }
              />
            </label>
            <div className="kanji-test-config">
              <label>
                Thời gian (phút)
                <input
                  type="number"
                  required
                  min={1}
                  max={180}
                  value={input.durationMinutes}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Điểm đạt
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={input.passingScore}
                  onChange={(e) =>
                    setInput({ ...input, passingScore: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={input.status}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      status: e.target.value as KanjiTestInput["status"],
                    })
                  }
                >
                  <option value="DRAFT">Bản nháp</option>
                  <option value="PUBLISHED">Xuất bản</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </label>
            </div>
            <h3>Ngân hàng câu hỏi · Đã chọn {selected.length}/100</h3>
            <p>
              Tạo câu hỏi, đáp án và lời giải tại mục Bài tập Kanji của từng
              bài. Chỉ câu đang hoạt động mới có thể chọn vào Test chương.
            </p>
            <label>
              Lọc theo bài
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">Tất cả bài</option>
                {Array.from(
                  new Map(bank.map((b) => [b.lessonId, b])).values(),
                ).map((b) => (
                  <option key={b.lessonId} value={b.lessonId}>
                    Bài {b.lessonNo}: {b.lessonTitle}
                  </option>
                ))}
              </select>
            </label>
            {!filtered.length && <p>Chưa có câu hỏi phù hợp.</p>}
            {filtered.map((b) => (
              <article className="kanji-test-question" key={b.id}>
                <label className="kanji-bank-choice">
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    disabled={
                      !selected.includes(b.id) && selected.length >= 100
                    }
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, b.id]
                          : ids.filter((id) => id !== b.id),
                      )
                    }
                  />
                  <span>
                    Bài {b.lessonNo} · {b.question.questionType} ·{" "}
                    {b.published ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </label>
                <p className="kanji-preserve-lines">{b.question.content}</p>
                <details>
                  <summary>Đáp án và giải thích</summary>
                  <p className="kanji-preserve-lines">
                    {b.question.questionType === "MATCHING"
                      ? Object.entries(b.question.matches)
                          .map(([left, right]) => `${left} → ${right}`)
                          .join("\n")
                      : b.question.correctAnswer}
                  </p>
                  <p className="kanji-preserve-lines">
                    {b.question.explanation || "Chưa có giải thích."}
                  </p>
                </details>
              </article>
            ))}
            <div className="kanji-test-actions">
              <button
                type="submit"
                className="kanji-primary"
                disabled={!selected.length}
              >
                {busy ? "Đang lưu…" : "Lưu Test chương"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
