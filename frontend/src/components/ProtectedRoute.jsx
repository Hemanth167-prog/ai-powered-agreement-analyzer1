import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import BackgroundGraphics from "./BackgroundGraphics.jsx";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-ink relative">
      <BackgroundGraphics />
      <div className="relative z-10 flex w-full">
        <Sidebar />
        <main className="flex-1 px-10 py-8 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
