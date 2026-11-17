export interface SystemSettings {
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementContent: string;
  learningReminderEnabled: boolean;
  feedbackEmailEnabled: boolean;
}

export interface SystemSettingResponse {
  settings: SystemSettings;
  updatedBy: number | null;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface SystemAnnouncementData {
  enabled: boolean;
  title: string;
  content: string;
}
