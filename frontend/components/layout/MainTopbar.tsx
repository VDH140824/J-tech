import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { getStreakSummary } from "../../api/streakApi";
import { getCoinBalance } from "../../api/studentHomeApi";
import { useAuthStore } from "../../store/authStore";
import "./MainTopbar.css";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

interface MainTopbarProps {
  onSearch?: (query: string) => void;
}

export function MainTopbar({ onSearch }: MainTopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const role = user?.role?.trim().toUpperCase();
  const isStudent =
    user?.status?.toUpperCase() === "ACTIVE" &&
    (role === "STUDENT" ||
      role === "ROLE_STUDENT" ||
      (!role && String(user?.roleId ?? "") === "1"));
  const streak = useQuery({
    queryKey: ["progress-streak", user?.id],
    queryFn: getStreakSummary,
    enabled: isStudent,
  });
  const coins = useQuery({
    queryKey: ["home-coin-balance", user?.id],
    queryFn: getCoinBalance,
    enabled: isStudent,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="dekiru-topbar">
      <div className="topbar-search">
        <svg className="search-icon" width="18" height="18" {...iconProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="text"
          placeholder="Tìm bài học, từ vựng, ngữ pháp…"
          aria-label="Tìm kiếm"
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="topbar-actions">
        {isStudent && (
          <>
            <Link
              to="/streak"
              className="topbar-chip topbar-chip--streak"
              title="Chuỗi ngày học"
            >
              <svg width="16" height="16" {...iconProps}>
                <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z" />
              </svg>
              {streak.data?.currentStreak ?? 0} ngày
            </Link>
            <Link
              to="/coins"
              className="topbar-chip topbar-chip--coin"
              title="Lịch sử xu"
            >
              <svg width="16" height="16" {...iconProps}>
                <circle cx="12" cy="12" r="8" />
                <path d="M9.5 10a2.5 2 0 0 1 5 0c0 2.5-5 1.5-5 4a2.5 2 0 0 0 5 0M12 6v2M12 16v2" />
              </svg>
              {(coins.data ?? 0).toLocaleString("vi-VN")} xu
            </Link>
          </>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="icon-btn notif-btn"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <svg className="bell-icon" width="18" height="18" {...iconProps}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4" />
          </svg>
          <span className="notif-badge-dot" />
        </button>

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
