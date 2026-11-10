import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Users, GraduationCap, FileQuestion, ClipboardList, Send, Plus, BarChart2 } from 'lucide-react';

export const TeacherDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    return <div className="text-center py-12 text-slate-500 text-xs">Đang tải bàn làm việc giáo viên...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bàn Làm Việc Giáo Viên</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý lớp học, biên soạn ngân hàng câu hỏi và tổ chức kỳ thi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/teacher/questions')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Soạn Câu Hỏi</span>
          </button>
          <button
            onClick={() => navigate('/teacher/exams')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Quản Lý Đề Thi</span>
          </button>
        </div>
      </div>

      {/* Cards thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp phụ trách</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.assigned_classes_count || 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số học sinh</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_students || 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Câu hỏi đã soạn</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.created_questions_count || 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đề thi đã tạo</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.created_exams_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Thông tin phòng thi đang mở */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Kỳ thi đang diễn ra trực tuyến</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hiện tại có <span className="font-bold text-indigo-600">{stats?.active_assignments || 0}</span> kỳ thi đang mở cho học sinh làm bài
          </p>
        </div>
        <button
          onClick={() => navigate('/teacher/exams')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors shrink-0 w-full sm:w-auto justify-center"
        >
          <span>Xem chi tiết kỳ thi</span>
        </button>
      </div>
    </div>
  );
};
