import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
export function StudentProtectedRoute({children}:{children:ReactNode}) {
 const user=useAuthStore(s=>s.user);
 const role=user?.role?.trim().toUpperCase();
 const student=role==="STUDENT"||role==="ROLE_STUDENT"||(!role&&String(user?.roleId)==="1");
 return student&&user?.status?.toUpperCase()==="ACTIVE"?<>{children}</>:<Navigate to="/home" replace/>;
}
