export interface ContentField { key: string; label: string; required?: boolean; maxLength?: number; type?: "textarea" | "url"; }
interface VocabularyConfig { path: string; titleKey: string; summaryKey: string; fields: ContentField[]; }
export const VOCABULARY_CONFIG: VocabularyConfig = {
    path: "vocabularies", titleKey: "word", summaryKey: "meaningVi", fields: [
      { key: "word", label: "Từ vựng tiếng Nhật", required: true, maxLength: 100 },
      { key: "reading", label: "Cách đọc", required: true, maxLength: 100 },
      { key: "meaningVi", label: "Nghĩa tiếng Việt", required: true, maxLength: 255 },
      { key: "wordType", label: "Từ loại", maxLength: 50 },
      { key: "exampleJp", label: "Ví dụ tiếng Nhật", type: "textarea", maxLength: 500 },
      { key: "exampleVi", label: "Dịch nghĩa ví dụ", type: "textarea", maxLength: 500 },
      { key: "audioUrl", label: "Đường dẫn audio phát âm", required: true, type: "url", maxLength: 500 },
    ]
  };
