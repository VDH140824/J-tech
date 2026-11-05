import { RewardEquipment } from "../components/layout/RewardEquipment";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { FeedbackPage } from "../pages/feedback/FeedbackPage";
import { MainSidebar } from "../components/layout/MainSidebar";
import { MainTopbar } from "../components/layout/MainTopbar";
import { useCurrentUser } from "../hooks/useAuth";
import "./MainLayout.css";

export function MainLayout() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  // Keep current user info hydrated for all authenticated pages under MainLayout
  useCurrentUser();

  return (
    <div className="dekiru-app-container">
      <RewardEquipment />
      <MainSidebar onOpenFeedback={() => { setFeedbackNotice(""); setFeedbackOpen(true); }} />
      <div className="dekiru-main-area">
        <MainTopbar />
        <main className="main-layout-page">
          {feedbackNotice && <div className="feedback-success" role="status">
            {feedbackNotice} <button type="button" onClick={() => setFeedbackNotice("")}>Đóng</button>
          </div>}
          <Outlet />
        </main>
      </div>
      {feedbackOpen && <FeedbackPage onPopupClose={message => {
        setFeedbackOpen(false);
        if (message) setFeedbackNotice(message);
      }} />}
    </div>
  );
}
