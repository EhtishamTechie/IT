import { Navigate } from "react-router-dom";
import { useAdmin } from "../contexts/AdminContext";

const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuthenticated, loading, adminUser } = useAdmin();

  // Show faster, simpler loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user has admin role
  if (!adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
