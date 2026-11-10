import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileQuestion,
  ClipboardList,
  BarChart3,
  LogOut,
  PenTool,
  X,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getNavLinks = () => {
    if (user.role === 'super_admin') {
      return [
        { to: '/admin/dashboard', label: 'Tổng quan hệ thống', icon: LayoutDashboard },
        { to: '/admin/users', label: 'Quản lý Người dùng', icon: Users },
        { to: '/admin/classes', label: 'Quản lý Trường & Lớp', icon: GraduationCap },
        { to: '/teacher/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion },
        { to: '/teacher/exams', label: 'Quản lý Đề thi', icon: ClipboardList },
        { to: '/teacher/practice-results', label: 'Kết quả tự ôn luyện', icon: BarChart3 },
      ];
    }

    if (user.role === 'teacher') {
      return [
        { to: '/teacher/dashboard', label: 'Bàn làm việc Giáo viên', icon: LayoutDashboard },
        { to: '/teacher/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion },
        { to: '/teacher/exams', label: 'Quản lý Đề thi', icon: ClipboardList },
        { to: '/teacher/practice-results', label: 'Kết quả tự ôn luyện', icon: BarChart3 },
        { to: '/teacher/classes', label: 'Lớp học phụ trách', icon: GraduationCap },
      ];
    }

    // Student role
    return [
      { to: '/student/dashboard', label: 'Bài thi của tôi', icon: PenTool },
      { to: '/student/practice', label: 'Tự ôn luyện kiến thức', icon: BookOpen },
      { to: '/student/history', label: 'Lịch sử học tập', icon: BarChart3 },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Desktop static, Mobile slide-over drawer */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-10 h-screen w-72 lg:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/30">
              E
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-base">E-EXAM</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Testing Platform</p>
            </div>
          </div>

          {/* Close button on Mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Điều Hướng
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.full_name}</p>
              <p className="text-[11px] text-indigo-400 capitalize truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-900/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};
