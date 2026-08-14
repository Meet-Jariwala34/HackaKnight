import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import ResumeCorrections from './pages/ResumeCorrections';
import OpenJobs from './pages/OpenJobs';
import ResumeUpload from './pages/ResumeUpload';
import MockInterview from './pages/MockInterview';

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/auth');
  };

  // If user is unauthenticated, enforce login route
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // Format header title based on current pathname
  const currentTitle = location.pathname.replace('/', '') || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {currentTitle.replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-600">
              Welcome, <strong className="text-blue-600">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Route Canvas */}
        <div className="p-8 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/upload" element={<ResumeUpload user={user} />} />
            <Route path="/corrections" element={<ResumeCorrections user={user} />} />
            <Route path="/jobs" element={<OpenJobs user={user} />} />
            <Route path="/questions" element={<div className="p-6 bg-white rounded-xl border border-slate-200">Question Bank Component</div>} />
            <Route path="/interview" element={<MockInterview user={user} />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}