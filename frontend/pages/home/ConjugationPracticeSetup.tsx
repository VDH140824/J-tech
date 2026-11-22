import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getConjugationForm,
  type DifficultyFilter,
  type PracticeMode,
  type VerbGroupFilter,
} from "../../api/studentConjugationApi";
import { DIFFICULTY_OPTIONS, GROUP_OPTIONS } from "../../utils/conjugationFilters";

/**
 * UC-23: trước khi luyện tập, học viên chọn nhóm động từ, độ khó và hình thức làm bài.
 * Các lựa chọn này cố định trong suốt lượt luyện tập.
 */
export interface PracticeSetup {
  group: VerbGroupFilter;
  difficulty: DifficultyFilter;
  mode: PracticeMode;
}

interface Props {
  formId: number;
  initial?: Partial<PracticeSetup>;
  onCancel: () => void;
  onStart: (setup: PracticeSetup) => void;
}

const MODE_OPTIONS: ReadonlyArray<{ value: PracticeMode; label: string; hint: string }> = [
  { value: "typed", label: "Nhập đáp án", hint: "Tự gõ dạng đã chia" },
  { value: "choice", label: "Trắc nghiệm", hint: "Chọn 1 trong các phương án" },
];

export function ConjugationPracticeSetup({ formId, initial, onCancel, onStart }: Props) {
  const [group, setGroup] = useState<VerbGroupFilter>(initial?.group ?? 0);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(initial?.difficulty ?? "ALL");
  const [mode, setMode] = useState<PracticeMode>(initial?.mode ?? "typed");

  // Số câu theo nhóm (trong độ khó đang chọn) và theo độ khó (trong nhóm đang chọn)
  const detail = useQuery({
    queryKey: ["conjugation-form", formId, group, difficulty],
    queryFn: ({ signal }) => getConjugationForm(formId, group, difficulty, signal),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const data = detail.data;
  const available = data?.questionCountByGroup[String(group)] ?? 0;
  const perRound = data ? Math.min(data.questionsPerPractice, available) : 0;

  return (
    <div className="cj-dialog-overlay" onClick={onCancel}>
      <div
        className="cj-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cj-setup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cj-setup-title">
          Luyện tập {data ? `${data.nameVi} (${data.nameJp})` : "thể chia"}
        </h2>

        <fieldset className="cj-choice-group">
          <legend>Nhóm động từ</legend>
          {GROUP_OPTIONS.map((option) => {
            const count = data?.questionCountByGroup[String(option.value)] ?? 0;
            return (
              <button
                key={option.value}
                type="button"
                className={group === option.value ? "is-active" : undefined}
                aria-pressed={group === option.value}
                disabled={!!data && count === 0 && group !== option.value}
                onClick={() => setGroup(option.value)}
              >
                {option.label} <span>({count})</span>
              </button>
            );
          })}
        </fieldset>

        <fieldset className="cj-choice-group">
          <legend>Độ khó</legend>
          {DIFFICULTY_OPTIONS.map((option) => {
            const count = data?.questionCountByDifficulty[option.value] ?? 0;
            return (
              <button
                key={option.value}
                type="button"
                className={difficulty === option.value ? "is-active" : undefined}
                aria-pressed={difficulty === option.value}
                disabled={!!data && count === 0 && difficulty !== option.value}
                onClick={() => setDifficulty(option.value)}
              >
                {option.label} <span>({count})</span>
              </button>
            );
          })}
        </fieldset>

        <fieldset className="cj-choice-group">
          <legend>Hình thức làm bài</legend>
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={mode === option.value ? "is-active" : undefined}
              aria-pressed={mode === option.value}
              title={option.hint}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>

        <p className="cj-dialog-note" role="status">
          {detail.isError
            ? "Không tải được dữ liệu, hãy thử lại sau."
            : available > 0
              ? `${available} câu phù hợp, mỗi lượt ${perRound} câu ngẫu nhiên.`
              : "Chưa có câu luyện tập cho lựa chọn này. Hãy chọn nhóm hoặc độ khó khác."}
        </p>

        <div className="cj-dialog-actions">
          <button type="button" className="sg-btn sg-btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className="sg-btn sg-btn-primary"
            disabled={!data || available === 0 || detail.isFetching}
            onClick={() => onStart({ group, difficulty, mode })}
          >
            Bắt đầu luyện tập
          </button>
        </div>
      </div>
    </div>
  );
}
