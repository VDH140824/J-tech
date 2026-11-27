import { useQuery } from "@tanstack/react-query";
import { getSystemAnnouncement } from "../../api/systemSettingApi";
import "../../pages/admin/AdminSystemSettingsPage.css";

export function SystemAnnouncement() {
  const query = useQuery({
    queryKey: ["system-announcement"],
    queryFn: ({ signal }) => getSystemAnnouncement(signal),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  if (query.isError || !query.data?.enabled) return null;
  return <aside className="system-announcement" role="status" aria-label="Thông báo hệ thống">
    <strong>{query.data.title}</strong><p>{query.data.content}</p>
  </aside>;
}
