import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { TeacherPracticeSessionItem, PracticeSessionData } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import {
  BarChart3,
  Search,
  Filter,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Award,
  Users,
  GraduationCap,
  Calendar,
  RotateCcw,
} from 'lucide-react';

export const TeacherPracticeResultsView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [sessions, setSessions] = useState<TeacherPracticeSessionItem[]>([]);
  const [summary, setSummary] = useState<{
    total_sessions: number;
    average_score: number;
    active_students_count: number;
  }>({
    total_sessions: 0,
    average_score: 0,
    active_students_count: 0,
  });

  // Filters
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Selected session detail for modal
  const [inspectModalOpen, setInspectModalOpen] = useState<boolean>(false);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [inspectedSession, setInspectedSession] = useState<PracticeSessionData | null>(null);

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const res: any = await api.get('/teacher/classes');
      if (res.success && res.data) {
        setClasses(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch classes', err);
    }
  };

  // Fetch overview data
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedSubjectId) params.subject_id = selectedSubjectId;

      const res: any = await api.get('/practice/teacher/overview', { params });
      if (res.success && res.data) {
        setSummary(res.data.summary);
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [selectedClassId, selectedSubjectId]);

  // Inspect student session modal
  const handleInspectSession = async (sessionId: number) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    try {
      const res: any = await api.get(`/practice/teacher/sessions/${sessionId}`);
      if (res.success && res.data) {
        setInspectedSession(res.data);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải chi tiết bài ôn luyện của học sinh.');
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  // Filtered by keyword
  const filteredSessions = sessions.filter((s) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(kw) ||
      s.student_email?.toLowerCase().includes(kw) ||
      s.class_name?.toLowerCase().includes(kw) ||
      s.title?.toLowerCase().includes(kw)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>Kết Quả Tự Ôn Luyện Của Học Sinh</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tiến độ, số lần tự rèn luyện và kết quả làm bài của học sinh theo từng lớp
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Tổng Lượt Tự Ôn Tập</span>
            <div className="text-2xl font-black text-slate-900">{summary.total_sessions}</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Điểm Số Trung Bình</span>
            <div className="text-2xl font-black text-emerald-700">{summary.average_score.toFixed(2)} đ</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Số Học Sinh Đã Ôn</span>
            <div className="text-2xl font-black text-amber-700">{summary.active_students_count}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
            >
              <option value="">Tất cả các lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
            >
              <option value="">Tất cả môn học</option>
              <option value="3">Hóa học</option>
              <option value="1">Toán học</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên học sinh..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Practice Sessions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Học Sinh</th>
                <th className="py-3.5 px-4">Lớp</th>
                <th className="py-3.5 px-4">Môn Học & Bài Ôn</th>
                <th className="py-3.5 px-4 text-center">Chế Độ</th>
                <th className="py-3.5 px-4 text-center">Kết Quả</th>
                <th className="py-3.5 px-4 text-center">Điểm Số</th>
                <th className="py-3.5 px-4 text-center">Ngày Hoàn Thành</th>
                <th className="py-3.5 px-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Đang tải danh sách bài ôn luyện của học sinh...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Chưa có học sinh nào hoàn thành bài tự ôn luyện theo điều kiện lọc này.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((row) => {
                  const score = Number(row.score || 0);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{row.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{row.student_email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{row.class_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 mr-2">
                          {row.subject_name}
                        </span>
                        <span className="text-slate-800 font-medium">{row.title}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            row.mode === 'interactive'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.mode === 'interactive' ? 'Tương Tác' : 'Thi Thử'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600">{row.total_correct}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-bold text-slate-700">{row.total_questions}</span>
                        <span className="text-[10px] text-slate-400 ml-1">câu</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                            score >= 8
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : score >= 5
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {score.toFixed(2)} đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                        {new Date(row.completed_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectSession(row.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 ml-auto transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Bài Làm</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT MODAL: Full Student Attempt View for Teacher */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Bài Tự Ôn Của: {inspectedSession?.student?.name || 'Học sinh'} ({inspectedSession?.student?.class_name || 'Lớp'})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectedSession?.title} • Điểm số:{' '}
                    <strong className="text-emerald-600">{Number(inspectedSession?.score || 0).toFixed(2)} đ</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {inspectLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Đang tải chi tiết bài làm...</div>
              ) : inspectedSession ? (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Số câu đúng</span>
                      <span className="text-lg font-black text-emerald-600">{inspectedSession.total_correct}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Số câu sai</span>
                      <span className="text-lg font-black text-rose-600">{inspectedSession.total_incorrect}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Chưa làm</span>
                      <span className="text-lg font-black text-amber-600">{inspectedSession.total_unanswered}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Điểm quy đổi (10đ)</span>
                      <span className="text-lg font-black text-indigo-700">
                        {Number(inspectedSession.score || 0).toFixed(2)} đ
                      </span>
                    </div>
                  </div>

                  {/* List of Questions */}
                  <div className="space-y-4">
                    {inspectedSession.questions.map((q, idx) => {
                      const isAnswered =
                        (q.student_selected_option_ids && q.student_selected_option_ids.length > 0) ||
                        (q.student_text_answer && q.student_text_answer.trim().length > 0);

                      return (
                        <div
                          key={q.id}
                          className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-900 text-xs">Câu {idx + 1}</span>
                            <div>
                              {q.is_correct ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Đúng (+1.0)
                                </span>
                              ) : isAnswered ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Sai
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Chưa trả lời
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="text-xs text-slate-800 leading-relaxed">
                            <MathRenderer content={q.content} />
                          </div>

                          {/* Options */}
                          {q.question_type === 'fill_in_blank' || q.question_type === 'short_answer' ? (
                            <div className="text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="font-semibold text-slate-600">Học sinh nhập: </span>
                              <span className="font-bold text-slate-900 font-mono">
                                {q.student_text_answer || '(Chưa nhập)'}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-1">
                              {q.options.map((opt, oIdx) => {
                                const optLetter = String.fromCharCode(65 + oIdx);
                                const isStudentChoice = q.student_selected_option_ids?.includes(opt.id);
                                const isCorrectOpt = opt.is_correct;

                                let style = 'bg-white border-slate-200';
                                if (isCorrectOpt) {
                                  style = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold';
                                } else if (isStudentChoice && !isCorrectOpt) {
                                  style = 'bg-rose-50 border-rose-300 text-rose-950';
                                }

                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${style}`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span
                                        className={`w-5 h-5 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                          isCorrectOpt
                                            ? 'bg-emerald-600 text-white'
                                            : isStudentChoice
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {optLetter}
                                      </span>
                                      <div className="pt-0.5">
                                        <MathRenderer content={opt.content} />
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1 font-bold text-[11px]">
                                      {isCorrectOpt && (
                                        <span className="text-emerald-700 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          Đáp án đúng
                                        </span>
                                      )}
                                      {isStudentChoice && !isCorrectOpt && (
                                        <span className="text-rose-600 flex items-center gap-1">
                                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                          Học sinh chọn
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation */}
                          {q.explanation && (
                            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                              <span className="font-bold text-amber-900 block text-[11px]">
                                💡 Lời giải chi tiết:
                              </span>
                              <div className="text-slate-800">
                                <MathRenderer content={q.explanation} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TeacherPracticeResultsView;
