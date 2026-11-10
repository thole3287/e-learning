import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PracticeSessionData, PracticeSessionQuestion } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import {
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Send,
  Zap,
  BookOpen,
  Award,
} from 'lucide-react';

export const PracticeRoomView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Answers in local state: questionId -> { selected_option_ids: number[], text_answer: string }
  const [answers, setAnswers] = useState<{
    [qId: number]: {
      selected_option_ids: number[];
      text_answer: string;
      is_checked?: boolean;
      is_correct?: boolean;
      explanation?: string;
    };
  }>({});

  // Submitting states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkingAnswer, setCheckingAnswer] = useState<boolean>(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  // Fetch session details
  const fetchSession = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/practice/sessions/${sessionId}`);
      if (res.success && res.data) {
        const s: PracticeSessionData = res.data;
        if (s.status === 'completed') {
          navigate(`/student/practice/result/${s.id}`, { replace: true });
          return;
        }

        setSession(s);

        // Populate initial answers
        const initAnswers: typeof answers = {};
        s.questions.forEach((q) => {
          const isAnswered =
            Boolean(
              (q.student_selected_option_ids && q.student_selected_option_ids.length > 0) ||
              (q.student_text_answer && q.student_text_answer.trim().length > 0)
            );

          initAnswers[q.id] = {
            selected_option_ids: q.student_selected_option_ids || [],
            text_answer: q.student_text_answer || '',
            is_checked: Boolean(isAnswered && q.is_correct !== undefined && q.is_correct !== null),
            is_correct: q.is_correct !== null ? q.is_correct : undefined,
            explanation: q.explanation,
          };
        });
        setAnswers(initAnswers);

        // Setup timer
        if (s.duration_minutes > 0) {
          const startTime = new Date(s.started_at).getTime();
          const expireTime = startTime + s.duration_minutes * 60 * 1000;
          const remainingSeconds = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
          setTimeLeft(remainingSeconds);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải phòng ôn luyện.');
      navigate('/student/practice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (!session || session.status === 'completed') return;

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);

      if (timeLeft !== null) {
        setTimeLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeLeft]);

  // Option selection
  const handleSelectOption = (questionId: number, optionId: number, isSingle: boolean) => {
    const current = answers[questionId] || { selected_option_ids: [], text_answer: '' };

    // In interactive mode, if already checked, don't allow changing unless un-checked
    if (session?.mode === 'interactive' && current.is_checked) return;

    let nextSelected: number[] = [];
    if (isSingle) {
      nextSelected = [optionId];
    } else {
      nextSelected = current.selected_option_ids.includes(optionId)
        ? current.selected_option_ids.filter((id) => id !== optionId)
        : [...current.selected_option_ids, optionId];
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option_ids: nextSelected,
      },
    }));

    // Auto-save silently in exam mode
    if (session?.mode === 'exam') {
      silentSave(questionId, nextSelected, current.text_answer);
    }
  };

  // Text answer change
  const handleTextAnswerChange = (questionId: number, val: string) => {
    const current = answers[questionId] || { selected_option_ids: [], text_answer: '' };
    if (session?.mode === 'interactive' && current.is_checked) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_answer: val,
      },
    }));

    if (session?.mode === 'exam') {
      silentSave(questionId, current.selected_option_ids, val);
    }
  };

  // Silent save for exam mode
  const silentSave = async (questionId: number, optionIds: number[], textAnswer: string) => {
    try {
      await api.post(`/practice/sessions/${session?.id}/save`, {
        question_id: questionId,
        selected_option_ids: optionIds,
        text_answer: textAnswer,
      });
    } catch (err) {
      console.warn('Auto-save error', err);
    }
  };

  // Check answer immediately (Interactive mode)
  const handleCheckInteractiveAnswer = async (question: PracticeSessionQuestion) => {
    const current = answers[question.id];
    if (
      !current ||
      (current.selected_option_ids.length === 0 && (!current.text_answer || !current.text_answer.trim()))
    ) {
      alert('Vui lòng chọn hoặc nhập đáp án trước khi kiểm tra!');
      return;
    }

    setCheckingAnswer(true);
    try {
      const res: any = await api.post(`/practice/sessions/${session?.id}/save`, {
        question_id: question.id,
        selected_option_ids: current.selected_option_ids,
        text_answer: current.text_answer,
      });

      if (res.success && res.data) {
        setAnswers((prev) => ({
          ...prev,
          [question.id]: {
            ...prev[question.id],
            is_checked: true,
            is_correct: res.data.is_correct,
            explanation: res.data.explanation,
          },
        }));

        // Update question options correct state if returned
        if (res.data.correct_options && session) {
          const correctOptIds = res.data.correct_options.map((o: any) => o.id);
          question.options.forEach((opt) => {
            opt.is_correct = correctOptIds.includes(opt.id);
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kiểm tra đáp án. Vui lòng thử lại.');
    } finally {
      setCheckingAnswer(false);
    }
  };

  // Submit whole practice session
  const handleSubmit = async (autoSubmit: boolean = false) => {
    if (!autoSubmit) {
      const unansweredCount =
        session?.questions.filter((q) => {
          const ans = answers[q.id];
          return (
            !ans ||
            (ans.selected_option_ids.length === 0 && (!ans.text_answer || !ans.text_answer.trim()))
          );
        }).length || 0;

      const confirmMsg =
        unansweredCount > 0
          ? `Bạn còn ${unansweredCount} câu chưa làm. Bạn có chắc chắn muốn nộp bài ôn luyện ngay?`
          : 'Bạn có chắc chắn muốn kết thúc và nộp bài ôn luyện?';

      if (!window.confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      const res: any = await api.post(`/practice/sessions/${session?.id}/submit`);
      if (res.success && res.data) {
        navigate(`/student/practice/result/${session?.id}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi nộp bài. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
        Đang chuẩn bị đề tự ôn luyện...
      </div>
    );
  }

  if (!session || !session.questions || session.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 font-bold mb-4">Không tìm thấy nội dung ôn luyện.</p>
        <button
          onClick={() => navigate('/student/practice')}
          className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs"
        >
          Quay lại Ôn Luyện
        </button>
      </div>
    );
  }

  const currentQ = session.questions[currentIdx];
  const currentAns = answers[currentQ.id] || { selected_option_ids: [], text_answer: '' };
  const isInteractive = session.mode === 'interactive';

  const levelLabels = {
    1: { text: 'Nhận biết', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    2: { text: 'Thông hiểu', color: 'bg-sky-100 text-sky-800 border-sky-200' },
    3: { text: 'Vận dụng', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    4: { text: 'Vận dụng cao', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Bạn có muốn tạm dừng và quay lại trang ôn luyện?')) {
                  navigate('/student/practice');
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {session.subject_name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    isInteractive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isInteractive ? '⚡ Ôn Tương Tác' : '⏱️ Thi Thử'}
                </span>
              </div>
              <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{session.title}</h1>
            </div>
          </div>

          {/* Center/Right Timer & Action */}
          <div className="flex items-center gap-3">
            {session.duration_minutes > 0 ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  (timeLeft || 0) < 300
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formatTime(timeElapsed)}</span>
              </div>
            )}

            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang nộp...' : 'Kết thúc & Nộp bài'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Practice Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3/4): Current Question Card */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Question Top Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-base text-slate-900">
                  Câu {currentIdx + 1}
                  <span className="text-slate-400 text-xs font-normal"> / {session.questions.length}</span>
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                    levelLabels[currentQ.difficulty_level]?.color
                  }`}
                >
                  {levelLabels[currentQ.difficulty_level]?.text}
                </span>
              </div>

              {isInteractive && (
                <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-500" />
                  Chế độ giải thích tức thì
                </span>
              )}
            </div>

            {/* Question Content (Rendered with KaTeX) */}
            <div className="text-slate-800 text-base leading-relaxed">
              <MathRenderer content={currentQ.content} />
            </div>

            {/* Options List */}
            {currentQ.question_type === 'fill_in_blank' || currentQ.question_type === 'short_answer' ? (
              /* Fill-in / Short-answer */
              <div className="pt-2 space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Nhập câu trả lời của bạn:
                </label>
                <input
                  type="text"
                  value={currentAns.text_answer || ''}
                  onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
                  disabled={isInteractive && currentAns.is_checked}
                  placeholder="Gõ đáp án vào đây..."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-orange-500 focus:outline-hidden text-sm font-semibold transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            ) : (
              /* Multiple Choice & Single Choice */
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt, oIdx) => {
                  const isSingle = currentQ.question_type !== 'multiple_choice';
                  const isSelected = currentAns.selected_option_ids?.includes(opt.id);
                  const optLetter = String.fromCharCode(65 + oIdx);

                  // Colors when checked in interactive mode
                  let cardStyle = isSelected
                    ? 'border-orange-500 bg-orange-50/70 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60';

                  if (isInteractive && currentAns.is_checked) {
                    if (opt.is_correct) {
                      cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                    } else if (isSelected && !opt.is_correct) {
                      cardStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                    } else {
                      cardStyle = 'border-slate-200 opacity-60';
                    }
                  }

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id, isSingle)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${cardStyle}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {optLetter}
                      </div>

                      <div className="flex-1 text-sm text-slate-800 pt-0.5 leading-relaxed">
                        <MathRenderer content={opt.content} />
                      </div>

                      {/* Status indicator in interactive mode */}
                      {isInteractive && currentAns.is_checked && (
                        <div>
                          {opt.is_correct ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : isSelected && !opt.is_correct ? (
                            <XCircle className="w-5 h-5 text-rose-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Interactive Mode: Check Answer Button & Explanation Box */}
            {isInteractive && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {!currentAns.is_checked ? (
                  <button
                    type="button"
                    onClick={() => handleCheckInteractiveAnswer(currentQ)}
                    disabled={checkingAnswer}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{checkingAnswer ? 'Đang kiểm tra...' : 'Kiểm Tra Đáp Án Ngay'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Result alert */}
                    <div
                      className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        currentAns.is_correct
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      {currentAns.is_correct ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-extrabold text-sm">Chính xác! Chúc mừng bạn!</p>
                            <p className="text-xs text-emerald-700">Bạn đã nắm vững phần kiến thức này.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <div>
                            <p className="font-extrabold text-sm">Chưa chính xác!</p>
                            <p className="text-xs text-rose-700">Hãy đọc kỹ hướng dẫn giải chi tiết dưới đây để rút kinh nghiệm nhé.</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Detailed explanation */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>Hướng dẫn giải chi tiết</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed pt-1">
                        {currentAns.explanation ? (
                          <MathRenderer content={currentAns.explanation} />
                        ) : (
                          <span className="italic text-slate-400">Chưa có lời giải chi tiết cho câu hỏi này.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.min(session.questions.length - 1, prev + 1))}
                disabled={currentIdx === session.questions.length - 1}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1/4): Question Palette Navigation */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Bảng Câu Hỏi</span>
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-semibold">
                {Object.values(answers).filter((a) => a.selected_option_ids.length > 0 || a.text_answer?.trim()).length} / {session.questions.length}
              </span>
            </h3>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {session.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered =
                  ans && (ans.selected_option_ids.length > 0 || (ans.text_answer && ans.text_answer.trim()));
                const isCurrent = idx === currentIdx;

                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

                if (isInteractive && ans?.is_checked) {
                  btnStyle = ans.is_correct
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-rose-500 text-white font-bold';
                } else if (isAnswered) {
                  btnStyle = 'bg-orange-500 text-white font-bold';
                }

                if (isCurrent) {
                  btnStyle += ' ring-2 ring-indigo-600 ring-offset-2';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-orange-500"></span>
                <span>Đã làm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300"></span>
                <span>Chưa làm</span>
              </div>
              {isInteractive && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                    <span>Đúng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                    <span>Sai</span>
                  </div>
                </>
              )}
            </div>

            {/* Quick Finish Button */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full mt-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài ôn luyện</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
export default PracticeRoomView;
