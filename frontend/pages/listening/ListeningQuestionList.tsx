import "./ListeningQuestionList.css";

export const LISTENING_LETTERS = ["A", "B", "C", "D"] as const;

export interface ListeningItem {
  /** Khóa gửi lên server: id câu hỏi. */
  key: string;
  content: string;
  options: Partial<Record<string, string>>;
}

export interface ListeningItemResult {
  correctAnswer: string;
  correct: boolean;
  explanation?: string | null;
}

/** Danh sách câu hỏi trắc nghiệm A–D; sau khi có kết quả thì khóa lựa chọn và tô đúng/sai. */
export function ListeningQuestionList({
  items,
  answers,
  onAnswer,
  results,
  name,
}: {
  items: ListeningItem[];
  answers: Record<string, string>;
  onAnswer: (key: string, letter: string) => void;
  results?: Record<string, ListeningItemResult>;
  name: string;
}) {
  const graded = Boolean(results);
  return (
    <ol className="listening-q-list">
      {items.map((item, index) => {
        const result = results?.[item.key];
        return (
          <li key={item.key} className="listening-q-item">
            <fieldset disabled={graded}>
              <legend lang="ja">
                <span className="listening-q-number" lang="vi">Câu {index + 1}.</span> {item.content}
              </legend>
              <div className="listening-q-options">
                {LISTENING_LETTERS.filter((letter) => item.options[letter]).map((letter) => {
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
                    <label key={letter} className={`listening-q-option ${state}`}>
                      <input
                        type="radio"
                        name={`${name}-${item.key}`}
                        value={letter}
                        checked={chosen}
                        onChange={() => onAnswer(item.key, letter)}
                      />
                      <span className="listening-q-letter">{letter}</span>
                      <span lang="ja">{item.options[letter]}</span>
                    </label>
                  );
                })}
              </div>
              {result && (
                <p className={`listening-q-feedback ${result.correct ? "correct" : "wrong"}`}>
                  {result.correct ? "✓ Đúng" : `✗ Sai — đáp án đúng: ${result.correctAnswer}`}
                  {result.explanation && <span className="listening-q-explanation">{result.explanation}</span>}
                </p>
              )}
            </fieldset>
          </li>
        );
      })}
    </ol>
  );
}
