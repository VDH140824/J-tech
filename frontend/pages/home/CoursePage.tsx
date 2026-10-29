import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { checkIsModerator } from "../../utils/auth";
import { ModeratorCoursesTab } from "../moderator/ModeratorCoursesTab";
import "./StudentLearningPage.css";

export function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const id = Number(courseId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const user = useAuthStore(state => state.user);

  if (valid && checkIsModerator(user)) return <Navigate to={`/moderator/courses?courseId=${id}`} replace />;

  return <div className="student-learning-page">
    {!valid ? <p role="alert">Mã môn học không hợp lệ.</p>
      : <ModeratorCoursesTab readOnly initialCourseId={id}
        onViewChapter={({ courseId: selectedCourse, chapterId }) => navigate(`/courses/${selectedCourse}/chapters/${chapterId}`)} />}
  </div>;
}
