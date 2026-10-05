import { useState } from "react";
import { UserMenu } from "./UserMenu";
import "./MainTopbar.css";

interface MainTopbarProps {
  onSearch?: (query: string) => void;
}

export function MainTopbar({ onSearch }: MainTopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="dekiru-topbar">
      <div className="topbar-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kiếm bài học, từ vựng, ngữ pháp..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="topbar-actions">
        {/* Notification Bell */}
        <button type="button" className="icon-btn notif-btn" title="Thông báo">
          <span className="bell-icon">🔔</span>
          <span className="notif-badge-dot" />
        </button>

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
