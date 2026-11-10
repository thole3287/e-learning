import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ExamRoomData, Question } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import { Clock, Flag, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, ArrowRight, Send, Check } from 'lucide-react';

export const ExamRoomView: React.FC = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [examData, setExamData] = useState<ExamRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State vị trí câu hỏi đang làm
  const [currentIndex, setCurrentIndex] = useState(0);

  // Map lưu câu trả lời: { [questionId]: { selected_option_ids: number[], text_answer: string, is_flagged: boolean } }
  const [answers, setAnswers] = useState<Record<number, { selected_option_ids: number[]; text_answer: string; is_flagged: boolean }>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Đồng hồ đếm ngược (giây)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const timerRef = useRef<any>(null);

  // Khởi động phòng thi
  useEffect(() => {
    const initExam = async () => {
      try {
        const res: any = await api.post(`/assignments/${assignmentId}/start`);
        if (res.success) {
          const data: ExamRoomData = res.data;
          setExamData(data);

          // Nạp các câu trả lời đã lưu trước đó (nếu là phiên tiếp tục)
          const initialAnswers: any = {};
          data.saved_answers.forEach((ans) => {
            initialAnswers[ans.question_id] = {
              selected_option_ids: ans.selected_option_ids || [],
              text_answer: ans.text_answer || '',
              is_flagged: ans.is_flagged || false,
            };
          });
          setAnswers(initialAnswers);

          // Tính toán thời gian còn lại chuẩn từ expires_at của server
          const expireTime = new Date(data.expires_at).getTime();
          const serverNow = new Date(data.server_now).getTime();
          const diffSeconds = Math.max(0, Math.floor((expireTime - serverNow) / 1000));
          setRemainingSeconds(diffSeconds);
        }
      } catch (err: any) {
        setError(err?.message || 'Không thể truy cập vào phòng thi.');
      } finally {
        setLoading(false);
      }
    };

    initExam();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assignmentId]);

  // Bộ đếm ngược thời gian
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [remainingSeconds]);

  // Tự động nộp bài khi hết giờ
  const handleAutoSubmit = async () => {
    if (!examData) return;
    try {
      const res: any = await api.post(`/attempts/${examData.attempt_id}/submit`);
      if (res.success) {
        navigate(`/exam/result/${examData.attempt_id}`);
      }
    } catch {
      navigate('/student/dashboard');
    }
  };

  // Chủ động nộp bài
  const handleSubmitExam = async () => {
    if (!examData) return;
    try {
      const res: any = await api.post(`/attempts/${examData.attempt_id}/submit`);
      if (res.success) {
        navigate(`/exam/result/${examData.attempt_id}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi nộp bài.');
    }
  };

  // Hàm chọn đáp án cho trắc nghiệm đơn / nhiều đáp án
  const handleSelectOption = (question: Question, optionId: number) => {
    const current = answers[question.id] || { selected_option_ids: [], text_answer: '', is_flagged: false };
    let newSelected: number[] = [];

    if (question.question_type === 'single_choice') {
      newSelected = [optionId];
    } else {
      // Multiple choice
      if (current.selected_option_ids.includes(optionId)) {
        newSelected = current.selected_option_ids.filter((id) => id !== optionId);
      } else {
        newSelected = [...current.selected_option_ids, optionId];
      }
    }

    const updated = { ...current, selected_option_ids: newSelected };
    setAnswers((prev) => ({ ...prev, [question.id]: updated }));
    triggerAutosave(question.id, updated);
  };

  // Helper lấy trạng thái Đúng / Sai của từng mệnh đề trong câu Đúng/Sai
  const getTrueFalseChoice = (questionId: number, optionId: number): boolean | null => {
    const ans = answers[questionId];
    if (!ans) return null;
    if (ans.text_answer) {
      try {
        const map = JSON.parse(ans.text_answer);
        if (map && typeof map === 'object' && map[optionId] !== undefined) {
          return Boolean(map[optionId]);
        }
      } catch {
        // bỏ qua nếu text_answer chưa phải JSON
      }
    }
    // Fallback nếu học sinh đã chọn qua selected_option_ids
    if (ans.selected_option_ids?.includes(optionId)) {
      return true;
    }
    return null;
  };

  // Hàm chọn Đúng hoặc Sai cho từng mệnh đề a, b, c, d
  const handleSelectTrueFalse = (question: Question, optionId: number, choice: boolean) => {
    const current = answers[question.id] || { selected_option_ids: [], text_answer: '', is_flagged: false };
    let choiceMap: Record<number, boolean> = {};
    try {
      if (current.text_answer) {
        choiceMap = JSON.parse(current.text_answer);
      }
    } catch {
      choiceMap = {};
    }

    choiceMap[optionId] = choice;

    // Lọc danh sách optionId có giá trị true để đồng bộ selected_option_ids
    const trueOptionIds = Object.entries(choiceMap)
      .filter(([_, val]) => val === true)
      .map(([optId]) => Number(optId));

    const updated = {
      ...current,
      text_answer: JSON.stringify(choiceMap),
      selected_option_ids: trueOptionIds,
    };

    setAnswers((prev) => ({ ...prev, [question.id]: updated }));
    triggerAutosave(question.id, updated);
  };

  // Hàm điền đáp án text
  const handleTextChange = (questionId: number, text: string) => {
    const current = answers[questionId] || { selected_option_ids: [], text_answer: '', is_flagged: false };
    const updated = { ...current, text_answer: text };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    triggerAutosave(questionId, updated);
  };

  // Toggle cờ xem lại
  const handleToggleFlag = (questionId: number) => {
    const current = answers[questionId] || { selected_option_ids: [], text_answer: '', is_flagged: false };
    const updated = { ...current, is_flagged: !current.is_flagged };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    triggerAutosave(questionId, updated);
  };

  // Cơ chế Autosave ngầm lên server
  const triggerAutosave = async (questionId: number, answerData: any) => {
    setAutosaveStatus('saving');
    try {
      await api.post(`/attempts/${examData?.attempt_id}/answers`, {
        question_id: questionId,
        selected_option_ids: answerData.selected_option_ids,
        text_answer: answerData.text_answer,
        is_flagged: answerData.is_flagged,
      });
      setAutosaveStatus('saved');
    } catch {
      setAutosaveStatus('error');
    }
  };

  // Định dạng thời gian mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Đang khởi tạo phòng thi trực tuyến an toàn...
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Không Thể Vào Phòng Thi</h2>
        <p className="text-slate-400 text-xs max-w-md mb-6">{error}</p>
        <button
          onClick={() => navigate('/student/dashboard')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold"
        >
          Quay lại Bàn làm việc
        </button>
      </div>
    );
  }

  const currentQ = examData.questions[currentIndex];
  const currentAns = answers[currentQ.id] || { selected_option_ids: [], text_answer: '', is_flagged: false };

  // Đếm số câu đã làm
  const answeredCount = examData.questions.filter((q) => {
    const ans = answers[q.id];
    return ans && (ans.selected_option_ids?.length > 0 || ans.text_answer?.trim() !== '');
  }).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header Phòng Thi */}
      <header className="min-h-16 bg-slate-900 text-white flex items-center justify-between gap-2 px-3 sm:px-6 py-2 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center font-bold text-sm shrink-0">
            E
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-white truncate max-w-[34vw] sm:max-w-md">{examData.title}</h1>
            <p className="text-[10px] text-slate-400 truncate">
              Câu {currentIndex + 1} / {examData.total_questions} ({currentQ.points} điểm)
            </p>
          </div>
        </div>

        {/* Đồng hồ đếm ngược */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-all ${
              remainingSeconds < 300
                ? 'bg-rose-950/80 border-rose-600 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-emerald-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-1.5 min-h-10 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp Bài</span>
          </button>
        </div>
      </header>

      {/* Main Content: 2 Cột (Trái: Nội dung câu hỏi, Phải: Question Palette) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
        {/* Cột Trái: Khu vực làm bài */}
        <div className="min-w-0 lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Question Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {currentIndex + 1}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {currentQ.question_type.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                {autosaveStatus === 'saving' ? 'Đang lưu...' : autosaveStatus === 'saved' ? 'Đã lưu' : 'Lỗi mạng'}
              </span>
              <button
                onClick={() => handleToggleFlag(currentQ.id)}
                    className={`flex items-center gap-1.5 min-h-10 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  currentAns.is_flagged
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${currentAns.is_flagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{currentAns.is_flagged ? 'Đã gắn cờ' : 'Xem lại sau'}</span>
              </button>
            </div>
          </div>

          {/* Question Text (LaTeX KaTeX Renderer) */}
          <div className="min-w-0 overflow-x-auto text-base font-medium text-slate-900 leading-relaxed py-2">
            <MathRenderer content={currentQ.content} />
          </div>

          {/* Options Section */}
          <div className="space-y-3 pt-2">
            {currentQ.question_type === 'fill_in_blank' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhập đáp án của bạn:</label>
                <input
                  type="text"
                  value={currentAns.text_answer}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                  placeholder="Nhập câu trả lời ngắn..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            ) : currentQ.question_type === 'true_false' ? (
              <div className="space-y-4 pt-1">
                {/* Đường kẻ phân cách Chọn đúng hoặc sai */}
                <div className="relative flex py-2 items-center">
                  <div className="grow border-t border-slate-200" />
                  <span className="shrink mx-4 text-xs font-semibold text-slate-500">
                    Chọn đúng hoặc sai
                  </span>
                  <div className="grow border-t border-slate-200" />
                </div>

                <div className="space-y-3">
                  {currentQ.options.map((opt, oIdx) => {
                    const studentChoice = getTrueFalseChoice(currentQ.id, opt.id);
                    const letterPrefix = opt.content.match(/^[a-d][\)\.]/i)
                      ? opt.content.substring(0, 2)
                      : String.fromCharCode(97 + oIdx) + ')';
                    const rawText = opt.content.replace(/^[a-d][\)\.]\s*/i, '');

                    return (
                      <div key={opt.id} className="flex items-center gap-2.5 sm:gap-3.5">
                        {/* Khung nội dung mệnh đề bên trái */}
                        <div className="flex-1 min-w-0 p-3.5 sm:p-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-medium leading-relaxed shadow-2xs">
                          <span className="font-bold text-slate-900 mr-1.5">{letterPrefix}</span>
                          <MathRenderer content={rawText} className="inline" />
                        </div>

                        {/* 2 nút tròn bên hông: Đúng / Sai */}
                        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectTrueFalse(currentQ, opt.id, true)}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full font-bold text-xs sm:text-sm cursor-pointer select-none transition-all flex items-center justify-center ${
                              studentChoice === true
                                ? 'bg-amber-500 border-2 border-amber-500 text-white shadow-md'
                                : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            Đúng
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTrueFalse(currentQ, opt.id, false)}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full font-bold text-xs sm:text-sm cursor-pointer select-none transition-all flex items-center justify-center ${
                              studentChoice === false
                                ? 'bg-amber-500 border-2 border-amber-500 text-white shadow-md'
                                : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            Sai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              currentQ.options.map((opt, oIdx) => {
                const isSelected = currentAns.selected_option_ids?.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ, opt.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectOption(currentQ, opt.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-4 rounded-xl border text-sm flex items-start gap-3 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <div className="flex-1 text-slate-800">
                      <MathRenderer content={opt.content} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-5 sm:pt-6 border-t border-slate-100">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="min-h-11 flex items-center gap-2 px-3 sm:px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>
            <button
              disabled={currentIndex === examData.total_questions - 1}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="min-h-11 flex items-center gap-2 px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
            >
              <span>Câu sau</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cột Phải: Bảng điều hướng câu hỏi (Question Palette) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 sm:space-y-5 lg:sticky lg:top-22">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Danh Sách Câu Hỏi</h3>
            <span className="text-xs font-bold text-indigo-600">
              {answeredCount}/{examData.total_questions} đã làm
            </span>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
            {examData.questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = ans && (ans.selected_option_ids?.length > 0 || ans.text_answer?.trim() !== '');
              const isCurrent = idx === currentIndex;
              const isFlagged = ans?.is_flagged;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`min-h-10 rounded-lg font-bold text-xs relative flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Chú giải trạng thái */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
              <span>Đã trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-100" />
              <span>Chưa trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-500" />
              <span>Đánh dấu xem lại</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xác Nhận Nộp Bài */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Xác Nhận Nộp Bài Thi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đã hoàn thành <span className="font-bold text-emerald-600">{answeredCount}</span> trên tổng số{' '}
              <span className="font-bold text-slate-900">{examData.total_questions}</span> câu hỏi.
              {answeredCount < examData.total_questions && (
                <span className="text-rose-600 font-semibold block mt-1">
                  Cảnh báo: Bạn vẫn còn {examData.total_questions - answeredCount} câu chưa làm!
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400">
              Sau khi nộp, bạn sẽ không thể thay đổi đáp án. Bài thi sẽ được hệ thống chấm điểm tự động.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="min-h-11 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                className="min-h-11 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs shadow-md shadow-emerald-600/20"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
