import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recordCompletion, type LearningContentType } from "../../api/progressApi";
import { useAuthStore } from "../../store/authStore";
import "../../pages/streak/StudentStreakPage.css";

export function LearningCompletionButton({ contentType, contentId }: { contentType: LearningContentType; contentId: number }) {
  const user = useAuthStore(s => s.user);
  const cache = useQueryClient();
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const role = user?.role?.trim().toUpperCase();
  const isStudent = role === "STUDENT" || role === "ROLE_STUDENT" || (!role && String(user?.roleId) === "1");
  if (!isStudent || user?.status?.toUpperCase() !== "ACTIVE") return null;
  async function complete() {
    setState("saving");
    try {
      await recordCompletion(contentType, contentId);
      setState("done");
      for (const key of ["streak", "coin-history", "store-catalog"]) void cache.invalidateQueries({ queryKey: [key] });
    } catch { setState("error"); }
  }
  return <div className="learning-completion">
    <button type="button" disabled={state === "saving" || state === "done"} onClick={complete}>
      {state === "saving" ? "Đang lưu…" : state === "done" ? "Đã ghi nhận" : "Hoàn thành nội dung"}
    </button>
    {state === "done" && <p role="status">Đã ghi nhận hoạt động học của bạn.</p>}
    {state === "error" && <p role="alert">Chưa lưu được kết quả. Vui lòng thử lại.</p>}
  </div>;
}
