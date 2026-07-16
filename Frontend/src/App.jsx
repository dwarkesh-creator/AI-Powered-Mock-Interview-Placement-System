import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './Layout/AppLayout.jsx';
import Login from './Pages/Login.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import InterviewRoom from './Pages/InterviewRoom.jsx';
import PlacementBot from './Pages/PlacementBot.jsx';

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
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/placement" element={<PlacementBot />} />
      </Route>

      <Route path="/interview" element={<InterviewRoom />} />

      {/* No auth guard yet — wire up a ProtectedRoute once /login talks
          to a real backend. Until then, everything is reachable. */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
