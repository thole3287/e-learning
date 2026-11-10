import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Exam, Question } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import {
  Plus,
  BarChart2,
  Send,
  Clock,
  FileText,
  Trash2,
  CheckCircle2,
  Sparkles,
  Shuffle,
  AlertCircle,
  HelpCircle,
  Layers,
  Zap,
  Search,
  Eye,
  EyeOff,
  Printer,
  X,
} from 'lucide-react';

export const ExamBuilderView: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Exam | null>(null);
  const [previewExam, setPreviewExam] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  // Create Exam Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    code: '',
    subject_id: 1,
    duration_minutes: 45,
    total_points: 10,
    pass_points: 5,
    shuffle_questions: true,
    shuffle_options: true,
    description: '',
  });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cấu hình Ma Trận Mức Độ Nhận Thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)
  const [matrixConfig, setMatrixConfig] = useState({
    level1: 4, // 1. Nhận biết
    level2: 3, // 2. Thông hiểu
    level3: 2, // 3. Vận dụng
    level4: 1, // 4. Vận dụng cao
  });
  const [filterLevel, setFilterLevel] = useState<number | 'all' | 'selected'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Assign Form State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assignDurationMinutes, setAssignDurationMinutes] = useState(45);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [viewScoreType, setViewScoreType] = useState('immediately');
  const [showSolutions, setShowSolutions] = useState(true);

  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/exams');
      if (res.success) {
        setExams(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const [classRes, subjectRes, questionRes]: any = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/questions?per_page=500'),
      ]);
      if (classRes.success) setClasses(classRes.data);
      if (subjectRes.success) {
        setSubjects(subjectRes.data);
        if (subjectRes.data.length > 0) {
          setCreateForm((prev) => ({ ...prev, subject_id: subjectRes.data[0].id }));
        }
      }
      if (questionRes.success) setAvailableQuestions(questionRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExams();
    loadResources();
  }, []);

  // Lọc danh sách câu hỏi theo môn học hiện đang chọn
  const subjectQuestions = availableQuestions.filter(
    (q: any) => !createForm.subject_id || q.subject_id === createForm.subject_id
  );

  const level1Questions = subjectQuestions.filter((q) => q.difficulty_level === 1);
  const level2Questions = subjectQuestions.filter((q) => q.difficulty_level === 2);
  const level3Questions = subjectQuestions.filter((q) => q.difficulty_level === 3);
  const level4Questions = subjectQuestions.filter((q) => q.difficulty_level === 4);

  // Thống kê phân hóa câu hỏi đã chọn vào đề
  const selectedQuestions = subjectQuestions.filter((q) => selectedQuestionIds.includes(q.id));
  const sel1 = selectedQuestions.filter((q) => q.difficulty_level === 1).length;
  const sel2 = selectedQuestions.filter((q) => q.difficulty_level === 2).length;
  const sel3 = selectedQuestions.filter((q) => q.difficulty_level === 3).length;
  const sel4 = selectedQuestions.filter((q) => q.difficulty_level === 4).length;
  const selTotal = selectedQuestions.length;

  const pct1 = selTotal > 0 ? Math.round((sel1 / selTotal) * 100) : 0;
  const pct2 = selTotal > 0 ? Math.round((sel2 / selTotal) * 100) : 0;
  const pct3 = selTotal > 0 ? Math.round((sel3 / selTotal) * 100) : 0;
  const pct4 = selTotal > 0 ? Math.round((sel4 / selTotal) * 100) : 0;

  const totalMatrixQuestions =
    (Number(matrixConfig.level1) || 0) +
    (Number(matrixConfig.level2) || 0) +
    (Number(matrixConfig.level3) || 0) +
    (Number(matrixConfig.level4) || 0);

  // Tự sinh mã đề thi ngẫu nhiên
  const generateRandomCode = () => {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = createForm.duration_minutes === 15 ? 'KT15P' : createForm.duration_minutes === 45 ? 'KT1T' : 'THI';
    setCreateForm((prev) => ({ ...prev, code: `${prefix}_${randomStr}` }));
  };

  // Áp dụng tỉ lệ ma trận mẫu (Presets)
  const handleApplyPreset = (pct1: number, pct2: number, pct3: number, pct4: number, totalTarget: number = 20) => {
    const c1 = Math.min(level1Questions.length, Math.max(0, Math.round((totalTarget * pct1) / 100)));
    const c2 = Math.min(level2Questions.length, Math.max(0, Math.round((totalTarget * pct2) / 100)));
    const c3 = Math.min(level3Questions.length, Math.max(0, Math.round((totalTarget * pct3) / 100)));
    const c4 = Math.min(level4Questions.length, Math.max(0, Math.round((totalTarget * pct4) / 100)));
    setMatrixConfig({ level1: c1, level2: c2, level3: c3, level4: c4 });
  };

  // Tự động bốc ngẫu nhiên câu hỏi theo đúng ma trận mức độ nhận thức
  const handleAutoSelectByMatrix = () => {
    const req1 = Math.max(0, Number(matrixConfig.level1) || 0);
    const req2 = Math.max(0, Number(matrixConfig.level2) || 0);
    const req3 = Math.max(0, Number(matrixConfig.level3) || 0);
    const req4 = Math.max(0, Number(matrixConfig.level4) || 0);

    if (req1 > level1Questions.length) {
      alert(`Ngân hàng chỉ có ${level1Questions.length} câu Nhận biết (yêu cầu ${req1} câu). Vui lòng giảm bớt số lượng!`);
      return;
    }
    if (req2 > level2Questions.length) {
      alert(`Ngân hàng chỉ có ${level2Questions.length} câu Thông hiểu (yêu cầu ${req2} câu). Vui lòng giảm bớt số lượng!`);
      return;
    }
    if (req3 > level3Questions.length) {
      alert(`Ngân hàng chỉ có ${level3Questions.length} câu Vận dụng (yêu cầu ${req3} câu). Vui lòng giảm bớt số lượng!`);
      return;
    }
    if (req4 > level4Questions.length) {
      alert(`Ngân hàng chỉ có ${level4Questions.length} câu Vận dụng cao (yêu cầu ${req4} câu). Vui lòng giảm bớt số lượng!`);
      return;
    }

    if (req1 + req2 + req3 + req4 === 0) {
      alert('Vui lòng nhập số lượng câu hỏi cần bốc cho ít nhất một mức độ nhận thức!');
      return;
    }

    // Bốc ngẫu nhiên không thiên vị
    const shuffleAndPick = (arr: Question[], count: number) => {
      return [...arr].sort(() => 0.5 - Math.random()).slice(0, count).map((q) => q.id);
    };

    const p1 = shuffleAndPick(level1Questions, req1);
    const p2 = shuffleAndPick(level2Questions, req2);
    const p3 = shuffleAndPick(level3Questions, req3);
    const p4 = shuffleAndPick(level4Questions, req4);

    const finalIds = [...p1, ...p2, ...p3, ...p4];
    setSelectedQuestionIds(finalIds);
  };

  // Đổi môn học
  const handleSubjectChange = (newSubjectId: number) => {
    setCreateForm((prev) => ({ ...prev, subject_id: newSubjectId }));
    const subQs = availableQuestions.filter((q: any) => q.subject_id === newSubjectId);
    const l1 = subQs.filter((q) => q.difficulty_level === 1);
    const l2 = subQs.filter((q) => q.difficulty_level === 2);
    const l3 = subQs.filter((q) => q.difficulty_level === 3);
    const l4 = subQs.filter((q) => q.difficulty_level === 4);

    const init1 = Math.min(l1.length, 4);
    const init2 = Math.min(l2.length, 3);
    const init3 = Math.min(l3.length, 2);
    const init4 = Math.min(l4.length, 1);

    setMatrixConfig({
      level1: init1,
      level2: init2,
      level3: init3,
      level4: init4,
    });

    const shuffleAndPick = (arr: Question[], count: number) => {
      return [...arr].sort(() => 0.5 - Math.random()).slice(0, count).map((q) => q.id);
    };
    setSelectedQuestionIds([
      ...shuffleAndPick(l1, init1),
      ...shuffleAndPick(l2, init2),
      ...shuffleAndPick(l3, init3),
      ...shuffleAndPick(l4, init4),
    ]);
  };

  // Mở modal tạo đề thi mới
  const handleOpenCreateModal = () => {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const subId = subjects[0]?.id || 1;
    const subQs = availableQuestions.filter((q: any) => q.subject_id === subId);
    const l1 = subQs.filter((q) => q.difficulty_level === 1);
    const l2 = subQs.filter((q) => q.difficulty_level === 2);
    const l3 = subQs.filter((q) => q.difficulty_level === 3);
    const l4 = subQs.filter((q) => q.difficulty_level === 4);

    const init1 = Math.min(l1.length, 4);
    const init2 = Math.min(l2.length, 3);
    const init3 = Math.min(l3.length, 2);
    const init4 = Math.min(l4.length, 1);

    setMatrixConfig({
      level1: init1,
      level2: init2,
      level3: init3,
      level4: init4,
    });

    setCreateForm({
      title: '',
      code: `KT45P_${randomStr}`,
      subject_id: subId,
      duration_minutes: 45,
      total_points: 10,
      pass_points: 5,
      shuffle_questions: true,
      shuffle_options: true,
      description: '',
    });

    // Mặc định bốc ngẫu nhiên phân hóa theo ma trận
    const shuffleAndPick = (arr: Question[], count: number) => {
      return [...arr].sort(() => 0.5 - Math.random()).slice(0, count).map((q) => q.id);
    };
    setSelectedQuestionIds([
      ...shuffleAndPick(l1, init1),
      ...shuffleAndPick(l2, init2),
      ...shuffleAndPick(l3, init3),
      ...shuffleAndPick(l4, init4),
    ]);

    setFilterLevel('all');
    setSearchKeyword('');
    setShowCreateModal(true);
  };

  // Danh sách câu hỏi hiển thị theo bộ lọc và tìm kiếm
  const displayedQuestions = subjectQuestions.filter((q) => {
    if (filterLevel !== 'all') {
      if (filterLevel === 'selected') {
        if (!selectedQuestionIds.includes(q.id)) return false;
      } else if (q.difficulty_level !== filterLevel) {
        return false;
      }
    }
    if (searchKeyword.trim()) {
      if (!q.content.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  // Toggle chọn câu hỏi
  const handleToggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  // Chọn tất cả hoặc bỏ chọn tất cả câu hỏi của môn này
  const handleSelectAllQuestions = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedQuestionIds(subjectQuestions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  // Submit tạo đề thi mới
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng câu hỏi để đưa vào đề thi!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...createForm,
        status: 'published',
        question_ids: selectedQuestionIds,
        matrix_levels: {
          1: sel1,
          2: sel2,
          3: sel3,
          4: sel4,
        },
      };

      const res: any = await api.post('/exams', payload);
      if (res.success) {
        alert('Tạo đề thi mới thành công! Bạn có thể giao đề cho lớp ngay bây giờ.');
        setShowCreateModal(false);
        fetchExams();
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi tạo đề thi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa đề thi
  const handleDeleteExam = async (examId: number, examTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đề thi: "${examTitle}"?`)) return;

    try {
      const res: any = await api.delete(`/exams/${examId}`);
      if (res.success) {
        fetchExams();
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa đề thi này.');
    }
  };

  // Submit giao đề cho lớp
  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !selectedClassId) return;

    try {
      const payload = {
        class_ids: [Number(selectedClassId)],
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Mở 7 ngày
        max_attempts: maxAttempts,
        view_score_type: viewScoreType,
        show_solutions: showSolutions,
      };

      const res: any = await api.post(`/exams/${showAssignModal.id}/assign`, payload);
      if (res.success) {
        alert('Giao đề thi cho lớp học thành công!');
        setShowAssignModal(null);
        fetchExams();
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi giao đề thi');
    }
  };

  // Mở modal xem trước chi tiết đề thi (kèm câu hỏi, công thức KaTeX & đáp án)
  const handleOpenPreview = async (exam: Exam) => {
    setLoadingPreview(true);
    setPreviewExam(null);
    try {
      const res: any = await api.get(`/exams/${exam.id}`);
      if (res.success) {
        setPreviewExam(res.data);
      } else {
        alert('Không thể tải chi tiết đề thi: ' + (res.message || 'Lỗi kết nối'));
      }
    } catch (err: any) {
      alert('Lỗi tải nội dung đề thi: ' + (err?.message || 'Không thể kết nối máy chủ'));
    } finally {
      setLoadingPreview(false);
    }
  };

  // Chuyển trực tiếp từ màn hình xem trước sang giao đề thi cho lớp
  const handleAssignFromPreview = () => {
    if (previewExam) {
      const targetExam = exams.find((e) => e.id === previewExam.id) || previewExam;
      setPreviewExam(null);
      setShowAssignModal(targetExam);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar với nút Tạo đề thi mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Đề Thi & Bài Kiểm Tra</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo đề thi mới, lấy câu hỏi từ ngân hàng, thiết lập thời gian làm bài và phân phối cho học sinh
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Đề Thi Mới</span>
        </button>
      </div>

      {/* Grid Đề thi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Đang tải danh sách đề thi...
          </div>
        ) : exams.length > 0 ? (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {exam.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exam.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3
                  onClick={() => handleOpenPreview(exam)}
                  className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-indigo-600 cursor-pointer transition-colors"
                  title="Bấm để xem trước câu hỏi và đáp án của đề thi"
                >
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                  {exam.description || 'Chưa có mô tả chi tiết'}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.duration_minutes} phút</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.exam_questions_count || 0} câu hỏi</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span>Thang {exam.total_points} đ</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(exam)}
                  className="flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Xem trước nội dung câu hỏi và đáp án của đề thi"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Xem trước</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(exam)}
                  className="flex items-center justify-center gap-1 px-2.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs shadow-indigo-600/10"
                  title="Giao đề thi cho lớp học"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Giao Lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/exams/${exam.id}/analytics`)}
                  className="flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  title="Xem phổ điểm và phân tích câu sai"
                >
                  <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Phổ Điểm</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 p-8 space-y-3">
            <p>Chưa có đề thi nào được tạo trong hệ thống.</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đề thi đầu tiên ngay</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= MODAL TẠO ĐỀ THI MỚI ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Tạo Đề Thi / Bài Kiểm Tra Mới Phân Hóa Chuẩn</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập ma trận phân hóa nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) và quản lý câu hỏi
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              {/* Tên đề thi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên đề thi / Bài kiểm tra *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ví dụ: Kiểm tra 1 tiết Hóa học - Chưng cất và tách chiết"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Mã đề & Môn học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Mã đề thi *</label>
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sinh mã ngẫu nhiên</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    placeholder="KT45P_CHEM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs uppercase font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Môn học tiếp nhận *</label>
                  <select
                    value={createForm.subject_id}
                    onChange={(e) => handleSubjectChange(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thời lượng làm bài & Thang điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời gian làm bài (phút) *</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    required
                    value={createForm.duration_minutes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-indigo-600"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[15, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, duration_minutes: mins })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                          createForm.duration_minutes === mins
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thang điểm tổng *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={createForm.total_points}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, total_points: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm đạt yêu cầu</label>
                  <input
                    type="number"
                    min={0}
                    max={createForm.total_points}
                    value={createForm.pass_points}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, pass_points: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Trộn câu hỏi và trộn đáp án */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.shuffle_questions}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, shuffle_questions: e.target.checked })
                    }
                    className="rounded text-indigo-600"
                  />
                  <span className="font-medium text-slate-700">Trộn thứ tự câu hỏi cho từng học sinh</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.shuffle_options}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, shuffle_options: e.target.checked })
                    }
                    className="rounded text-indigo-600"
                  />
                  <span className="font-medium text-slate-700">Trộn thứ tự đáp án (A, B, C, D)</span>
                </label>
              </div>

              {/* Mô tả / Hướng dẫn */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hướng dẫn làm bài thi (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Ví dụ: Đề thi gồm các câu trắc nghiệm đơn, trắc nghiệm đúng sai và trả lời ngắn. Thí sinh làm bài nghiêm túc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs"
                />
              </div>

              {/* ================= KHU VỰC THIẾT LẬP MA TRẬN MỨC ĐỘ NHẬN THỨC ================= */}
              <div className="bg-linear-to-br from-indigo-50/70 via-white to-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Ma Trận Phân Hóa Mức Độ Nhận Thức (Chuẩn Bộ GD&ĐT)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Quy định chính xác số câu cho từng mức độ để phân hóa học sinh rõ ràng, chống tình trạng đề thi ngẫu nhiên toàn câu dễ.
                    </p>
                  </div>

                  {/* Nút hành động Bốc ngẫu nhiên theo ma trận */}
                  <button
                    type="button"
                    onClick={handleAutoSelectByMatrix}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>⚡ Bốc ngẫu nhiên theo ma trận này</span>
                  </button>
                </div>

                {/* 4 ô nhập số câu cho 4 mức độ nhận thức */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Mức 1: Nhận biết */}
                  <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-800 text-xs">1. Nhận biết</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                        Có sẵn: {level1Questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={level1Questions.length}
                        value={matrixConfig.level1}
                        onChange={(e) =>
                          setMatrixConfig({ ...matrixConfig, level1: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg p-2 text-center text-sm font-bold text-sky-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">câu</span>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {totalMatrixQuestions > 0
                        ? `${Math.round((matrixConfig.level1 / totalMatrixQuestions) * 100)}% tổng số`
                        : '0%'}
                    </div>
                  </div>

                  {/* Mức 2: Thông hiểu */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-xs">2. Thông hiểu</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Có sẵn: {level2Questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={level2Questions.length}
                        value={matrixConfig.level2}
                        onChange={(e) =>
                          setMatrixConfig({ ...matrixConfig, level2: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-lg p-2 text-center text-sm font-bold text-emerald-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">câu</span>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {totalMatrixQuestions > 0
                        ? `${Math.round((matrixConfig.level2 / totalMatrixQuestions) * 100)}% tổng số`
                        : '0%'}
                    </div>
                  </div>

                  {/* Mức 3: Vận dụng */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 text-xs">3. Vận dụng</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Có sẵn: {level3Questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={level3Questions.length}
                        value={matrixConfig.level3}
                        onChange={(e) =>
                          setMatrixConfig({ ...matrixConfig, level3: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-lg p-2 text-center text-sm font-bold text-amber-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">câu</span>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {totalMatrixQuestions > 0
                        ? `${Math.round((matrixConfig.level3 / totalMatrixQuestions) * 100)}% tổng số`
                        : '0%'}
                    </div>
                  </div>

                  {/* Mức 4: Vận dụng cao */}
                  <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-800 text-xs">4. Vận dụng cao</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                        Có sẵn: {level4Questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={level4Questions.length}
                        value={matrixConfig.level4}
                        onChange={(e) =>
                          setMatrixConfig({ ...matrixConfig, level4: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 focus:border-rose-500 rounded-lg p-2 text-center text-sm font-bold text-rose-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">câu</span>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {totalMatrixQuestions > 0
                        ? `${Math.round((matrixConfig.level4 / totalMatrixQuestions) * 100)}% tổng số`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh tỉ lệ mẫu */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Tỉ lệ phân hóa mẫu:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(40, 30, 20, 10, 20)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    40% - 30% - 20% - 10% (Chuẩn GDPT 2018)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(50, 30, 20, 0, 20)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    50% - 30% - 20% - 0% (Cơ bản)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(20, 30, 30, 20, 20)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    20% - 30% - 30% - 20% (Phân hóa cao)
                  </button>
                </div>
              </div>

              {/* Thống kê phân hóa câu hỏi đang được chọn vào đề */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                  <span className="font-bold text-slate-800">
                    Tổng cộng đề thi:{' '}
                    <strong className="text-indigo-600 text-sm">{selTotal} câu</strong>
                    {selTotal > 0 && (
                      <span className="ml-1 text-slate-500 font-normal">
                        (~{(createForm.total_points / selTotal).toFixed(2)} đ/câu)
                      </span>
                    )}
                  </span>

                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Nhận biết: {sel1} ({pct1}%)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Thông hiểu: {sel2} ({pct2}%)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Vận dụng: {sel3} ({pct3}%)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Vận dụng cao: {sel4} ({pct4}%)
                    </span>
                  </div>
                </div>

                {/* Thanh Progress bar đa sắc tỉ lệ */}
                {selTotal > 0 ? (
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                    <div style={{ width: `${pct1}%` }} className="bg-sky-500 h-full transition-all" title={`Nhận biết: ${pct1}%`} />
                    <div style={{ width: `${pct2}%` }} className="bg-emerald-500 h-full transition-all" title={`Thông hiểu: ${pct2}%`} />
                    <div style={{ width: `${pct3}%` }} className="bg-amber-500 h-full transition-all" title={`Vận dụng: ${pct3}%`} />
                    <div style={{ width: `${pct4}%` }} className="bg-rose-500 h-full transition-all" title={`Vận dụng cao: ${pct4}%`} />
                  </div>
                ) : (
                  <div className="w-full h-2 rounded-full bg-slate-200" />
                )}
              </div>

              {/* Khu vực chọn câu hỏi chi tiết từ Ngân hàng */}
              <div className="border border-slate-200 rounded-xl overflow-hidden pt-1">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800">Danh sách câu hỏi trong ngân hàng: </span>
                    <span className="text-indigo-600 font-bold">
                      Đã chọn {selTotal} / {subjectQuestions.length} câu
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllQuestions(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllQuestions(false)}
                      className="text-slate-500 hover:text-slate-700 font-semibold text-[11px] cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                {/* Tabs lọc câu hỏi theo mức độ nhận thức & Ô tìm kiếm */}
                <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterLevel('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({subjectQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLevel(1)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 1
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                      }`}
                    >
                      1. Nhận biết ({level1Questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLevel(2)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      2. Thông hiểu ({level2Questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLevel(3)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      3. Vận dụng ({level3Questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLevel(4)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 4
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      4. Vận dụng cao ({level4Questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLevel('selected')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterLevel === 'selected'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      Đã chọn ({selTotal})
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Tìm câu hỏi..."
                      className="w-36 sm:w-44 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                  {displayedQuestions.length > 0 ? (
                    displayedQuestions.map((q, idx) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q.id)}
                          className={`p-3 rounded-lg border text-xs flex items-start gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium'
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-indigo-600 pointer-events-none shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900">Câu {idx + 1}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  q.difficulty_level === 1
                                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                    : q.difficulty_level === 2
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : q.difficulty_level === 3
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {q.difficulty_level === 1
                                  ? '1. Nhận biết'
                                  : q.difficulty_level === 2
                                  ? '2. Thông hiểu'
                                  : q.difficulty_level === 3
                                  ? '3. Vận dụng'
                                  : '4. Vận dụng cao'}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {q.question_type === 'fill_in_blank'
                                  ? 'Trả lời ngắn'
                                  : q.question_type === 'true_false'
                                  ? 'Đúng / Sai'
                                  : 'Trắc nghiệm'}
                              </span>
                            </div>
                            <div className="line-clamp-2 text-slate-800">
                              <MathRenderer content={q.content} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại.
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={selTotal === 0}
                  onClick={() => {
                    const mockExam = {
                      id: 0,
                      title: createForm.title || 'Bản nháp đề thi mới',
                      code: createForm.code || 'NHAP',
                      duration_minutes: createForm.duration_minutes,
                      total_points: createForm.total_points,
                      subject: subjects.find((s) => s.id === createForm.subject_id),
                      exam_questions: selectedQuestions.map((q, idx) => ({
                        id: idx + 1,
                        order_index: idx + 1,
                        points: (Number(createForm.total_points) / (selectedQuestions.length || 1)).toFixed(2),
                        question: q,
                      })),
                    };
                    setPreviewExam(mockExam);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Xem trước ({selTotal} câu)</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Đang tạo đề thi...' : `Hoàn Tất & Tạo Đề Thi (${selTotal} câu)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL GIAO ĐỀ THI CHO LỚP ================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Giao Đề Thi Cho Lớp Học</h3>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <p className="text-xs text-slate-500 truncate">
                Đề: <span className="font-semibold text-slate-800">{showAssignModal.title}</span>
              </p>
              <button
                type="button"
                onClick={() => handleOpenPreview(showAssignModal)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                title="Xem lại nội dung câu hỏi của đề thi trước khi giao"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem lại câu hỏi</span>
              </button>
            </div>

            <form onSubmit={handleAssignExam} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn lớp học *</label>
                <select
                  required
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Chọn lớp học nhận đề --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} ({c.students_count || 0} học sinh)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số lần được phép thi</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Xem điểm</label>
                  <select
                    value={viewScoreType}
                    onChange={(e) => setViewScoreType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="immediately">Xem ngay sau nộp</option>
                    <option value="after_closed">Sau khi đóng đề</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showSolutions"
                  checked={showSolutions}
                  onChange={(e) => setShowSolutions(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="showSolutions" className="text-slate-700 font-medium">
                  Cho phép xem lời giải sau khi kỳ thi kết thúc
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-xs"
                >
                  Xác nhận giao đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XEM TRƯỚC ĐỀ THI & BÀI KIỂM TRA ================= */}
      {(previewExam || loadingPreview) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none overflow-hidden">
            {loadingPreview ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium">Đang tải toàn bộ câu hỏi và đáp án đề thi...</p>
              </div>
            ) : previewExam && (
              <>
                {/* Header Modal - Không in khi print */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 print:hidden shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {previewExam.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {previewExam.subject?.name || 'Môn học'}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {previewExam.duration_minutes} phút
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {previewExam.exam_questions?.length || 0} câu hỏi
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-1">
                      {previewExam.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Toggle Hiện / Ẩn đáp án & Lời giải */}
                    <button
                      type="button"
                      onClick={() => setShowAnswerKey(!showAnswerKey)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        showAnswerKey
                          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={showAnswerKey ? 'Đang hiện đáp án & lời giải (Bấm để ẩn)' : 'Đang ẩn đáp án (Bấm để hiện)'}
                    >
                      {showAnswerKey ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đáp án: Đang BẬT</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Đáp án: Đang TẮT</span>
                        </>
                      )}
                    </button>

                    {/* Nút In đề thi */}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="In đề thi ra giấy hoặc xuất PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">In đề thi</span>
                    </button>

                    {/* Nút Giao cho lớp ngay */}
                    <button
                      type="button"
                      onClick={handleAssignFromPreview}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Giao đề thi này cho lớp học"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Giao Lớp Ngay</span>
                    </button>

                    {/* Nút Đóng */}
                    <button
                      type="button"
                      onClick={() => setPreviewExam(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Đóng xem trước"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Nội dung đề thi xem trước */}
                <div className="overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0 print:overflow-visible">
                  {/* Tiêu đề trang in chuẩn Bộ GD&ĐT */}
                  <div className="border-b-2 border-slate-900 pb-5 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-800">
                      <div>
                        <p className="font-bold uppercase tracking-wide">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                        <p className="font-semibold text-slate-600">TRƯỜNG THPT CHUYÊN / THPT</p>
                        <p className="italic text-[11px] text-slate-500 mt-0.5">(Đề thi có {previewExam.exam_questions?.length || 0} câu hỏi)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold uppercase tracking-wide text-indigo-950">ĐỀ KIỂM TRA CHÍNH THỨC</p>
                        <p className="font-semibold text-slate-700">Môn: {previewExam.subject?.name || 'Khảo sát'}</p>
                        <p className="text-[11px] text-slate-600">Thời gian làm bài: {previewExam.duration_minutes} phút</p>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">MÃ ĐỀ THI: {previewExam.code}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-slate-400">
                      <div>Họ và tên thí sinh: ............................................................................................</div>
                      <div>Số báo danh / Lớp: ......................................</div>
                    </div>
                  </div>

                  {/* Thông tin ma trận nhận thức & dạng câu hỏi */}
                  {(() => {
                    const questions = (previewExam.exam_questions || []).map((eq: any) => eq.question).filter(Boolean);
                    const l1 = questions.filter((q: any) => q.difficulty_level === 1).length;
                    const l2 = questions.filter((q: any) => q.difficulty_level === 2).length;
                    const l3 = questions.filter((q: any) => q.difficulty_level === 3).length;
                    const l4 = questions.filter((q: any) => q.difficulty_level === 4).length;

                    const singleCount = questions.filter((q: any) => q.question_type === 'single_choice').length;
                    const tfCount = questions.filter((q: any) => q.question_type === 'true_false').length;
                    const fillCount = questions.filter((q: any) => q.question_type === 'fill_in_blank').length;

                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 sm:p-4 text-xs space-y-2 print:hidden">
                        <div className="font-bold text-indigo-950 flex items-center justify-between">
                          <span>Ma Trận Phân Bổ Câu Hỏi & Nhận Thức</span>
                          <span className="text-indigo-600 font-semibold">Tổng: {questions.length} câu • Thang {previewExam.total_points} điểm</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="bg-white border border-sky-200 text-sky-800 px-2 py-0.5 rounded font-medium">Nhận biết: {l1} câu</span>
                          <span className="bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-medium">Thông hiểu: {l2} câu</span>
                          <span className="bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded font-medium">Vận dụng: {l3} câu</span>
                          <span className="bg-white border border-rose-200 text-rose-800 px-2 py-0.5 rounded font-medium">Vận dụng cao: {l4} câu</span>
                          <span className="text-slate-300 mx-1">|</span>
                          <span className="text-slate-600 font-semibold">Trắc nghiệm: {singleCount}</span>
                          <span className="text-slate-600 font-semibold">Đúng/Sai: {tfCount}</span>
                          <span className="text-slate-600 font-semibold">Trả lời ngắn: {fillCount}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Danh sách từng câu hỏi */}
                  <div className="space-y-6">
                    {previewExam.exam_questions && previewExam.exam_questions.length > 0 ? (
                      [...previewExam.exam_questions]
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .map((eq: any, idx: number) => {
                          const q = eq.question;
                          if (!q) return null;

                          return (
                            <div
                              key={eq.id || idx}
                              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5 print:border-none print:shadow-none print:p-0 print:border-b print:pb-4"
                            >
                              {/* Header câu hỏi */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Câu {idx + 1}:
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500">
                                    ({eq.points || (Number(previewExam.total_points) / previewExam.exam_questions.length).toFixed(2)} điểm)
                                  </span>
                                  {/* Badges độ khó & loại */}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded print:hidden ${
                                      q.difficulty_level === 1
                                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                        : q.difficulty_level === 2
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : q.difficulty_level === 3
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    {q.difficulty_level === 1
                                      ? 'Nhận biết'
                                      : q.difficulty_level === 2
                                      ? 'Thông hiểu'
                                      : q.difficulty_level === 3
                                      ? 'Vận dụng'
                                      : 'Vận dụng cao'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded print:hidden uppercase">
                                    {q.question_type === 'fill_in_blank'
                                      ? 'Trả lời ngắn'
                                      : q.question_type === 'true_false'
                                      ? 'Đúng / Sai'
                                      : 'Trắc nghiệm'}
                                  </span>
                                </div>
                              </div>

                              {/* Nội dung câu hỏi KaTeX */}
                              <div className="text-sm font-medium text-slate-900 leading-relaxed">
                                <MathRenderer content={q.content} />
                              </div>

                              {/* Hiển thị các phương án / lựa chọn */}
                              {q.question_type === 'true_false' ? (
                                <div className="space-y-3 pt-1">
                                  <div className="relative flex py-1 items-center">
                                    <div className="grow border-t border-slate-200" />
                                    <span className="shrink mx-3 text-[11px] font-semibold text-slate-400">
                                      Chọn đúng hoặc sai
                                    </span>
                                    <div className="grow border-t border-slate-200" />
                                  </div>

                                  <div className="space-y-2">
                                    {q.options?.map((opt: any, oIdx: number) => {
                                      const letterPrefix = opt.content.match(/^[a-d][\)\.]/i)
                                        ? opt.content.substring(0, 2)
                                        : String.fromCharCode(97 + oIdx) + ')';
                                      const rawText = opt.content.replace(/^[a-d][\)\.]\s*/i, '');

                                      return (
                                        <div key={opt.id || oIdx} className="flex items-center gap-2 sm:gap-3">
                                          <div className="flex-1 min-w-0 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 text-xs font-medium leading-relaxed">
                                            <span className="font-bold text-slate-900 mr-1.5">{letterPrefix}</span>
                                            <MathRenderer content={rawText} className="inline" />
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <div
                                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                                                showAnswerKey && opt.is_correct
                                                  ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs'
                                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                                              }`}
                                            >
                                              Đúng
                                            </div>
                                            <div
                                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                                                showAnswerKey && !opt.is_correct
                                                  ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs'
                                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                                              }`}
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
                                <div className="pt-2">
                                  {showAnswerKey ? (
                                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2 text-xs">
                                      <span className="font-semibold text-emerald-800">Đáp án chính xác:</span>
                                      <span className="font-mono font-bold text-emerald-950 bg-white px-2.5 py-1 rounded border border-emerald-300 shadow-2xs">
                                        {q.options?.find((o: any) => o.is_correct)?.content || 'Chưa thiết lập'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="border border-dashed border-slate-300 bg-slate-50/50 rounded-lg p-3 text-xs text-slate-500">
                                      <span>Đáp án của học sinh: _____________________________________________</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                  {q.options?.map((opt: any, oIdx: number) => (
                                    <div
                                      key={opt.id || oIdx}
                                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                                        showAnswerKey && opt.is_correct
                                          ? 'border-emerald-400 bg-emerald-50/60 text-emerald-950 font-semibold shadow-2xs'
                                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                                      }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                          showAnswerKey && opt.is_correct
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <div className="flex-1">
                                        <MathRenderer content={opt.content} />
                                      </div>
                                      {showAnswerKey && opt.is_correct && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Lời giải chi tiết */}
                              {showAnswerKey && q.explanation && (
                                <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 mt-2">
                                  <span className="font-bold text-indigo-950">Giải thích chi tiết: </span>
                                  <MathRenderer content={q.explanation} className="mt-1" />
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Đề thi chưa có câu hỏi nào được gán vào.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Modal */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 print:hidden shrink-0">
                  <span className="text-xs text-slate-500 font-medium">
                    Tổng cộng: <strong className="text-slate-800">{previewExam.exam_questions?.length || 0}</strong> câu hỏi
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewExam(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleAssignFromPreview}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Giao Đề Cho Lớp</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
