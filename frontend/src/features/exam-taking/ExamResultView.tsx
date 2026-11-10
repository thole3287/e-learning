import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ExamResultData } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import { Award, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Home } from 'lucide-react';

export const ExamResultView: React.FC = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<ExamResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res: any = await api.get(`/attempts/${attemptId}/result`);
        if (res.success) {
          setResult(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
        Đang tải kết quả chấm điểm...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-base font-bold text-slate-800">Không tìm thấy kết quả</h2>
        <button
          onClick={() => navigate('/student/dashboard')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs"
        >
          Quay lại Bàn làm việc
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Card Tóm Tắt Kết Quả */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Hoàn Thành Bài Thi
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">{result.title}</h1>
            <p className="text-xs text-slate-400 mt-1">Lượt thi #{result.attempt_id} • Đã nộp thành công</p>
          </div>

          {result.can_view_score ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm Số Đạt Được</p>
              <div className="text-5xl font-black text-indigo-600 mt-2 tracking-tight">
                {result.score} <span className="text-lg font-bold text-slate-400">/ {result.total_points} đ</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Đúng</p>
                  <p className="font-bold text-emerald-600 text-base mt-0.5">{result.total_correct} câu</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Sai</p>
                  <p className="font-bold text-rose-600 text-base mt-0.5">{result.total_incorrect} câu</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Chưa làm</p>
                  <p className="font-bold text-slate-500 text-base mt-0.5">{result.total_unanswered} câu</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 max-w-md mx-auto">
              {result.message}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ Học Sinh</span>
            </button>
          </div>
        </div>

        {/* Lời giải chi tiết nếu được phép xem */}
        {result.can_view_solutions && result.detailed_questions ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Chi Tiết Bài Làm & Hướng Dẫn Giải</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                ✓ Đã mở hướng dẫn giải chi tiết
              </span>
            </div>
            {result.detailed_questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-bold text-xs text-slate-700">Câu {idx + 1}</span>
                  {q.is_correct ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Đúng (+{q.earned_points} đ)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <XCircle className="w-4 h-4" /> Sai (0 đ)
                    </span>
                  )}
                </div>

                <div className="text-sm font-medium text-slate-800">
                  <MathRenderer content={q.content} />
                </div>

                {q.question_type === 'true_false' ? (
                  <div className="space-y-3 pt-2">
                    {/* Đường kẻ phân cách Chọn đúng hoặc sai */}
                    <div className="relative flex py-1 items-center">
                      <div className="grow border-t border-slate-200" />
                      <span className="shrink mx-3 text-xs font-semibold text-slate-400">
                        Chọn đúng hoặc sai
                      </span>
                      <div className="grow border-t border-slate-200" />
                    </div>

                    <div className="space-y-2.5">
                      {q.options?.map((opt, oIdx) => {
                        let studentChoice: boolean | undefined = undefined;
                        if (q.student_text_answer) {
                          try {
                            const map = JSON.parse(q.student_text_answer);
                            if (map && typeof map === 'object' && map[opt.id] !== undefined) {
                              studentChoice = Boolean(map[opt.id]);
                            }
                          } catch {}
                        }
                        if (studentChoice === undefined && q.student_selected_option_ids?.includes(opt.id)) {
                          studentChoice = true;
                        }

                        const letterPrefix = opt.content.match(/^[a-d][\)\.]/i)
                          ? opt.content.substring(0, 2)
                          : String.fromCharCode(97 + oIdx) + ')';
                        const rawText = opt.content.replace(/^[a-d][\)\.]\s*/i, '');
                        const isMatch = studentChoice !== undefined && studentChoice === opt.is_correct;

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isMatch
                                ? 'border-emerald-300 bg-emerald-50/40 text-emerald-950'
                                : studentChoice !== undefined
                                ? 'border-rose-300 bg-rose-50/50 text-rose-950'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium leading-relaxed flex-1 min-w-0">
                              <span className="font-bold text-slate-900 mr-1">{letterPrefix}</span>
                              <MathRenderer content={rawText} className="inline" />
                            </div>

                            {/* 2 nút Đúng / Sai đối sánh */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center text-xs">
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full font-bold flex items-center justify-center ${
                                  studentChoice === true
                                    ? opt.is_correct
                                      ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs'
                                      : 'bg-rose-600 text-white border-2 border-rose-600 shadow-xs'
                                    : opt.is_correct
                                    ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 font-bold'
                                    : 'bg-white border-2 border-slate-300 text-slate-400'
                                }`}
                                title={studentChoice === true ? 'Bạn đã chọn Đúng' : opt.is_correct ? 'Đáp án đúng là Đúng' : ''}
                              >
                                Đúng
                              </div>

                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full font-bold flex items-center justify-center ${
                                  studentChoice === false
                                    ? !opt.is_correct
                                      ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs'
                                      : 'bg-rose-600 text-white border-2 border-rose-600 shadow-xs'
                                    : !opt.is_correct
                                    ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 font-bold'
                                    : 'bg-white border-2 border-slate-300 text-slate-400'
                                }`}
                                title={studentChoice === false ? 'Bạn đã chọn Sai' : !opt.is_correct ? 'Đáp án đúng là Sai' : ''}
                              >
                                Sai
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : q.question_type === 'fill_in_blank' ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Câu trả lời của học sinh */}
                      <div
                        className={`p-3.5 rounded-xl border ${
                          q.is_correct
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : 'border-rose-300 bg-rose-50/50'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 block mb-1">Câu trả lời của bạn:</span>
                        <div className="font-mono font-bold text-sm">
                          {q.student_text_answer ? (
                            <span className={q.is_correct ? 'text-emerald-800' : 'text-rose-800'}>
                              {q.student_text_answer}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">(Bỏ trống - Chưa trả lời)</span>
                          )}
                        </div>
                      </div>

                      {/* Đáp án chính xác */}
                      <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950">
                        <span className="font-semibold text-emerald-800 block mb-1">Đáp án chính xác:</span>
                        <div className="font-mono font-bold text-sm text-emerald-900">
                          {q.options?.find((o) => o.is_correct)?.content || 'Chưa thiết lập'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {q.options?.map((opt, oIdx) => {
                      const isSelected = q.student_selected_option_ids?.includes(opt.id);
                      const isCorrect = opt.is_correct;

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium'
                              : isSelected && !isCorrect
                              ? 'border-rose-300 bg-rose-50 text-rose-950 line-through'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <div className="flex-1">
                            <MathRenderer content={opt.content} />
                          </div>
                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.explanation && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 mt-2 space-y-1">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span>💡 Hướng dẫn giải chi tiết:</span>
                    </span>
                    <div className="pt-0.5 text-slate-800">
                      <MathRenderer content={q.explanation} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>Chưa Có Quyền Xem Hướng Dẫn Giải Chi Tiết</span>
            </div>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              Giáo viên chưa kích hoạt tính năng xem đáp án và hướng dẫn giải cho bài kiểm tra này (hoặc hệ thống sẽ tự động mở sau khi kết thúc đợt thi).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
