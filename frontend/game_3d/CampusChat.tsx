import { useEffect, useRef, useState } from "react";
import type { CampusConnectionStatus, CampusMessage } from "./campusMultiplayer";

export function CampusChat({ status, messages, selfId, count, capacity, notice, onSend, onReconnect, onOpenChange, onTyping, onClose }: {
  status: CampusConnectionStatus; messages: CampusMessage[]; selfId: number | undefined;
  count: number; capacity: number; notice: string; onSend: (text: string) => boolean;
  onReconnect: () => void; onOpenChange: (open: boolean) => void; onTyping: (typing: boolean) => void; onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [sendError, setSendError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const lastMessage = useRef<string | null>(null);
  const online = status === "online";
  useEffect(() => {
    onOpenChange(open);
    if (open) { setUnread(0); input.current?.focus({ preventScroll: true }); }
  }, [open, onOpenChange]);
  useEffect(() => () => { onTyping(false); }, [onTyping]);
  useEffect(() => {
    if (!online) { lastMessage.current = null; return; }
    const newest = messages[messages.length - 1];
    const key = newest ? `${newest.id}:${newest.time}` : "empty";
    if (!open && lastMessage.current !== null && lastMessage.current !== key) {
      const index = messages.findIndex((message) => `${message.id}:${message.time}` === lastMessage.current);
      const added = messages.slice(index + 1).filter((message) => message.userId !== selfId).length;
      if (added) setUnread((value) => value + added);
    }
    lastMessage.current = key;
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, open, online, selfId]);
  const close = () => { setOpen(false); onTyping(false); onClose(); };
  const connectionLabel = online ? `${count}/${capacity} người đang trong map`
    : status === "connecting" || status === "reconnecting" ? "Đang kết nối phòng chung…" : "Chưa kết nối phòng chung";
  return <div className="campus-chat" onKeyDown={(event) => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    {open && <section className="campus-chat-panel" aria-label="Trò chuyện trong map"
      onFocusCapture={() => onTyping(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onTyping(false); }}>
      <header><div><strong>Trò chuyện trong map</strong><small>{connectionLabel}</small></div><button type="button" aria-label="Thu gọn trò chuyện" onClick={close}>×</button></header>
      <div ref={list} className="campus-chat-messages" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <p className="campus-chat-empty">Chào mọi người bằng một tin nhắn nhé!</p>}
        {messages.map((message) => <article key={`${message.id}:${message.time}`} className={message.userId === selfId ? "campus-chat-own" : ""}>
          <div><strong>{message.name}</strong><time dateTime={new Date(message.time).toISOString()}>{new Date(message.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time></div>
          <p>{message.text}</p>
        </article>)}
      </div>
      {(notice || sendError) && <p className="campus-chat-notice" role="status">{sendError || notice}</p>}
      {!online && <button className="campus-chat-reconnect" type="button" onClick={status === "map-mismatch" ? () => window.location.reload() : onReconnect}>
        {status === "map-mismatch" ? "Tải lại map" : "Kết nối lại"}
      </button>}
      <form onSubmit={(event) => {
        event.preventDefault();
        if (onSend(text)) { setText(""); setSendError(""); input.current?.focus(); }
        else setSendError("Chưa gửi được tin nhắn. Hãy kiểm tra kết nối rồi thử lại.");
      }}>
        <label className="campus-chat-input-label" htmlFor="campus-chat-input">Tin nhắn</label>
        <input ref={input} id="campus-chat-input" value={text} maxLength={300} autoComplete="off" disabled={!online}
          placeholder={online ? "Nhắn với mọi người…" : "Đang chờ kết nối…"} onChange={(event) => setText(event.target.value)} />
        <button type="submit" disabled={!online || !text.trim()}>Gửi</button>
      </form>
    </section>}
    <button className="campus-chat-launcher" type="button" aria-label={open ? "Thu gọn trò chuyện" : "Mở trò chuyện trong map"}
      aria-expanded={open} onClick={() => open ? close() : setOpen(true)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-4 3V7.5A5.5 5.5 0 0 1 7.5 2h5A7.5 7.5 0 0 1 20 9.5v2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M7 9h8M7 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      Chat {unread > 0 && <span className="campus-chat-unread">{unread > 99 ? "99+" : unread}</span>}
    </button>
  </div>;
}
