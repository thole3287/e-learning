import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, UserCheck, Menu } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar }) => {
  const { user } = useAuth();

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Quản trị viên</span>
            <span className="sm:hidden">Admin</span>
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
            <UserCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Giáo viên</span>
            <span className="sm:hidden">GV</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            <span className="hidden sm:inline">Học sinh</span>
            <span className="sm:hidden">HS</span>
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
          {title || 'Hệ thống Quản lý Thi'}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {getRoleBadge()}
        <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1" />
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">{user?.full_name}</p>
          <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{user?.email}</p>
        </div>
      </div>
    </header>
  );
};
