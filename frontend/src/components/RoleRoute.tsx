import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import type { Role } from "../auth/types";

export function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const { principal } = useAuth();

  if (!principal || !allowedRoles.includes(principal.role)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
