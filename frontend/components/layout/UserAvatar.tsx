import type React from "react";
import "./UserAvatar.css";

interface UserAvatarProps {
  user?: {
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  className?: string;
  size?: number;
}

export function UserAvatar({ user, className = "", size }: UserAvatarProps) {
  const displayName = user?.displayName ?? user?.email ?? "";
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "H";

  const customStyle: React.CSSProperties = size
    ? { width: size, height: size, fontSize: `${size * 0.45}px` }
    : {};

  return (
    <div className={`user-avatar-circle ${className}`} style={customStyle}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={displayName || "User Avatar"}
          className="user-avatar-img"
        />
      ) : (
        <span>{avatarInitial}</span>
      )}
    </div>
  );
}
