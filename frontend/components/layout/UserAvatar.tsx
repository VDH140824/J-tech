import { useEquipmentStore } from "../../store/equipmentStore";
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
  const equipment = useEquipmentStore((s) => s.items);
  const avatar = equipment.find((i) => i.item_type === "AVATAR" && i.is_equipped);
  const frame = equipment.find((i) => i.item_type === "AVATAR_FRAME" && i.is_equipped);
  const badge = equipment.find((i) => i.item_type === "BADGE" && i.is_equipped);
  const displayName = user?.displayName ?? user?.email ?? "";
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "H";

  const customStyle: React.CSSProperties = size
    ? { width: size, height: size, fontSize: `${size * 0.45}px` }
    : {};

  return (
    <div
      className={`user-avatar-circle ${className}`}
      style={{ ...customStyle, position: "relative", overflow: "visible" }}
    >
      {avatar?.image_url || user?.avatarUrl ? (
        <img
          src={avatar?.image_url || user?.avatarUrl || undefined}
          alt={displayName || "User Avatar"}
          className="user-avatar-img"
        />
      ) : (
        <span>{avatarInitial}</span>
      )}
      {frame && (
        <img
          src={frame.image_url}
          alt={frame.name}
          style={{
            position: "absolute",
            inset: "-18%",
            width: "136%",
            height: "136%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}
      {badge && (
        <img
          src={badge.image_url}
          alt={badge.name}
          title={badge.name}
          style={{
            position: "absolute",
            right: "-24%",
            top: "-24%",
            width: "78%",
            height: "78%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
