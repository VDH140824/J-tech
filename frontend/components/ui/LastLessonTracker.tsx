import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { recordLessonViewed, type ViewedLesson } from "../../api/studentHomeApi";
import { useAuthStore } from "../../store/authStore";

/**
 * Theo dõi bài học học viên đang mở (đọc từ URL, không sửa trang của nhóm) và báo cho server,
 * để thẻ "Tiếp tục học" ở Trang chủ hiện đúng bài học lần cuối. Không hiển thị gì.
 *  - /courses/:courseId/chapters/:chapterId?skill=…&lessonId=… | &lessonNo=…
 *  - /listening/:lessonId
 *  - /ai-reading?lessonId=…
 */
function lessonFromUrl(pathname: string, search: string): ViewedLesson | null {
  const params = new URLSearchParams(search);
  const chapter = pathname.match(/^\/courses\/\d+\/chapters\/(\d+)\/?$/);
  if (chapter) {
    const lessonId = Number(params.get("lessonId"));
    if (lessonId > 0) return { lessonId };
    const skill = params.get("skill");
    const lessonNo = Number(params.get("lessonNo"));
    if (skill && lessonNo > 0) return { chapterId: Number(chapter[1]), skill: skill.toUpperCase(), lessonNo };
    return null;
  }
  const listening = pathname.match(/^\/listening\/(\d+)\/?$/);
  if (listening) return { lessonId: Number(listening[1]) };
  if (/^\/ai-reading\/?$/.test(pathname)) {
    const lessonId = Number(params.get("lessonId"));
    return lessonId > 0 ? { lessonId } : null;
  }
  return null;
}

export function LastLessonTracker() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const cache = useQueryClient();
  const lastSent = useRef("");

  const role = user?.role?.trim().toUpperCase();
  const isStudent = role === "STUDENT" || role === "ROLE_STUDENT" || (!role && String(user?.roleId ?? "") === "1");
  const active = isStudent && user?.status?.toUpperCase() === "ACTIVE";

  useEffect(() => {
    if (!active) return;
    const lesson = lessonFromUrl(location.pathname, location.search);
    if (!lesson) return;
    const key = JSON.stringify(lesson);
    if (key === lastSent.current) return; // cùng bài (đổi tab Tài liệu/Bài tập…) thì không gửi lại
    lastSent.current = key;
    recordLessonViewed(lesson)
      .then(() => cache.invalidateQueries({ queryKey: ["home-last-lesson"] }))
      .catch(() => {
        lastSent.current = ""; // lỗi mạng: lần mở sau thử lại, không làm phiền người học
      });
  }, [active, location.pathname, location.search, cache]);

  return null;
}
