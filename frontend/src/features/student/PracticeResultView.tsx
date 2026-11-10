import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PracticeSessionData } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const PracticeResultView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res: any = await api.get(`/practice/sessions/${sessionId}`);
        if (res.success && res.data) {
          setSession(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
        Đang tải kết quả bài ôn luyện...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-700 font-bold mb-4">Không tìm thấy kết quả ôn luyện.</p>
        <button
          onClick={() => navigate('/student/practice')}
          className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs"
        >
          Quay lại Ôn Luyện
        </button>
      </div>
    );
  }

  const scoreNum = Number(session.score || 0);

  const getEvaluation = (score: number) => {
    if (score >= 9) return { label: 'Xuất sắc!', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (score >= 8) return { label: 'Giỏi!', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
    if (score >= 6.5) return { label: 'Khá!', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    if (score >= 5) return { label: 'Trung bình', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Cần nỗ lực thêm', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
  };

  const evalInfo = getEvaluation(scoreNum);

  // Filter questions
  const filteredQuestions = session.questions.filter((q) => {
    const isAnswered =
      (q.student_selected_option_ids && q.student_selected_option_ids.length > 0) ||
      (q.student_text_answer && q.student_text_answer.trim().length > 0);

    if (filter === 'correct') return q.is_correct === true;
    if (filter === 'incorrect') return isAnswered && q.is_correct === false;
    if (filter === 'unanswered') return !isAnswered;
    return true;
  });

  const levelLabels = {
    1: { text: 'Nhận biết', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    2: { text: 'Thông hiểu', color: 'bg-sky-100 text-sky-800 border-sky-200' },
    3: { text: 'Vận dụng', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    4: { text: 'Vận dụng cao', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/practice')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang Ôn Luyện</span>
        </button>

        <button
          onClick={() => navigate('/student/practice')}
          className="flex items-center gap-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tạo Đề Ôn Mới</span>
        </button>
      </div>

      {/* Summary Score Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
              {session.subject_name}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{session.title}</h1>
            <p className="text-xs text-slate-400">
              Hoàn thành lúc:{' '}
              {session.completed_at ? new Date(session.completed_at).toLocaleString('vi-VN') : 'Đang làm'}
            </p>
          </div>

          {/* Big Score Box */}
          <div
            className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl border-2 shrink-0 ${evalInfo.bg}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Điểm Đạt Được
            </span>
            <div className={`text-3xl sm:text-4xl font-black ${evalInfo.color}`}>
              {scoreNum.toFixed(2)}
              <span className="text-sm font-semibold text-slate-400"> / 10 đ</span>
            </div>
            <span className={`text-xs font-extrabold mt-1 ${evalInfo.color}`}>{evalInfo.label}</span>
          </div>
        </div>

        {/* 4 Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[11px] font-semibold text-slate-500 block">Tổng số câu</span>
            <span className="text-xl font-black text-slate-800">{session.total_questions}</span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
            <span className="text-[11px] font-semibold text-emerald-800 block">Số câu đúng</span>
            <span className="text-xl font-black text-emerald-700">{session.total_correct ?? 0}</span>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-center">
            <span className="text-[11px] font-semibold text-rose-800 block">Số câu sai</span>
            <span className="text-xl font-black text-rose-700">{session.total_incorrect ?? 0}</span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center">
            <span className="text-[11px] font-semibold text-amber-800 block">Chưa làm</span>
            <span className="text-xl font-black text-amber-700">{session.total_unanswered ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Review Questions Section */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            <span>Chi Tiết Lời Giải Từng Câu Hỏi</span>
          </h2>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: `Tất cả (${session.questions.length})` },
              { key: 'correct', label: `Đúng (${session.total_correct ?? 0})` },
              { key: 'incorrect', label: `Sai (${session.total_incorrect ?? 0})` },
              { key: 'unanswered', label: `Chưa làm (${session.total_unanswered ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === tab.key
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Không có câu hỏi nào theo bộ lọc này.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const originalIndex = session.questions.findIndex((item) => item.id === q.id);
              const isAnswered =
                (q.student_selected_option_ids && q.student_selected_option_ids.length > 0) ||
                (q.student_text_answer && q.student_text_answer.trim().length > 0);

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5"
                >
                  {/* Top Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">Câu {originalIndex + 1}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          levelLabels[q.difficulty_level]?.color
                        }`}
                      >
                        {levelLabels[q.difficulty_level]?.text}
                      </span>
                    </div>

                    <div>
                      {q.is_correct ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Chính xác
                        </span>
                      ) : isAnswered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-full text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Chưa chính xác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                          Chưa làm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-slate-800 text-sm leading-relaxed">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* Options */}
                  {q.question_type === 'fill_in_blank' || q.question_type === 'short_answer' ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-600">Câu trả lời của bạn: </span>
                        <span className="font-mono font-bold text-slate-800">
                          {q.student_text_answer || '(Bỏ trống)'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {q.options.map((opt, oIdx) => {
                        const optLetter = String.fromCharCode(65 + oIdx);
                        const isStudentChoice = q.student_selected_option_ids?.includes(opt.id);
                        const isCorrectOpt = opt.is_correct;

                        let style = 'bg-white border-slate-200';
                        if (isCorrectOpt) {
                          style = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                        } else if (isStudentChoice && !isCorrectOpt) {
                          style = 'bg-rose-50 border-rose-300 text-rose-950';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 ${style}`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                  isCorrectOpt
                                    ? 'bg-emerald-600 text-white'
                                    : isStudentChoice
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {optLetter}
                              </span>
                              <div className="text-xs pt-0.5 leading-relaxed">
                                <MathRenderer content={opt.content} />
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold">
                              {isCorrectOpt && (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Đáp án đúng
                                </span>
                              )}
                              {isStudentChoice && !isCorrectOpt && (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                  Bạn chọn
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Lời giải chi tiết */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Hướng dẫn giải chi tiết</span>
                    </div>
                    <div className="text-xs text-slate-800 leading-relaxed pt-1">
                      {q.explanation ? (
                        <MathRenderer content={q.explanation} />
                      ) : (
                        <span className="italic text-slate-400">Chưa có hướng dẫn giải chi tiết cho câu hỏi này.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default PracticeResultView;
