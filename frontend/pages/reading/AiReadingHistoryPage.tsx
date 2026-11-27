import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAiReadingHistory } from "../../api/aiReadingApi";
import { stripFurigana } from "../../utils/furigana";
import { scopeLabel } from "../../utils/scopeLabel";
import "./AiReadingPage.css";

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

export function AiReadingHistoryPage() {
  const [page, setPage] = useState(0);
  const history = useQuery({
    queryKey: ["ai-reading-history", page],
    queryFn: () => getAiReadingHistory(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const totalPages = Math.max(1, Math.ceil((history.data?.total ?? 0) / PAGE_SIZE));

  return (
    <main className="reading-history">
      <Link className="reading-history-link" to="/ai-reading">
        ← Tạo bài đọc mới
      </Link>
      <h1>Lịch sử đọc hiểu AI</h1>
      {history.isLoading ? (
        <p className="reading-state" role="status">
          Đang tải lịch sử…
        </p>
      ) : history.isError ? (
        <div className="reading-error" role="alert">
          <p>Không tải được lịch sử. Vui lòng thử lại.</p>
        </div>
      ) : !history.data?.items.length ? (
        <p className="reading-state">Bạn chưa tạo bài đọc nào.</p>
      ) : (
        <>
          <ul>
            {history.data.items.map((item) => (
              <li key={item.id}>
                <Link to={`/ai-reading?session=${item.id}`}>
                  <span className="reading-history-title">
                    <strong lang="ja">{stripFurigana(item.title)}</strong>
                    <span className="reading-history-sub">
                      {scopeLabel(item.courseName, item.chapterNo)} · {formatDate(item.createdAt)}
                    </span>
                  </span>
                  <span className="reading-history-score">
                    {item.status === "SUBMITTED"
                      ? `${item.correctCount}/${item.totalQuestions} câu đúng`
                      : "Chưa nộp"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="reading-pager" aria-label="Phân trang">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                ← Trước
              </button>
              <span>
                Trang {page + 1}/{totalPages}
              </span>
              <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
