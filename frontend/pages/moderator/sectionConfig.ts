import type { SkillType } from "../../api/lessonApi";

export type LessonSection = "kanji" | "vocabulary" | "grammar" | "listening" | "reading";

export interface SectionConfig {
  key: LessonSection;
  skillType: SkillType;
  label: string;
  labelJp: string;
  itemButtonLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const SECTIONS: SectionConfig[] = [
  {
    key: "kanji",
    skillType: "KANJI",
    label: "Kanji",
    labelJp: "漢字",
    itemButtonLabel: "Danh sách Kanji",
    icon: "🈳",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    description: "Quản lý danh sách các bài học Hán tự của chương",
  },
  {
    key: "vocabulary",
    skillType: "VOCABULARY",
    label: "Từ vựng",
    labelJp: "語彙",
    itemButtonLabel: "Danh sách từ vựng",
    icon: "📕",
    color: "#0d9488",
    bgColor: "#f0fdfa",
    borderColor: "#99f6e4",
    description: "Quản lý danh sách các bài học Từ vựng của chương",
  },
  {
    key: "grammar",
    skillType: "GRAMMAR",
    label: "Ngữ pháp",
    labelJp: "文法",
    itemButtonLabel: "Chi tiết ngữ pháp",
    icon: "📄",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    description: "Quản lý danh sách các bài học Ngữ pháp của chương",
  },
  {
    key: "listening",
    skillType: "LISTENING",
    label: "Nghe",
    labelJp: "聴解",
    itemButtonLabel: "Danh sách bài nghe",
    icon: "🎧",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#c4b5fd",
    description: "Quản lý danh sách các bài học Nghe hiểu của chương",
  },
  {
    key: "reading",
    skillType: "READING",
    label: "Đọc hiểu",
    labelJp: "読解",
    itemButtonLabel: "Danh sách bài đọc",
    icon: "📖",
    color: "#ea580c",
    bgColor: "#fff7ed",
    borderColor: "#fed7aa",
    description: "Quản lý danh sách các bài học Đọc hiểu của chương",
  },
];
