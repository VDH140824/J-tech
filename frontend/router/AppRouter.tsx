import { StudentProtectedRoute } from "../components/auth/StudentProtectedRoute";
import { StudentStreakPage } from "../pages/streak/StudentStreakPage";
import { CoinHistoryPage } from "../pages/store/CoinHistoryPage";
import { RewardStorePage } from "../pages/store/RewardStorePage";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { LandingPage } from "../pages/landing/LandingPage";
import { OAuth2RedirectPage } from "../pages/auth/OAuth2RedirectPage";
import { PendingApprovalPage } from "../pages/auth/PendingApprovalPage";
import { AccountRejectedPage } from "../pages/auth/AccountRejectedPage";
import { HomePage } from "../pages/home/HomePage";
import { CoursePage } from "../pages/home/CoursePage";
import { ChapterPage } from "../pages/home/ChapterPage";
import { BackgroundMusic } from "../components/ui/BackgroundMusic";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "../components/auth/AdminProtectedRoute";
import { ModeratorProtectedRoute } from "../components/auth/ModeratorProtectedRoute";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { AdminPortalPage } from "../pages/admin/AdminPortalPage";
import { ModeratorPortalPage } from "../pages/moderator/ModeratorPortalPage";
import { MainLayout } from "../layouts/MainLayout";
import { FeedbackPage } from "../pages/feedback/FeedbackPage";
import { StudentClassPostListPage } from "../pages/classroom/StudentClassPostListPage";
import { StudentPostListPage } from "../pages/classroom/StudentPostListPage";
import { PostDetailPage } from "../pages/classroom/PostDetailPage";

export function AppRouter() {
  return (
    <>
      <BackgroundMusic />
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<LandingPage />}
        />
        <Route
          path="/login"
          element={<LoginPage />}
        />
        <Route
          path="/oauth2/redirect"
          element={<OAuth2RedirectPage />}
        />
        <Route
          path="/pending-approval"
          element={<PendingApprovalPage />}
        />
        <Route
          path="/account-rejected"
          element={<AccountRejectedPage />}
        />

        {/* Authenticated main application routes sharing MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/home"
            element={<HomePage />}
          />
          <Route
            path="/courses/:courseId"
            element={<CoursePage />}
          />
          <Route
            path="/courses/:courseId/chapters/:chapterId"
            element={<ChapterPage />}
          />
          <Route
            path="/profile"
            element={<ProfilePage />}
          />
          <Route
            path="/feedback"
            element={
              <StudentProtectedRoute>
                <FeedbackPage />
              </StudentProtectedRoute>
            }
          />
          <Route path="/classes" element={<StudentProtectedRoute><StudentClassPostListPage /></StudentProtectedRoute>} />
          <Route path="/classes/:classId/posts" element={<StudentProtectedRoute><StudentPostListPage /></StudentProtectedRoute>} />
          <Route path="/classes/:classId/posts/:postId" element={<StudentProtectedRoute><PostDetailPage portal="student" /></StudentProtectedRoute>} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/store"
            element={
              <StudentProtectedRoute>
                <RewardStorePage />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <StudentProtectedRoute>
                <RewardStorePage />
              </StudentProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/coins"
          element={
            <ProtectedRoute>
              <StudentProtectedRoute>
                <MainLayout />
              </StudentProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<CoinHistoryPage />}
          />
        </Route>
        <Route
          path="/streak"
          element={
            <ProtectedRoute>
              <StudentProtectedRoute>
                <MainLayout />
              </StudentProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<StudentStreakPage />}
          />
        </Route>
        {/* Admin routes (Admin has its own dedicated portal layout) */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminPortalPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminPortalPage />
            </AdminProtectedRoute>
          }
        />

        {/* Moderator routes (Moderator has its own dedicated portal layout) */}
        <Route
          path="/moderator"
          element={
            <ModeratorProtectedRoute>
              <ModeratorPortalPage />
            </ModeratorProtectedRoute>
          }
        />
        <Route
          path="/moderator/courses"
          element={
            <ModeratorProtectedRoute>
              <ModeratorPortalPage />
            </ModeratorProtectedRoute>
          }
        />
        <Route
          path="/moderator/courses/:courseId/chapters/:chapterId"
          element={
            <ModeratorProtectedRoute>
              <ModeratorPortalPage />
            </ModeratorProtectedRoute>
          }
        />
        <Route
          path="/moderator/*"
          element={
            <ModeratorProtectedRoute>
              <ModeratorPortalPage />
            </ModeratorProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/home"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}
