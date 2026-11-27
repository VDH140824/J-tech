export const GRAMMAR_QUESTION_TEMPLATE_URL =
  "https://res.cloudinary.com/keticbsk/raw/upload/v1794889898/Form_question_rvbv3h.xlsx";
export const GRAMMAR_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const GRAMMAR_IMPORT_MAX_QUESTIONS = 500;

export async function downloadGrammarQuestionTemplate(): Promise<void> {
  const response = await fetch(GRAMMAR_QUESTION_TEMPLATE_URL, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Không tải được mẫu Excel. Vui lòng thử lại.");
  const blob = await response.blob();
  const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
    throw new Error("File mẫu tải về không đúng định dạng Excel.");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Form_question.xlsx";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
