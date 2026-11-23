import { useEffect } from "react";
import { parseMaterialContent, VERB_GROUPS } from "../../utils/conjugationMaterial";

const GROUP_TITLES = ["Cách chia (động từ nhóm 1)", "Cách chia (động từ nhóm 2)", "Cách chia (động từ nhóm 3 – bất quy tắc)"];

type Row = { from: string; to: string; example: string; result: string };
type GroupView = { rules: string[]; rows: Row[] };

const ARROW = /\s*(?:→|->|⇒|＝>)\s*/;
const isSpecial = (line: string) => /^[※＊*!！]/.test(line) || /đặc biệt|ngoại lệ|lưu ý/i.test(line);

/** 買う → 買います: phần chung "買" bỏ đi, còn "う" → "います" (âm cuối / đổi thành). */
function diff(example: string, result: string) {
  const base = example.replace(/[（(].*$/, "");
  let i = 0;
  while (i < base.length - 1 && base[i] === result[i]) i++;
  return { from: base.slice(i), to: result.slice(i) };
}

/** Tách tài liệu một nhóm: dòng quy tắc, các ví dụ "A → B", và trường hợp đặc biệt (dòng ※ …). */
function readGroup(text: string, special: string[]): GroupView {
  const rules: string[] = [];
  const rows: Row[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-•・]\s*/, "");
    if (!line) continue;
    if (isSpecial(line)) {
      special.push(line.replace(/^[※＊*!！]\s*/, ""));
      continue;
    }
    const parts = line.split(ARROW);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const example = parts[0];
      const result = parts.slice(1).join(" → ");
      rows.push({ ...diff(example, result), example, result });
    } else rules.push(line.replace(/[:：]$/, ""));
  }
  return { rules, rows };
}

/** "Bỏ る + ます" → phần sau dấu + tô đỏ. */
function RuleText({ text }: { text: string }) {
  const at = text.lastIndexOf("+");
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at + 1)} <em className="cj2-rule-add">{text.slice(at + 1).trim()}</em>
    </>
  );
}

const Example = ({ row }: { row: Row }) => (
  <span lang="ja">
    {row.example} → <strong>{row.result}</strong>
  </span>
);

/** Hộp thoại "Xem cách chia": quy tắc của cả 3 nhóm, xếp từ trên xuống. */
export function ConjugationMaterialModal({
  nameVi,
  nameJp,
  description,
  materialContent,
  onClose,
}: {
  nameVi: string;
  nameJp: string;
  description: string | null;
  materialContent: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = parseMaterialContent(materialContent);
  const hasAny = VERB_GROUPS.some(({ key }) => groups[key].trim());
  const special: string[] = [];
  const views = VERB_GROUPS.map(({ key }) => ({ key, view: readGroup(groups[key], special) }));

  return (
    <div className="cj2-overlay" onClick={onClose}>
      <div
        className="cj2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cj2-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cj2-modal-head">
          <span className="cj2-modal-icon" aria-hidden="true">
            💡
          </span>
          <div>
            <h2 id="cj2-modal-title">
              Cách chia {nameVi} <span lang="ja">({nameJp})</span>
            </h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="cj2-modal-close" aria-label="Đóng" onClick={onClose} autoFocus>
            ×
          </button>
        </header>

        <div className="cj2-modal-body">
          {!hasAny ? (
            materialContent.trim() ? (
              <p className="cj2-pre" lang="ja">
                {materialContent}
              </p>
            ) : (
              <p className="cj2-muted">Chưa có tài liệu cho thể chia này.</p>
            )
          ) : (
            <>
              {views.map(({ key, view }, index) => (
                <section key={key} className="cj2-rule">
                  <h3>
                    <span className={`cj2-step cj2-step-${index + 1}`}>{index + 1}</span>
                    {GROUP_TITLES[index]}
                  </h3>
                  {!view.rules.length && !view.rows.length ? (
                    <p className="cj2-muted">Chưa có quy tắc cho nhóm này.</p>
                  ) : index === 1 || !view.rows.length ? (
                    // Nhóm 2 (hoặc nhóm không có ví dụ): khung quy tắc + các ví dụ bên dưới
                    <div className="cj2-rule-box">
                      {view.rules.map((rule, i) => (
                        <p key={i} className="cj2-rule-title" lang="ja">
                          <RuleText text={rule} />
                        </p>
                      ))}
                      {view.rows.map((row, i) => (
                        <p key={i} className="cj2-rule-example">
                          <Example row={row} />
                        </p>
                      ))}
                    </div>
                  ) : (
                    // Nhóm 1: khung quy tắc + bảng Âm cuối / Đổi thành / Ví dụ; nhóm 3: bảng Động từ / Đổi thành
                    <>
                      {view.rules.length > 0 && (
                        <div className="cj2-rule-box">
                          {view.rules.map((rule, i) => (
                            <p key={i} className="cj2-rule-title" lang="ja">
                              <RuleText text={rule} />
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="cj2-table-wrap">
                        <table className="cj2-table">
                          <thead>
                            <tr>
                              <th scope="col">{index === 2 ? "Động từ" : "Âm cuối"}</th>
                              <th scope="col">Đổi thành</th>
                              {index !== 2 && <th scope="col">Ví dụ</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {view.rows.map((row, i) => (
                              <tr key={`${row.example}-${i}`}>
                                {index === 2 ? (
                                  // Nhóm 3 bất quy tắc: hiện nguyên động từ (する → します, 来る → 来ます)
                                  <>
                                    <td lang="ja">{row.example}</td>
                                    <td lang="ja">→ {row.result}</td>
                                  </>
                                ) : (
                                  <>
                                    <td lang="ja">{row.from}</td>
                                    <td lang="ja">→ {row.to}</td>
                                    <td>
                                      <Example row={row} />
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              ))}
              {special.length > 0 && (
                <section className="cj2-rule">
                  <h3>
                    <span className="cj2-step cj2-step-warn">!</span>
                    Trường hợp đặc biệt
                  </h3>
                  <ul className="cj2-special">
                    {special.map((line, i) => (
                      <li key={i} lang="ja">
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
