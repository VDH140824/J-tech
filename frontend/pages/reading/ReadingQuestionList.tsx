import { FuriganaText } from "../../components/learning/FuriganaText";
import "./ReadingQuestionList.css";

const LETTERS = ["A", "B", "C", "D"] as const;

export interface ReadingItem {
  /** Chỉ số câu trong bài đọc, dùng làm khóa gửi lên server. */
  key: string;
  content: string;
  options: Partial<Record<string, string>>;
}

export interface ReadingItemResult {
  correctAnswer: string;
  correct: boolean;
  explanation?: string | null;
}

/** Câu hỏi đọc hiểu A–D bằng tiếng Nhật (có thể kèm furigana); sau khi chấm thì khóa lựa chọn và tô đúng/sai. */
export function ReadingQuestionList({
  items,
  answers,
  onAnswer,
  results,
  name,
  showReading,
}: {
  items: ReadingItem[];
  answers: Record<string, string>;
  onAnswer: (key: string, letter: string) => void;
  results?: Record<string, ReadingItemResult>;
  name: string;
  showReading: boolean;
}) {
  const graded = Boolean(results);
  return (
    <ol className="reading-q-list">
      {items.map((item, index) => {
        const result = results?.[item.key];
        return (
          <li key={item.key} className="reading-q-item">
            <fieldset disabled={graded}>
              <legend>
                <span className="reading-q-number">Câu {index + 1}.</span>{" "}
                <span lang="ja">
                  <FuriganaText text={item.content} showReading={showReading} />
                </span>
              </legend>
              <div className="reading-q-options">
                {LETTERS.filter((letter) => item.options[letter]).map((letter) => {
                  const chosen = answers[item.key] === letter;
                  const state = result
                    ? letter === result.correctAnswer
                      ? "correct"
                      : chosen
                        ? "wrong"
                        : ""
                    : chosen
                      ? "chosen"
                      : "";
                  return (
                    <label key={letter} className={`reading-q-option ${state}`}>
                      <input
                        type="radio"
                        name={`${name}-${item.key}`}
                        value={letter}
                        checked={chosen}
                        onChange={() => onAnswer(item.key, letter)}
                      />
                      <span className="reading-q-letter">{letter}</span>
                      <span lang="ja">
                        <FuriganaText text={item.options[letter] as string} showReading={showReading} />
                      </span>
                    </label>
                  );
                })}
              </div>
              {result && (
                <p className={`reading-q-feedback ${result.correct ? "correct" : "wrong"}`}>
                  {result.correct ? "✓ Đúng" : `✗ Sai — đáp án đúng: ${result.correctAnswer}`}
                  {result.explanation && <span className="reading-q-explanation">{result.explanation}</span>}
                </p>
              )}
            </fieldset>
          </li>
        );
      })}
    </ol>
  );
}
