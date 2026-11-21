import React, { useEffect, useState } from 'react';
import { VisitStats, recordVisit, subscribeVisitStats } from '../../services/visitTracker';
import { Eye, Users, Calendar, Activity } from 'lucide-react';

interface VisitorBadgeProps {
  variant?: 'bar' | 'sidebar' | 'pill' | 'card';
  className?: string;
}

export const VisitorBadge: React.FC<VisitorBadgeProps> = ({ variant = 'bar', className = '' }) => {
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    // Đăng ký nhận cập nhật lượt truy cập
    const unsubscribe = subscribeVisitStats((s) => setStats(s));
    recordVisit();

    // Định kỳ 3 phút cập nhật lại online count
    const interval = setInterval(() => {
      recordVisit();
    }, 3 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!stats) return null;

  // Variant 1: Thanh Bar ở Footer (Login, Trang công khai, Chân trang Dashboard)
  if (variant === 'bar') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2.5 px-4 rounded-xl text-xs bg-slate-900/80 border border-slate-800 text-slate-300 shadow-sm backdrop-blur-xs ${className}`}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Tổng lượt truy cập:</span>
          <span className="font-bold text-white font-mono">{stats.total_visits.toLocaleString()}</span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Hôm nay:</span>
          <span className="font-semibold text-emerald-300 font-mono">{stats.today_visits.toLocaleString()}</span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Hôm qua:</span>
          <span className="font-semibold text-slate-300 font-mono">{stats.yesterday_visits.toLocaleString()}</span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-400">Đang online:</span>
          <span className="font-bold text-emerald-400 font-mono">{stats.online_visitors}</span>
        </div>
      </div>
    );
  }

  // Variant 2: Sidebar Footer (gọn gàng trong menu bên trái)
  if (variant === 'sidebar') {
    return (
      <div className={`p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Lượt truy cập:
          </span>
          <span className="font-mono font-bold text-white">{stats.total_visits.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
          <span>Hôm nay: <strong className="text-emerald-400">{stats.today_visits}</strong></span>
          <span className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Online: <strong className="text-emerald-400">{stats.online_visitors}</strong>
          </span>
        </div>
      </div>
    );
  }

  // Variant 3: Compact Pill (cho Header hoặc thanh trạng thái)
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 ${className}`}
        title={`Tổng: ${stats.total_visits.toLocaleString()} | Hôm nay: ${stats.today_visits} | Hôm qua: ${stats.yesterday_visits}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">Online:</span>
        <strong className="text-emerald-700 font-mono">{stats.online_visitors}</strong>
        <span className="text-slate-300">•</span>
        <Eye className="w-3 h-3 text-slate-400" />
        <strong className="font-mono text-slate-800">{stats.total_visits.toLocaleString()}</strong>
      </div>
    );
  }

  // Variant 4: Card lớn trong Dashboard
  return (
    <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lượt truy cập hôm nay</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">{stats.today_visits.toLocaleString()}</span>
            <span className="text-xs text-slate-500">
              (Tổng: <strong className="text-indigo-600">{stats.total_visits.toLocaleString()}</strong>)
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{stats.online_visitors} Online</span>
        </div>
      </div>
    </div>
  );
};
