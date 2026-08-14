import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  CheckSquare,
  Briefcase,
  HelpCircle,
  Mic,
  LogOut,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ onLogout, user }) {
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload & Parse', icon: UploadCloud },
    { path: '/corrections', label: 'Resume Corrections', icon: CheckSquare },
    { path: '/jobs', label: 'Open Job Roles', icon: Briefcase },
    { path: '/questions', label: 'Question Bank', icon: HelpCircle },
    { path: '/interview', label: 'AI Mock Interview', icon: Mic, badge: 'Live AI' },
  ];

  const getInitials = (name) => {
    if (!name) return 'CD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 min-h-screen flex flex-col justify-between p-4 shadow-2xl border-r border-slate-800/80 select-none z-20">
      <div>
        {/* Brand Header */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-slate-800/80 cursor-pointer"
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-sky-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-600/30">
            H
          </div>
          <div>
            <h1 className="text-white font-extrabold tracking-tight text-base flex items-center gap-1.5">
              HackaKnight
              <Sparkles className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Recruitment Assistant</p>
          </div>
        </div>

        {/* Route Links using NavLink */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Main Menu
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className='flex justify-center items-center'>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-500/10 text-sky-400 border border-blue-500/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-inner flex-shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate max-w-[100px]">
                {user?.name || 'Candidate'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                {user?.email || 'Active Candidate'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}