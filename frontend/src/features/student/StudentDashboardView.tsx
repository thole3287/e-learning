import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { StudentExamItem } from '../../types';
import { PenTool, Clock, Award, CheckCircle2, ArrowRight, AlertCircle, Eye, Sparkles, BookOpen } from 'lucide-react';

export const StudentDashboardView: React.FC = () => {
  const [exams, setExams] = useState<StudentExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/student/exams');
      if (res.success) {
        setExams(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleStartExam = (assignmentId: number) => {
    navigate(`/exam/room/${assignmentId}`);
  };

  const handleViewResult = (attemptId?: number) => {
    if (attemptId) {
      navigate(`/exam/result/${attemptId}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bài Kiểm Tra Của Tôi</h1>
        <p className="text-sm text-slate-500 mt-1">Danh sách các bài thi trắc nghiệm được phân công làm bài trực tuyến</p>
      </div>

      {/* Banner Khám Phá Tính Năng Tự Ôn Luyện */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>Tính năng mới</span>
          </div>
          <h2 className="text-lg font-black tracking-tight">Tự Ôn Luyện Kiến Thức Theo Chủ Đề</h2>
          <p className="text-xs text-orange-100 max-w-xl">
            Tự do chọn chương muốn ôn (Ester - Lipid, Pin điện...), tùy chỉnh số câu theo mức độ (Nhận biết, Thông hiểu...) và xem giải thích chi tiết ngay tức thì!
          </p>
        </div>
        <button
          onClick={() => navigate('/student/practice')}
          className="self-start sm:self-auto px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-black/10 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
        >
          <BookOpen className="w-4 h-4 text-orange-600" />
          <span>Tự Ôn Luyện Ngay</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Đang tải danh sách bài thi...
          </div>
        ) : exams.length > 0 ? (
          exams.map((item) => {
            const isOpen = item.status_label === 'open';
            const isCompleted = item.completed_attempts_count >= item.max_attempts;

            return (
              <div
                key={item.assignment_id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {item.subject_name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status_label === 'upcoming'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isOpen ? 'Đang Mở Phòng Thi' : item.status_label === 'upcoming' ? 'Chưa Mở' : 'Đã Kết Thúc'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.duration_minutes} phút</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>Thang {item.total_points} đ</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Lượt thi: <span className="font-semibold text-slate-700">{item.completed_attempts_count}/{item.max_attempts}</span>
                    </div>
                  </div>

                  {item.best_score !== null && item.best_score !== undefined && (
                    <div className="mt-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-900">Điểm cao nhất đạt được:</span>
                        <span className="text-base font-black text-emerald-700">{item.best_score} đ</span>
                      </div>

                      {/* Danh sách các lượt thi đã nộp */}
                      {item.attempts && item.attempts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-emerald-200/60">
                          <span className="text-[10px] text-emerald-800 font-semibold uppercase">Chi tiết bài làm:</span>
                          {item.attempts.map((att) => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => handleViewResult(att.id)}
                              className="text-[11px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all shadow-2xs hover:scale-105"
                              title={`Xem chi tiết bài làm Lượt ${att.attempt_number} (Điểm: ${att.score}đ)`}
                            >
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Lượt {att.attempt_number}: {att.score}đ</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="space-y-2 pt-1">
                  {item.has_in_progress_attempt ? (
                    <>
                      <button
                        onClick={() => handleStartExam(item.assignment_id)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all animate-pulse cursor-pointer"
                      >
                        <PenTool className="w-4 h-4" />
                        <span>Tiếp Tục Làm Bài Thi Dở Dang</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {item.latest_attempt_id && (
                        <button
                          type="button"
                          onClick={() => handleViewResult(item.latest_attempt_id)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Xem lại bài làm lượt trước</span>
                        </button>
                      )}
                    </>
                  ) : isOpen && !isCompleted ? (
                    <>
                      <button
                        onClick={() => handleStartExam(item.assignment_id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        <PenTool className="w-4 h-4" />
                        <span>
                          {item.completed_attempts_count === 0
                            ? 'Bắt Đầu Làm Bài Thi'
                            : `Làm Bài Tiếp (Lượt ${item.completed_attempts_count + 1}/${item.max_attempts})`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Nếu học sinh đã hoàn thành ít nhất 1 lượt, cho phép xem lại kết quả ngay */}
                      {item.latest_attempt_id && (
                        <button
                          type="button"
                          onClick={() => handleViewResult(item.latest_attempt_id)}
                          className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {item.show_solutions
                              ? 'Xem Lại Kết Quả & Hướng Dẫn Giải'
                              : 'Xem Lại Điểm Số Lượt Trước'}
                          </span>
                        </button>
                      )}
                    </>
                  ) : item.completed_attempts_count > 0 && item.latest_attempt_id ? (
                    // Đã kết thúc hoặc hết lượt thi nhưng ĐÃ LÀM BÀI -> Nút Xem Lại Kết Quả & Lời Giải nổi bật
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewResult(item.latest_attempt_id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>
                          {item.show_solutions
                            ? 'Xem Lại Bài Làm & Hướng Dẫn Giải'
                            : 'Xem Chi Tiết Điểm Số & Bài Làm'}
                        </span>
                      </button>
                      <p className="text-[11px] text-center text-slate-400">
                        {isCompleted
                          ? 'Bạn đã hoàn thành đủ số lượt làm bài.'
                          : 'Phòng thi đã kết thúc thời gian mở đề.'}
                      </p>
                    </div>
                  ) : (
                    // Chưa từng thi và không thể thi
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {item.status_label === 'upcoming'
                          ? 'Chưa đến giờ mở đề'
                          : 'Phòng thi đã đóng / Hết hạn làm bài'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Hiện tại bạn không có bài thi nào được phân công.
          </div>
        )}
      </div>
    </div>
  );
};
