import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Exam, Question } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import mammoth from 'mammoth';
import { parseExamText, ParsedExamResult, ParsedQuestion } from '../../utils/wordExamParser';
import { generateExamDocx, downloadBlob, OfflineExamData } from '../../utils/docxExport';
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
  UploadCloud,
  Download,
  Copy,
  Check,
  FileCheck,
  Code,
  GraduationCap,
} from 'lucide-react';

export const ExamBuilderView: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'manual' | 'json'>('manual');
  const [jsonExamText, setJsonExamText] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Quick Word Exam & Sub-exam State
  const [showQuickWordModal, setShowQuickWordModal] = useState(false);
  const [quickWordParsing, setQuickWordParsing] = useState(false);
  const [parsedExam, setParsedExam] = useState<ParsedExamResult | null>(null);
  const [isSubExamMode, setIsSubExamMode] = useState(true);
  const [subExamPicks, setSubExamPicks] = useState({
    part1Count: 0,
    part1Points: 4,
    part2Count: 0,
    part2Points: 4,
    part3Count: 0,
    part3Points: 2,
  });
  const [quickExamTitle, setQuickExamTitle] = useState('');
  const [quickSubjectId, setQuickSubjectId] = useState(1);
  const [quickGradeId, setQuickGradeId] = useState('');
  const [quickDuration, setQuickDuration] = useState(40);
  const [quickShuffleQuestions, setQuickShuffleQuestions] = useState(true);
  const [quickShuffleOptions, setQuickShuffleOptions] = useState(true);
  const [quickSaveToBank, setQuickSaveToBank] = useState(true);
  const [quickAssignClassIds, setQuickAssignClassIds] = useState<number[]>([]);
  const [isSubmittingQuickExam, setIsSubmittingQuickExam] = useState(false);

  // Offline Shuffling & Word Export Modal
  const [showOfflineModal, setShowOfflineModal] = useState<Exam | null>(null);
  const [offlineConfig, setOfflineConfig] = useState({
    num_codes: 4,
    start_code: 1,
    school_name: 'TRƯỜNG THPT HẬU NGHĨA',
    department_name: 'TỔ CHUYÊN MÔN',
    city_name: 'Hậu Nghĩa',
    teacher_name: 'Lê Trọng Đức',
    shuffle_questions: true,
    shuffle_options: true,
  });
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [offlinePreviewData, setOfflinePreviewData] = useState<OfflineExamData | null>(null);
  const [loadingOfflinePreview, setLoadingOfflinePreview] = useState(false);

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

  // Xử lý nạp file Word tạo đề & đề con
  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQuickWordParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer });
      const rawText = res.value;
      const parsed = parseExamText(rawText);
      setParsedExam(parsed);

      if (parsed.title && parsed.title !== 'Đề thi từ file Word') {
        setQuickExamTitle(parsed.title);
      } else {
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setQuickExamTitle(titleWithoutExt);
      }

      if (parsed.duration_minutes) {
        setQuickDuration(parsed.duration_minutes);
      }

      if (parsed.school_name) {
        setOfflineConfig((prev) => ({
          ...prev,
          school_name: parsed.school_name || prev.school_name,
          department_name: parsed.department_name || prev.department_name,
        }));
      }

      // Cài đặt số câu cho đề con (như Azota)
      setSubExamPicks({
        part1Count: Math.min(parsed.groups.part1.length, 18),
        part1Points: 4,
        part2Count: Math.min(parsed.groups.part2.length, 4),
        part2Points: 4,
        part3Count: Math.min(parsed.groups.part3.length, 6),
        part3Points: 2,
      });
    } catch (err: any) {
      alert('Không thể đọc file Word: ' + err.message);
    } finally {
      setQuickWordParsing(false);
    }
  };

  // Submit tạo đề thi nhanh từ file Word (kèm đề con & tự lưu ngân hàng)
  const handleQuickWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedExam || parsedExam.questions.length === 0) {
      alert('Chưa có câu hỏi nào được bóc tách từ file Word!');
      return;
    }
    if (!quickExamTitle.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }

    let selectedQuestions: ParsedQuestion[] = [];
    if (isSubExamMode) {
      // Bốc ngẫu nhiên câu hỏi theo từng phần
      const shuffleAndTake = (list: ParsedQuestion[], count: number, totalPoints: number) => {
        const picked = [...list].sort(() => 0.5 - Math.random()).slice(0, count);
        const ptsPerQ = picked.length > 0 ? Number((totalPoints / picked.length).toFixed(2)) : 1;
        return picked.map((q) => ({ ...q, points: ptsPerQ }));
      };

      const p1 = shuffleAndTake(parsedExam.groups.part1, subExamPicks.part1Count, subExamPicks.part1Points);
      const p2 = shuffleAndTake(parsedExam.groups.part2, subExamPicks.part2Count, subExamPicks.part2Points);
      const p3 = shuffleAndTake(parsedExam.groups.part3, subExamPicks.part3Count, subExamPicks.part3Points);
      selectedQuestions = [...p1, ...p2, ...p3];

      if (selectedQuestions.length === 0) {
        alert('Vui lòng chọn ít nhất 1 câu hỏi cho các nhóm trong đề con!');
        return;
      }
    } else {
      selectedQuestions = parsedExam.questions;
    }

    setIsSubmittingQuickExam(true);
    try {
      const payload: any = {
        title: quickExamTitle.trim(),
        subject_id: quickSubjectId,
        grade_id: quickGradeId ? Number(quickGradeId) : null,
        duration_minutes: quickDuration,
        total_points: isSubExamMode
          ? (subExamPicks.part1Points + subExamPicks.part2Points + subExamPicks.part3Points)
          : 10.0,
        pass_points: 5.0,
        shuffle_questions: quickShuffleQuestions,
        shuffle_options: quickShuffleOptions,
        save_to_bank: quickSaveToBank,
        questions: selectedQuestions,
        assign_class_ids: quickAssignClassIds,
      };

      const res: any = await api.post('/exams/quick-create', payload);
      if (res.success) {
        alert('🎉 Tạo đề thi thành công! Câu hỏi đã tự động lưu vào ngân hàng đề.');
        setShowQuickWordModal(false);
        setParsedExam(null);
        fetchExams();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo đề thi.');
    } finally {
      setIsSubmittingQuickExam(false);
    }
  };

  // Submit tạo đề thi từ JSON / AI Prompt
  const handleJsonExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonExamText.trim()) {
      alert('Vui lòng dán chuỗi JSON đề thi vào ô bên dưới.');
      return;
    }

    setIsSubmittingJson(true);
    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonExamText);
      } catch (jsonErr) {
        throw new Error('Định dạng JSON không hợp lệ! Vui lòng kiểm tra lại cú pháp.');
      }

      // Hỗ trợ cả mảng câu hỏi [...] hoặc object { title, questions: [...] }
      const questionsList = Array.isArray(parsedJson) ? parsedJson : parsedJson.questions;
      if (!Array.isArray(questionsList) || questionsList.length === 0) {
        throw new Error('JSON phải chứa mảng danh sách câu hỏi hợp lệ!');
      }

      const examTitle = (!Array.isArray(parsedJson) && parsedJson.title)
        ? parsedJson.title
        : createForm.title.trim() || 'Đề Thi Từ AI';

      const payload = {
        title: examTitle,
        code: createForm.code || undefined,
        subject_id: createForm.subject_id,
        duration_minutes: createForm.duration_minutes,
        total_points: createForm.total_points,
        pass_points: createForm.pass_points,
        shuffle_questions: createForm.shuffle_questions,
        shuffle_options: createForm.shuffle_options,
        save_to_bank: true,
        questions: questionsList,
      };

      const res: any = await api.post('/exams/quick-create', payload);
      if (res.success) {
        alert('🎉 Đã tạo đề thi từ JSON / AI thành công!');
        setShowCreateModal(false);
        setJsonExamText('');
        fetchExams();
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi nhập đề từ JSON.');
    } finally {
      setIsSubmittingJson(false);
    }
  };

  // Sao chép Prompt mẫu cho AI
  const copyAiPrompt = () => {
    const promptText = `Bạn là chuyên gia khảo thí THPT. Hãy tạo cho tôi 1 đề thi trắc nghiệm môn Hóa Học (hoặc môn tương ứng) gồm 10 câu hỏi theo định dạng JSON chuẩn xác sau:
[
  {
    "content": "Câu 1: Số proton trong hạt nhân nguyên tử Carbon là bao nhiêu?",
    "question_type": "single_choice",
    "difficulty_level": 1,
    "explanation": "Carbon có số hiệu nguyên tử Z = 6.",
    "options": [
      {"content": "6", "is_correct": true},
      {"content": "12", "is_correct": false},
      {"content": "8", "is_correct": false},
      {"content": "14", "is_correct": false}
    ]
  }
]
Chỉ trả về chuỗi JSON thuần túy trong cặp ngoặc vuông [], không thêm giải thích hay lời mở đầu.`;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Mở modal Đảo Đề Offline
  const handleOpenOfflineModal = (exam: Exam) => {
    setShowOfflineModal(exam);
    const subName = exam.subject?.name ? exam.subject.name.toUpperCase() : '';
    setOfflineConfig((prev) => ({
      ...prev,
      school_name: prev.school_name || 'TRƯỜNG THPT HẬU NGHĨA',
      department_name: subName ? `TỔ ${subName}` : (prev.department_name && prev.department_name !== 'TỔ HÓA HỌC' ? prev.department_name : 'TỔ CHUYÊN MÔN'),
    }));
    setOfflinePreviewData(null);
  };

  // Tải file Word đề thi đảo Offline (.docx)
  const handleExportOfflineDocx = async () => {
    if (!showOfflineModal) return;
    setIsExportingDocx(true);
    try {
      const res: any = await api.get(`/exams/${showOfflineModal.id}/shuffled-offline`, {
        params: offlineConfig,
      });
      if (res.success && res.data) {
        const fullData: OfflineExamData = {
          ...res.data,
          school_name: offlineConfig.school_name,
          department_name: offlineConfig.department_name,
          city_name: offlineConfig.city_name,
          teacher_name: offlineConfig.teacher_name,
        };
        const blob = await generateExamDocx(fullData);
        downloadBlob(blob, `De_Thi_${showOfflineModal.code}_${offlineConfig.num_codes}_MaDe.docx`);
      }
    } catch (err: any) {
      alert('Lỗi xuất file Word: ' + (err?.response?.data?.message || err?.message));
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Xem trước bảng ma trận đáp án Offline
  const handleFetchOfflinePreview = async () => {
    if (!showOfflineModal) return;
    setLoadingOfflinePreview(true);
    try {
      const res: any = await api.get(`/exams/${showOfflineModal.id}/shuffled-offline`, {
        params: offlineConfig,
      });
      if (res.success && res.data) {
        setOfflinePreviewData(res.data);
      }
    } catch (err: any) {
      alert('Lỗi tải dữ liệu đảo đề: ' + (err?.message || 'Không thể kết nối máy chủ'));
    } finally {
      setLoadingOfflinePreview(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setShowQuickWordModal(true);
              setParsedExam(null);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Tải Word Tạo Đề & Đề Con</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đề Thi Mới</span>
          </button>
        </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(exam)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Xem trước nội dung câu hỏi và đáp án của đề thi"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Xem</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(exam)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs shadow-indigo-600/10"
                  title="Giao đề thi cho lớp học"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Giao Lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenOfflineModal(exam)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                  title="Đảo đề thi & xuất file Word offline (nhiều mã đề kèm đáp án)"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>Đảo Đề Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/exams/${exam.id}/analytics`)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
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
                  Thiết lập ma trận phân hóa nhận thức hoặc dán trực tiếp JSON từ AI (ChatGPT/Gemini)
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setCreateModalTab('manual')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  createModalTab === 'manual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Thủ Công & Ma Trận Phân Hóa</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('json')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  createModalTab === 'json'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Nhập Đề Bằng JSON / AI Prompt</span>
              </button>
            </div>

            {createModalTab === 'json' ? (
              /* TAB NHẬP BẰNG JSON / AI */
              <form onSubmit={handleJsonExamSubmit} className="space-y-4 text-xs">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Mẫu Prompt cho ChatGPT / Claude / Gemini
                    </span>
                    <button
                      type="button"
                      onClick={copyAiPrompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-all shadow-xs"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPrompt ? 'Đã sao chép prompt!' : 'Sao chép Prompt mẫu'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Bấm nút <strong>"Sao chép Prompt mẫu"</strong> ở trên, sau đó dán vào ChatGPT kèm nội dung bài học. Khi ChatGPT trả về chuỗi JSON, bạn chỉ cần copy và dán vào ô bên dưới là có ngay đề thi!
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên đề thi (tùy chọn - nếu JSON có trường title sẽ tự điền)
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Ví dụ: Đề Kiểm Tra Giữa Kì 1 Hóa Học 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Môn học *</label>
                    <select
                      value={createForm.subject_id}
                      onChange={(e) => setCreateForm({ ...createForm, subject_id: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Thời gian làm bài (phút) *</label>
                    <input
                      type="number"
                      value={createForm.duration_minutes}
                      onChange={(e) => setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dán chuỗi JSON đề thi vào đây *
                  </label>
                  <textarea
                    rows={12}
                    required
                    value={jsonExamText}
                    onChange={(e) => setJsonExamText(e.target.value)}
                    placeholder={`[&#10;  {&#10;    "content": "Câu 1: Số proton trong hạt nhân nguyên tử Carbon là bao nhiêu?",&#10;    "question_type": "single_choice",&#10;    "difficulty_level": 1,&#10;    "options": [&#10;      {"content": "6", "is_correct": true},&#10;      {"content": "12", "is_correct": false}&#10;    ]&#10;  }&#10;]`}
                    className="w-full bg-slate-900 text-emerald-400 font-mono border border-slate-700 rounded-xl p-3.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingJson}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{isSubmittingJson ? 'Đang phân tích & tạo đề...' : 'Tạo Đề Từ JSON Ngay'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* TAB THỦ CÔNG & MA TRẬN */
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
            )}
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

      {/* ================= MODAL TẠO ĐỀ CẤP TỐC TỪ WORD & ĐỀ CON ================= */}
      {showQuickWordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  <span>Tạo Đề Thi Cấp Tốc Từ File Word & Tạo Đề Con</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tải file Word lên có đề ngay, tự động chia nhóm câu hỏi, hỗ trợ bốc đề con ngẫu nhiên và lưu ngân hàng
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuickWordModal(false);
                  setParsedExam(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickWordSubmit} className="space-y-4 text-xs">
              {/* KHU VỰC TẢI FILE WORD */}
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
                <input
                  type="file"
                  id="quickWordInput"
                  accept=".docx"
                  onChange={handleWordFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="quickWordInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-700 hover:underline">
                      {quickWordParsing ? 'Đang đọc và bóc tách câu hỏi...' : 'Bấm để chọn file Word (.docx)'}
                    </span>
                    <span className="text-slate-500"> hoặc kéo thả vào đây</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ file Word chuẩn GDPT: Phần I (A,B,C,D), Phần II (Đúng/Sai a,b,c,d), Phần III (Trả lời ngắn)
                  </p>
                </label>
              </div>

              {parsedExam && (
                <div className="space-y-4">
                  {/* BÁO CÁO KẾT QUẢ PARSE */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-900 text-xs">
                          Đã bóc tách thành công {parsedExam.totalCount} câu hỏi:
                        </span>
                        <div className="text-[11px] text-emerald-700 flex gap-3 mt-0.5">
                          <span>Nhóm 1 (Trắc nghiệm): {parsedExam.groups.part1.length} câu</span>
                          <span>Nhóm 2 (Đúng/Sai): {parsedExam.groups.part2.length} câu</span>
                          <span>Nhóm 3 (Trả lời ngắn): {parsedExam.groups.part3.length} câu</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* THIẾT LẬP THÔNG TIN CƠ BẢN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tên đề thi *</label>
                      <input
                        type="text"
                        required
                        value={quickExamTitle}
                        onChange={(e) => setQuickExamTitle(e.target.value)}
                        placeholder="Nhập tên đề thi..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Môn học *</label>
                      <select
                        value={quickSubjectId}
                        onChange={(e) => setQuickSubjectId(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      >
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Khối lớp (Tùy chọn)</label>
                      <select
                        value={quickGradeId}
                        onChange={(e) => setQuickGradeId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="">-- Mặc định --</option>
                        <option value="1">Khối 10</option>
                        <option value="2">Khối 11</option>
                        <option value="3">Khối 12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Thời gian làm bài (phút) *</label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        required
                        value={quickDuration}
                        onChange={(e) => setQuickDuration(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700"
                      />
                    </div>
                  </div>

                  {/* TÍNH NĂNG TẠO ĐỀ CON (THEO CHUẨN AZOTA) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs">Tạo đề con từ đề gốc</span>
                        <p className="text-[11px] text-slate-500">
                          Bốc ngẫu nhiên số lượng câu hỏi từ đề gốc (Ví dụ: đề ôn tập 100 câu, bốc 28 câu ra thi)
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSubExamMode}
                          onChange={(e) => setIsSubExamMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {isSubExamMode && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pb-1">
                          <span>
                            Số lượng câu hỏi cần lấy:{' '}
                            <strong className="text-emerald-700">
                              {subExamPicks.part1Count + subExamPicks.part2Count + subExamPicks.part3Count}/
                              {parsedExam.totalCount} câu
                            </strong>
                          </span>
                          <span>
                            Tổng điểm đã nhập:{' '}
                            <strong className="text-indigo-700">
                              {subExamPicks.part1Points + subExamPicks.part2Points + subExamPicks.part3Points} điểm
                            </strong>
                          </span>
                        </div>

                        {/* Nhóm 1 */}
                        <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700 min-w-[160px]">
                            Nhóm 1 - Trắc nghiệm ({parsedExam.groups.part1.length} câu)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Lấy:</span>
                            <input
                              type="number"
                              min={0}
                              max={parsedExam.groups.part1.length}
                              value={subExamPicks.part1Count}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part1Count: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold"
                            />
                            <span className="text-slate-400">câu | Điểm:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={subExamPicks.part1Points}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part1Points: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Nhóm 2 */}
                        <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700 min-w-[160px]">
                            Nhóm 2 - Đúng/Sai ({parsedExam.groups.part2.length} câu)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Lấy:</span>
                            <input
                              type="number"
                              min={0}
                              max={parsedExam.groups.part2.length}
                              value={subExamPicks.part2Count}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part2Count: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold"
                            />
                            <span className="text-slate-400">câu | Điểm:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={subExamPicks.part2Points}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part2Points: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Nhóm 3 */}
                        <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700 min-w-[160px]">
                            Nhóm 3 - Trả lời ngắn ({parsedExam.groups.part3.length} câu)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Lấy:</span>
                            <input
                              type="number"
                              min={0}
                              max={parsedExam.groups.part3.length}
                              value={subExamPicks.part3Count}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part3Count: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold"
                            />
                            <span className="text-slate-400">câu | Điểm:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={subExamPicks.part3Points}
                              onChange={(e) =>
                                setSubExamPicks({ ...subExamPicks, part3Points: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-indigo-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ĐẢO ĐỀ & GIAO LỚP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={quickShuffleQuestions}
                        onChange={(e) => setQuickShuffleQuestions(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-slate-700">Đảo thứ tự câu hỏi và đáp án</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <input
                        type="checkbox"
                        checked={quickSaveToBank}
                        onChange={(e) => setQuickSaveToBank(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-emerald-900">
                        ✓ Tự động lưu câu hỏi vào Ngân hàng đề
                      </span>
                    </label>
                  </div>

                  {/* CHỌN LỚP NHẬN ĐỀ */}
                  {classes.length > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Giao đề thi ngay cho lớp học (tùy chọn)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((cls) => {
                          const isSelected = quickAssignClassIds.includes(cls.id);
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                setQuickAssignClassIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {cls.name} ({cls.students_count || 0} HS)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickWordModal(false);
                    setParsedExam(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickExam || !parsedExam}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isSubmittingQuickExam ? 'Đang tạo & lưu...' : 'Xác Nhận Tạo Đề & Giao Bài'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ĐẢO ĐỀ OFFLINE & XUẤT FILE WORD ================= */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  <span>Đảo Đề Thi & Xuất File Word (.docx) Làm Bài Offline</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đề thi: <strong>{showOfflineModal.title}</strong> ({showOfflineModal.code})
                </p>
              </div>
              <button
                onClick={() => setShowOfflineModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Trường / Sở GD&ĐT</label>
                  <input
                    type="text"
                    value={offlineConfig.school_name}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, school_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tổ chuyên môn</label>
                  <input
                    type="text"
                    value={offlineConfig.department_name}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, department_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo viên ra đề (Ký tên)</label>
                  <input
                    type="text"
                    value={offlineConfig.teacher_name}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, teacher_name: e.target.value })}
                    placeholder="VD: Lê Trọng Đức"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa phương / Địa danh</label>
                  <input
                    type="text"
                    value={offlineConfig.city_name}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, city_name: e.target.value })}
                    placeholder="VD: Hậu Nghĩa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* CHỌN SỐ LƯỢNG MÃ ĐỀ */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Số lượng mã đề cần đảo</label>
                <div className="flex items-center gap-2">
                  {[2, 4, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setOfflineConfig({ ...offlineConfig, num_codes: n })}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        offlineConfig.num_codes === n
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n} mã đề
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-4">
                    <span className="text-slate-400">Mã bắt đầu:</span>
                    <input
                      type="number"
                      value={offlineConfig.start_code}
                      onChange={(e) => setOfflineConfig({ ...offlineConfig, start_code: Number(e.target.value) })}
                      className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={offlineConfig.shuffle_questions}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, shuffle_questions: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Đảo thứ tự câu hỏi trong nhóm</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={offlineConfig.shuffle_options}
                    onChange={(e) => setOfflineConfig({ ...offlineConfig, shuffle_options: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Đảo thứ tự phương án A, B, C, D</span>
                </label>
              </div>

              {/* BẢNG ĐÁP ÁN MA TRẬN XEM TRƯỚC */}
              {offlinePreviewData && (
                <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-700 pb-2">
                    <span className="font-bold text-emerald-400">BẢNG MA TRẬN ĐÁP ÁN TRA CỨU NHANH</span>
                    <span className="text-slate-400">Tổng cộng: {offlinePreviewData.answer_matrix.total_questions} câu</span>
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-[11px] font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="py-1 px-2 text-left">Mã Đề</th>
                          {Array.from({ length: offlinePreviewData.answer_matrix.total_questions }).map((_, i) => (
                            <th key={i} className="py-1 px-1.5 text-center">
                              C{i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(offlinePreviewData.answer_matrix.rows || []).map((row) => (
                          <tr key={row.code} className="hover:bg-slate-800/50">
                            <td className="py-1 px-2 font-bold text-indigo-400">{row.code}</td>
                            {Array.from({ length: offlinePreviewData.answer_matrix.total_questions }).map((_, i) => (
                              <td key={i} className="py-1 px-1.5 text-center font-bold text-emerald-300">
                                {row.answers[i + 1] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleFetchOfflinePreview}
                  disabled={loadingOfflinePreview}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>{loadingOfflinePreview ? 'Đang tạo ma trận...' : 'Xem Trước Bảng Đáp Án'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOfflineModal(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isExportingDocx}
                    onClick={handleExportOfflineDocx}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExportingDocx ? 'Đang tạo file Word...' : 'Tải File Word (.docx) Ngay'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
