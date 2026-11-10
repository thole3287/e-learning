import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { MathRenderer } from '../../components/math/MathRenderer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Users, Award, AlertTriangle, TrendingDown } from 'lucide-react';

export const ExamAnalyticsView: React.FC = () => {
  const { examId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res: any = await api.get(`/exams/${examId}/analytics`);
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [examId]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs">Đang phân tích dữ liệu bài thi...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500 text-xs">Không tìm thấy thông tin đề thi</div>;
  }

  const chartData = [
    { name: 'Kém (<4.0)', count: data.distribution.poor, color: '#f43f5e' },
    { name: 'Trung bình (4.0-6.5)', count: data.distribution.average, color: '#f59e0b' },
    { name: 'Khá (6.5-8.0)', count: data.distribution.good, color: '#3b82f6' },
    { name: 'Giỏi (8.0-10.0)', count: data.distribution.excellent, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher/exams')}
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Báo Cáo Phổ Điểm & Phân Tích Bài Thi</h1>
          <p className="text-xs text-slate-500 mt-0.5">{data.title}</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng số lượt nộp</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_submissions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Điểm Trung Bình</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{data.average_score} đ</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cao nhất / Thấp nhất</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.highest_score} / {data.lowest_score}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ Đạt yêu cầu</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{data.pass_rate}%</p>
        </div>
      </div>

      {/* Biểu đồ Recharts */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm">Biểu Đồ Phân Phối Phổ Điểm Thí Sinh</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Item Analysis (Phân tích câu hỏi sai nhiều) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">Phân Tích Câu Hỏi Có Tỷ Lệ Sai Cao (Item Analysis)</h3>
          </div>
          <span className="text-xs text-slate-400">Giúp giáo viên nắm lỗ hổng kiến thức để bồi dưỡng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Câu số</th>
                <th className="px-6 py-3.5">Nội dung tóm tắt</th>
                <th className="px-6 py-3.5">Mức độ</th>
                <th className="px-6 py-3.5">Số lượt đúng / Tổng</th>
                <th className="px-6 py-3.5 text-right">Tỷ lệ trả lời sai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.item_analysis?.length > 0 ? (
                data.item_analysis.map((item: any) => (
                  <tr key={item.question_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900">Câu {item.order_index}</td>
                    <td className="px-6 py-3.5 max-w-md">
                      <MathRenderer content={item.content_preview} />
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        Mức {item.difficulty_level}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {item.correct_answers} / {item.total_answers}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        item.error_rate > 50 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.error_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Chưa có dữ liệu phân tích câu hỏi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
