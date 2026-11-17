import { useState } from "react";
import { attachmentDownloadUrl } from "../../utils/classroomAttachment";

type AttachmentKind = "image" | "audio" | "video" | "pdf" | "document" | "archive" | "file";

function attachmentKind(url: URL): AttachmentKind {
  const extension = url.pathname.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension || "")) return "image";
  if (["mp3", "wav", "m4a", "ogg"].includes(extension || "")) return "audio";
  if (["mp4", "webm", "mov"].includes(extension || "")) return "video";
  if (extension === "pdf") return "pdf";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension || "")) return "document";
  if (extension === "zip") return "archive";
  return "file";
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "Hình ảnh đính kèm",
  audio: "Âm thanh đính kèm",
  video: "Video đính kèm",
  pdf: "Tài liệu PDF",
  document: "Tài liệu đính kèm",
  archive: "Tệp nén đính kèm",
  file: "Tệp đính kèm",
};

export function AttachmentPreview({ url, audioOnlyVideo = false }: { url: string; audioOnlyVideo?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported attachment URL");
  } catch {
    return <div className="attachment-preview attachment-preview--unavailable" role="status">Tệp đính kèm không thể hiển thị.</div>;
  }

  const detectedKind = attachmentKind(parsed);
  const kind = audioOnlyVideo && (detectedKind === "video" || parsed.pathname.includes("/video/upload/"))
    ? "audio" : detectedKind;
  const label = KIND_LABEL[kind];
  const extension = parsed.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toUpperCase() || "TỆP";
  const href = parsed.href;
  const previewFailed = failedUrl === href;

  return <div className={`attachment-preview attachment-preview--${kind}`}>
    <div className="attachment-preview__heading">
      <span className="attachment-preview__icon" aria-hidden="true">{kind === "audio" ? "♫" : kind === "video" ? "▶" : kind === "image" ? "▧" : "▤"}</span>
      <span className="attachment-preview__name">{label}<small>{extension}</small></span>
      <span className="attachment-preview__actions">
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Mở ${label.toLowerCase()} trong tab mới`}>Mở tệp ↗</a>
        <a href={attachmentDownloadUrl(href)} target="_blank" rel="noopener noreferrer" aria-label={`Tải xuống ${label.toLowerCase()}`}>Tải xuống ↓</a>
      </span>
    </div>
    {kind === "image" && !previewFailed && <img className="attachment-preview__image" src={href} alt={label} loading="lazy" onError={() => setFailedUrl(href)} />}
    {kind === "audio" && !previewFailed && <audio className="attachment-preview__audio" src={href} controls preload="metadata" onError={() => setFailedUrl(href)}>Trình duyệt không hỗ trợ phát âm thanh.</audio>}
    {kind === "video" && !previewFailed && <video className="attachment-preview__video" src={href} controls preload="metadata" onError={() => setFailedUrl(href)}>Trình duyệt không hỗ trợ phát video.</video>}
    {previewFailed && <p className="attachment-preview__error">Không tải được bản xem trước. Bạn có thể mở tệp trong tab mới.</p>}
  </div>;
}

