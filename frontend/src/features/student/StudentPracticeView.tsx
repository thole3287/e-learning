import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PracticeMatrixInfo, PracticeHistoryItem } from '../../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  History,
  Layers,
  ChevronRight,
  Award,
  Zap,
  HelpCircle,
  Eye,
  Check,
} from 'lucide-react';

export const StudentPracticeView: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: 'builder' | 'history'
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');

  // Subjects
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([
    { id: 3, name: 'Hóa học' },
    { id: 1, name: 'Toán học' },
  ]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(3);

  // Matrix Info
  const [matrixInfo, setMatrixInfo] = useState<PracticeMatrixInfo | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState<boolean>(true);

  // Selection states
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
  const [levelCounts, setLevelCounts] = useState<{ [lvl: number]: number }>({
    1: 5,
    2: 5,
    3: 0,
    4: 0,
  });

  // Settings
  const [mode, setMode] = useState<'interactive' | 'exam'>('interactive');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [starting, setStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<PracticeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Fetch matrix info on subject change
  const fetchMatrix = async (subjectId: number) => {
    setLoadingMatrix(true);
    setErrorMsg(null);
    try {
      const res: any = await api.get(`/practice/matrix-info?subject_id=${subjectId}`);
      if (res.success && res.data) {
        setMatrixInfo(res.data);
        // Mặc định chọn tất cả các chương
        const allChapIds = res.data.chapters.map((c: any) => c.id);
        setSelectedChapterIds(allChapIds);

        // Mặc định thiết lập số lượng câu theo khả dụng
        const avail1 = res.data.total_by_level[1] || 0;
        const avail2 = res.data.total_by_level[2] || 0;
        const avail3 = res.data.total_by_level[3] || 0;
        const avail4 = res.data.total_by_level[4] || 0;

        setLevelCounts({
          1: Math.min(5, avail1),
          2: Math.min(5, avail2),
          3: Math.min(2, avail3),
          4: Math.min(1, avail4),
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể tải danh sách chương và câu hỏi.');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res: any = await api.get('/practice/history');
      if (res.success && res.data) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMatrix(selectedSubjectId);
  }, [selectedSubjectId]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Toggle chapter
  const toggleChapter = (chapterId: number) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
    );
  };

  const selectAllChapters = () => {
    if (!matrixInfo) return;
    if (selectedChapterIds.length === matrixInfo.chapters.length) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(matrixInfo.chapters.map((c) => c.id));
    }
  };

  // Available questions in selected chapters for each level
  const getAvailableByLevel = (level: number) => {
    if (!matrixInfo) return 0;
    if (selectedChapterIds.length === 0) return 0;
    return matrixInfo.chapters
      .filter((c) => selectedChapterIds.includes(c.id))
      .reduce((sum, c) => sum + (c.level_counts[level as 1 | 2 | 3 | 4] || 0), 0);
  };

  const handleLevelCountChange = (lvl: number, delta: number) => {
    const maxAvailable = getAvailableByLevel(lvl);
    setLevelCounts((prev) => {
      const current = prev[lvl] || 0;
      const nextVal = Math.max(0, Math.min(maxAvailable, current + delta));
      return { ...prev, [lvl]: nextVal };
    });
  };

  const totalSelectedQuestions = (levelCounts[1] || 0) + (levelCounts[2] || 0) + (levelCounts[3] || 0) + (levelCounts[4] || 0);

  // Start practice session
  const handleStartPractice = async () => {
    if (selectedChapterIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 chương để ôn luyện!');
      return;
    }
    if (totalSelectedQuestions === 0) {
      alert('Vui lòng chọn số lượng câu hỏi cần ôn luyện!');
      return;
    }

    setStarting(true);
    setErrorMsg(null);
    try {
      const payload = {
        subject_id: selectedSubjectId,
        chapter_ids: selectedChapterIds,
        matrix: {
          level1: levelCounts[1] || 0,
          level2: levelCounts[2] || 0,
          level3: levelCounts[3] || 0,
          level4: levelCounts[4] || 0,
        },
        mode,
        duration_minutes: durationMinutes,
      };

      const res: any = await api.post('/practice/start', payload);
      if (res.success && res.data) {
        navigate(`/student/practice/session/${res.data.id}`);
      } else {
        setErrorMsg(res.message || 'Không thể khởi tạo phòng ôn luyện.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Lỗi khi bắt đầu ôn luyện. Vui lòng thử lại.');
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    if (!matrixInfo) return;
    setSelectedChapterIds(matrixInfo.chapters.map((c) => c.id));
    setLevelCounts({
      1: Math.min(5, matrixInfo.total_by_level[1] || 0),
      2: Math.min(5, matrixInfo.total_by_level[2] || 0),
      3: 0,
      4: 0,
    });
    setMode('interactive');
    setDurationMinutes(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Orange Accent Header Banner Matching Reference */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Chế độ học tập chủ động</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>ÔN LUYỆN KIẾN THỨC</span>
            </h1>
            <p className="text-sm text-orange-100 mt-1 max-w-xl">
              Tự do chọn chương cần củng cố, điều chỉnh số câu theo mức độ nhận thức và xem hướng dẫn giải chi tiết ngay lập tức!
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex bg-black/20 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-center shrink-0">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'builder'
                  ? 'bg-white text-orange-700 shadow-md shadow-black/10'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tạo Đề Ôn Luyện</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-orange-700 shadow-md shadow-black/10'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch Sử Tự Ôn</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* ================= TAB 1: BUILDER ================= */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {/* Môn Học Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">Chọn Môn Học:</span>
            </div>
            <div className="flex items-center gap-2">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSubjectId === sub.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {loadingMatrix ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Đang tải danh mục chương và câu hỏi ôn luyện...
            </div>
          ) : matrixInfo ? (
            <>
              {/* SECTION 1: TICK CHỌN CHƯƠNG MUỐN ÔN (MATCHING IMAGE) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Tick chọn chương muốn ôn
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={selectAllChapters}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-orange-200"
                  >
                    {selectedChapterIds.length === matrixInfo.chapters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                {/* Chapter Checklist */}
                <div className="space-y-2.5 pt-1">
                  {matrixInfo.chapters.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center">Chưa có chương nào trong môn học này.</div>
                  ) : (
                    matrixInfo.chapters.map((ch) => {
                      const isChecked = selectedChapterIds.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleChapter(ch.id)}
                          className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-orange-500 text-white shadow-2xs shadow-orange-500/30'
                                  : 'border-2 border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>
                            <span className={`text-sm font-semibold ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                              {ch.name}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              isChecked
                                ? 'bg-amber-200/80 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ch.total_questions} câu
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION 2: TICK CHỌN MỨC ĐỘ MUỐN ÔN (MATCHING IMAGE) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Tick chọn mức độ muốn ôn
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    Tổng số câu đã chọn:{' '}
                    <strong className="text-orange-600 font-bold">{totalSelectedQuestions}</strong> câu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* LEVEL 1: NHẬN BIẾT */}
                  {(() => {
                    const avail = getAvailableByLevel(1);
                    const count = levelCounts[1] || 0;
                    return (
                      <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="font-extrabold text-sm text-emerald-900 uppercase tracking-wide">
                              Nhận Biết
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700/80">Có sẵn {avail} câu</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(1, -1)}
                            disabled={count <= 0}
                            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-slate-800">{count}</span>
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(1, 1)}
                            disabled={count >= avail}
                            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* LEVEL 2: THÔNG HIỂU */}
                  {(() => {
                    const avail = getAvailableByLevel(2);
                    const count = levelCounts[2] || 0;
                    return (
                      <div className="p-4 rounded-2xl border-2 border-sky-300 bg-sky-50/40 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                            <span className="font-extrabold text-sm text-sky-900 uppercase tracking-wide">
                              Thông Hiểu
                            </span>
                          </div>
                          <p className="text-xs text-sky-700/80">Có sẵn {avail} câu</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-sky-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(2, -1)}
                            disabled={count <= 0}
                            className="w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-slate-800">{count}</span>
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(2, 1)}
                            disabled={count >= avail}
                            className="w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* LEVEL 3: VẬN DỤNG */}
                  {(() => {
                    const avail = getAvailableByLevel(3);
                    const count = levelCounts[3] || 0;
                    return (
                      <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/40 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            <span className="font-extrabold text-sm text-amber-900 uppercase tracking-wide">
                              Vận Dụng
                            </span>
                          </div>
                          <p className="text-xs text-amber-700/80">Có sẵn {avail} câu</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-amber-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(3, -1)}
                            disabled={count <= 0}
                            className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-slate-800">{count}</span>
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(3, 1)}
                            disabled={count >= avail}
                            className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* LEVEL 4: VẬN DỤNG CAO */}
                  {(() => {
                    const avail = getAvailableByLevel(4);
                    const count = levelCounts[4] || 0;
                    return (
                      <div className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/40 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                            <span className="font-extrabold text-sm text-rose-900 uppercase tracking-wide">
                              Vận Dụng Cao
                            </span>
                          </div>
                          <p className="text-xs text-rose-700/80">Có sẵn {avail} câu</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-rose-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(4, -1)}
                            disabled={count <= 0}
                            className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-slate-800">{count}</span>
                          <button
                            type="button"
                            onClick={() => handleLevelCountChange(4, 1)}
                            disabled={count >= avail}
                            className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* SECTION 3: CHẾ ĐỘ & THỜI GIAN LÀM BÀI */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">
                  Cấu hình phương thức tự học
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode Card 1: Interactive */}
                  <div
                    onClick={() => setMode('interactive')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'interactive'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-600" />
                          Ôn Tập Tương Tác
                        </span>
                        {mode === 'interactive' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Kiểm tra đáp án và xem lời giải chi tiết ngay sau mỗi câu trả lời. Giúp củng cố kiến thức tức thì.
                      </p>
                    </div>
                  </div>

                  {/* Mode Card 2: Exam */}
                  <div
                    onClick={() => setMode('exam')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'exam'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          Thi Thử Tính Giờ
                        </span>
                        {mode === 'exam' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Mô phỏng kỳ thi thật. Toàn bộ đáp án và lời giải sẽ được công bố sau khi bạn bấm nộp bài.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration selector */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Thời gian làm bài:
                  </span>
                  {[
                    { val: 0, label: 'Không giới hạn' },
                    { val: 15, label: '15 phút' },
                    { val: 30, label: '30 phút' },
                    { val: 45, label: '45 phút' },
                    { val: 60, label: '60 phút' },
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      type="button"
                      onClick={() => setDurationMinutes(dur.val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        durationMinutes === dur.val
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION FOOTER BUTTONS (MATCHING IMAGE) */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>HỦY / THIẾT LẬP LẠI</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartPractice}
                  disabled={starting || totalSelectedQuestions === 0}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm flex items-center gap-2.5 shadow-lg shadow-orange-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{starting ? 'ĐANG KHỞI TẠO...' : 'BẮT ĐẦU ÔN LUYỆN'}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    ({totalSelectedQuestions} câu)
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ================= TAB 2: HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Lịch Sử Các Lần Tự Ôn Luyện</h2>
            <button
              onClick={fetchHistory}
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Đang tải lịch sử ôn luyện...
            </div>
          ) : historyList.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Bạn chưa có bài tự ôn luyện nào</p>
              <p className="text-xs text-slate-400">Hãy chọn chương và số câu để bắt đầu bài rèn luyện đầu tiên!</p>
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className="mt-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Tạo Đề Ôn Ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyList.map((item) => {
                const isCompleted = item.status === 'completed';
                const scoreNum = item.score !== null && item.score !== undefined ? Number(item.score) : null;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
                          {item.subject?.name || 'Môn học'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.mode === 'interactive'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.mode === 'interactive' ? 'Tương Tác' : 'Thi Thử'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Bắt đầu: {new Date(item.started_at).toLocaleString('vi-VN')}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                        <span>
                          Tổng: <strong>{item.total_questions}</strong> câu
                        </span>
                        {isCompleted && (
                          <>
                            <span className="text-emerald-600">
                              Đúng: <strong>{item.total_correct}</strong>
                            </span>
                            <span className="text-rose-600">
                              Sai: <strong>{item.total_incorrect}</strong>
                            </span>
                          </>
                        )}
                      </div>

                      {scoreNum !== null && (
                        <div className="mt-3 bg-orange-50/80 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-orange-900">Điểm số đạt được:</span>
                          <span
                            className={`text-base font-black ${
                              scoreNum >= 8
                                ? 'text-emerald-700'
                                : scoreNum >= 5
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {scoreNum.toFixed(2)} đ
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/practice/result/${item.id}`)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-400" />
                          <span>Xem Lại Bài Làm & Lời Giải</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/practice/session/${item.id}`)}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Tiếp Tục Ôn Luyện Dở Dang</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default StudentPracticeView;
