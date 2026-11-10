import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Users, GraduationCap, FileQuestion, ClipboardList, CheckCircle2, TrendingUp, School } from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res: any = await api.get('/reports/dashboard');
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Đang tải số liệu thống kê...</div>;
  }

  const statCards = [
    { label: 'Trường học', value: stats?.total_schools || 0, icon: School, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Giáo viên', value: stats?.total_teachers || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Học sinh', value: stats?.total_students || 0, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Lớp học', value: stats?.total_classes || 0, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Ngân hàng câu hỏi', value: stats?.total_questions || 0, icon: FileQuestion, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Đề thi đã tạo', value: stats?.total_exams || 0, icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Tổng lượt làm bài', value: stats?.total_attempts || 0, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bảng Điều Khiển Quản Trị Hệ Thống</h1>
        <p className="text-sm text-slate-500 mt-1">Giám sát toàn bộ hoạt động thi cử, cơ cấu trường lớp và người dùng</p>
      </div>

      {/* Grid thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Danh sách lượt nộp bài gần đây */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Lượt nộp bài thi gần đây (Realtime Feed)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Thí sinh</th>
                <th className="px-6 py-3">Bài thi</th>
                <th className="px-6 py-3">Điểm số</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Thời điểm nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recent_attempts?.length > 0 ? (
                stats.recent_attempts.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.student_name}</td>
                    <td className="px-6 py-3.5">{item.exam_title}</td>
                    <td className="px-6 py-3.5 font-bold text-indigo-600">{item.score !== null ? `${item.score} đ` : 'Đang chấm'}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">{item.submitted_at}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Chưa có lượt nộp bài nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
