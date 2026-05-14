import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Auth
import Landing from './pages/auth/Landing';
import AdminLogin from './pages/auth/AdminLogin';
import GestureLogin from './pages/auth/GestureLogin';
import SetPassword from './pages/auth/SetPassword';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageGestures from './pages/admin/ManageGestures';
import ManageUsers from './pages/admin/ManageUsers';
import ManagePages from './pages/admin/ManagePages';
import ManageCommands from './pages/admin/ManageCommands';
import ManageMappings from './pages/admin/ManageMappings';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// User (previously "Operator")
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorBalance from './pages/operator/OperatorBalance';
import OperatorSetLimit from './pages/operator/OperatorSetLimit';
import OperatorCards from './pages/operator/OperatorCards';
import OperatorCardActions from './pages/operator/OperatorCardActions';

// Viewer
import ViewerDashboard from './pages/viewer/ViewerDashboard';
import ViewerLogs from './pages/viewer/ViewerLogs';
import ViewerAnalytics from './pages/viewer/ViewerAnalytics';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/login/gesture" element={<GestureLogin />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/gestures"  element={<ProtectedRoute allowedRole="admin"><ManageGestures /></ProtectedRoute>} />
            <Route path="/admin/users"     element={<ProtectedRoute allowedRole="admin"><ManageUsers /></ProtectedRoute>} />
            <Route path="/admin/pages"     element={<ProtectedRoute allowedRole="admin"><ManagePages /></ProtectedRoute>} />
            <Route path="/admin/commands"  element={<ProtectedRoute allowedRole="admin"><ManageCommands /></ProtectedRoute>} />
            <Route path="/admin/mappings"  element={<ProtectedRoute allowedRole="admin"><ManageMappings /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRole="admin"><AdminAnalytics /></ProtectedRoute>} />

            {/*
              User routes (role still stored as "operator" in auth for backward compatibility,
              but UI labels now say "User" — see Feature 2.5 of implementation plan).
              OperatorDashboard should display: "Welcome to SignBank, User {userId}" (Feature 2.6).
            */}
            <Route path="/operator/dashboard"              element={<ProtectedRoute allowedRole="operator"><OperatorDashboard /></ProtectedRoute>} />
            <Route path="/operator/balance"                element={<ProtectedRoute allowedRole="operator"><OperatorBalance /></ProtectedRoute>} />
            <Route path="/operator/set-limit/:cardType"    element={<ProtectedRoute allowedRole="operator"><OperatorSetLimit /></ProtectedRoute>} />
            <Route path="/operator/cards"                  element={<ProtectedRoute allowedRole="operator"><OperatorCards /></ProtectedRoute>} />
            <Route path="/operator/card-actions/:cardType" element={<ProtectedRoute allowedRole="operator"><OperatorCardActions /></ProtectedRoute>} />

            {/* Viewer */}
            <Route path="/viewer/dashboard" element={<ProtectedRoute allowedRole="viewer"><ViewerDashboard /></ProtectedRoute>} />
            <Route path="/viewer/logs"      element={<ProtectedRoute allowedRole="viewer"><ViewerLogs /></ProtectedRoute>} />
            <Route path="/viewer/analytics" element={<ProtectedRoute allowedRole="viewer"><ViewerAnalytics /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
