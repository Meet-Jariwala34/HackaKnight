import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Pages
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import ResumeCorrections from './pages/ResumeCorrections';
import OpenJobs from './pages/OpenJobs';
import MockInterview from './pages/MockInterview';

// Layout Component for Authenticated Pages
function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-8 flex-1 overflow-y-auto">
          {/* Outlet renders the matched child page */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 1. Public Auth Route */}
      <Route
        path="/auth"
        element={!isAuthenticated ? <Auth/> : <Navigate to="/dashboard" replace />}
      />

      {/* 2. Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<ResumeUpload />} />
        <Route path="/corrections" element={<ResumeCorrections />} />
        <Route path="/jobs" element={<OpenJobs />} />
        <Route path="/interview" element={<MockInterview />} />
      </Route>

      {/* 3. Fallbacks */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}