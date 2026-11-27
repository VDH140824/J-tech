export function stripChapterPrefix(chapterNo: number, title: string): string {
  const trimmedTitle = title.trim();
  const prefix = /^chương\s+(\d+)(?:\s*[:：·–—-]\s*|$)/i.exec(trimmedTitle);
  return prefix && Number(prefix[1]) === chapterNo
    ? trimmedTitle.slice(prefix[0].length)
    : trimmedTitle;
}

export function formatChapterLabel(chapterNo: number, title: string, separator = ": "): string {
  const label = `Chương ${chapterNo}`;
  const name = stripChapterPrefix(chapterNo, title);
  return name ? `${label}${separator}${name}` : label;
}
