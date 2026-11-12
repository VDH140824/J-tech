/** Ask Cloudinary to deliver an uploaded classroom file as a download. */
export function attachmentDownloadUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return url;

    const match = parsed.pathname.match(/^\/([^/]+)\/(image|video|raw)\/upload\/(.+)$/);
    if (!match || match[3].startsWith("fl_attachment/")) return url;

    parsed.pathname = `/${match[1]}/${match[2]}/upload/fl_attachment/${match[3]}`;
    return parsed.href;
  } catch {
    return url;
  }
}
