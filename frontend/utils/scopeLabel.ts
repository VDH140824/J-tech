/** "Nhật 1 · Bài 2" — dòng phụ ghi môn và bài của một bài học. */
export function scopeLabel(courseName?: string | null, chapterNo?: number | null): string {
  return [courseName, chapterNo ? `Bài ${chapterNo}` : null].filter(Boolean).join(" · ");
}
