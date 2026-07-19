import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import AppLayout from './Layout/AppLayout.jsx';
import Login from './Pages/Login.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import InterviewRoom from './Pages/InterviewRoom.jsx';
import PlacementBot from './Pages/PlacementBot.jsx';

/**
 * Redirects to /login if no auth token is present.
 */
function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  if (!auth?.token) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Route map for the NilGen SPA.
 *
 * `/interview` is deliberately kept OUTSIDE <AppLayout>: an active mock
 * interview is a focused, full-bleed experience and shouldn't compete
 * with sidebar navigation. Dashboard and Placement share the AppLayout
 * shell (sidebar + content frame).
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/placement" element={<PlacementBot />} />
        </Route>

        <Route
          path="/interview"
          element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>}
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
