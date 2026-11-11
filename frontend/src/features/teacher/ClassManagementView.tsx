import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  GraduationCap,
  Plus,
  Users,
  Search,
  BookOpen,
  UserCheck,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Eye,
  X,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface SchoolClassItem {
  id: number;
  name: string;
  code: string;
  grade_id: number;
  grade?: { id: number; name: string; level: number };
  academic_year?: { id: number; name: string };
  homeroom_teacher?: { id: number; full_name: string; username: string };
  students_count?: number;
  students?: Array<{
    id: number;
    full_name: string;
    username: string;
    code: string;
    email: string;
    pivot?: { enrolled_at: string; status: string };
  }>;
}

export const ClassManagementView: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClassItem[]>([]);
  const [grades, setGrades] = useState<Array<{ id: number; name: string; level: number }>>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');

  // Modal Tạo lớp học
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    grade_id: '',
    code: '',
    homeroom_teacher_id: '',
  });

  // Modal Danh sách học sinh của lớp
  const [activeClassDetail, setActiveClassDetail] = useState<SchoolClassItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Thêm nhanh học sinh
  const [showAddStudentsModal, setShowAddStudentsModal] = useState<SchoolClassItem | null>(null);
  const [studentsRawText, setStudentsRawText] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('Student@123456');
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  const [createdResult, setCreatedResult] = useState<Array<{
    id: number;
    full_name: string;
    username: string;
    password: string;
    code: string;
  }> | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  const fetchGrades = async () => {
    try {
      const res: any = await api.get('/grades');
      if (res.success && res.data) {
        setGrades(res.data);
        if (!createForm.grade_id && res.data.length > 0) {
          setCreateForm((prev) => ({ ...prev, grade_id: String(res.data[0].id) }));
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khối:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res: any = await api.get('/users', { params: { role: 'teacher', per_page: 100 } });
      if (res.success && res.data) {
        setTeachers(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách giáo viên:', err);
    }
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params: any = { per_page: 100 };
      if (selectedGradeId) params.grade_id = selectedGradeId;
      if (search) params.search = search;
      const res: any = await api.get('/classes', { params });
      if (res.success && res.data) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [selectedGradeId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClasses();
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      alert('Vui lòng nhập tên lớp học (ví dụ: 10A1)');
      return;
    }
    setCreatingClass(true);
    try {
      const payload: any = {
        name: createForm.name.trim(),
      };
      if (createForm.grade_id) payload.grade_id = Number(createForm.grade_id);
      if (createForm.code.trim()) payload.code = createForm.code.trim();
      if (createForm.homeroom_teacher_id) {
        payload.homeroom_teacher_id = Number(createForm.homeroom_teacher_id);
      }

      const res: any = await api.post('/classes', payload);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          grade_id: grades[0] ? String(grades[0].id) : '',
          code: '',
          homeroom_teacher_id: '',
        });
        fetchClasses();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo lớp.');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleUpdateHomeroomTeacher = async (classId: number, teacherId: string) => {
    try {
      const res: any = await api.put(`/classes/${classId}`, {
        homeroom_teacher_id: teacherId ? Number(teacherId) : null,
      });
      if (res.success) {
        if (activeClassDetail && activeClassDetail.id === classId) {
          setActiveClassDetail(res.data);
        }
        fetchClasses();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể cập nhật giáo viên.');
    }
  };

  const openClassDetail = async (cls: SchoolClassItem) => {
    setActiveClassDetail(cls);
    setLoadingDetail(true);
    try {
      const res: any = await api.get(`/classes/${cls.id}`);
      if (res.success && res.data) {
        setActiveClassDetail(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleQuickAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddStudentsModal) return;
    if (!studentsRawText.trim()) {
      alert('Vui lòng dán danh sách họ tên học sinh vào ô bên dưới.');
      return;
    }

    setIsAddingStudents(true);
    try {
      const res: any = await api.post(`/classes/${showAddStudentsModal.id}/quick-add-students`, {
        raw_text: studentsRawText,
        default_password: defaultPassword,
      });

      if (res.success && res.data) {
        setCreatedResult(res.data);
        fetchClasses();
        if (activeClassDetail && activeClassDetail.id === showAddStudentsModal.id) {
          openClassDetail(showAddStudentsModal);
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi khi thêm học sinh.');
    } finally {
      setIsAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!activeClassDetail) return;
    if (!confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp?')) return;

    try {
      const res: any = await api.delete(`/classes/${activeClassDetail.id}/students/${studentId}`);
      if (res.success) {
        openClassDetail(activeClassDetail);
        fetchClasses();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể xóa học sinh');
    }
  };

  const handleDeleteClass = async (cls: SchoolClassItem) => {
    if (!confirm(`Bạn có chắc muốn xóa lớp "${cls.name}"? Thao tác này không thể hoàn tác!`)) return;
    try {
      const res: any = await api.delete(`/classes/${cls.id}`);
      if (res.success) {
        fetchClasses();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể xóa lớp học này.');
    }
  };

  const copyResultToClipboard = () => {
    if (!createdResult || !showAddStudentsModal) return;
    let text = `DANH SÁCH TÀI KHOẢN HỌC SINH LỚP ${showAddStudentsModal.name}\n`;
    text += `STT\tHọ và tên\tTên đăng nhập\tMật khẩu\tMã học sinh\n`;
    createdResult.forEach((st, idx) => {
      text += `${idx + 1}\t${st.full_name}\t${st.username}\t${st.password}\t${st.code}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Quản Lý Lớp Học & Học Sinh
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý các lớp học theo Khối, phân công giáo viên và tạo danh sách tài khoản học sinh
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Lớp Học Mới</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp (ví dụ: 10A1, 12A2)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedGradeId}
            onChange={(e) => setSelectedGradeId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Tất cả khối lớp --</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Class List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Đang tải danh sách lớp học...</div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">Chưa có lớp học nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Bấm vào nút "Tạo Lớp Học Mới" ở góc trên bên phải để tạo lớp học cho học sinh làm bài thi.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lớp Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-lg border border-indigo-100">
                      {cls.name}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{cls.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{cls.code}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                    {cls.grade?.name || 'Khối'}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Sĩ số:
                    </span>
                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {cls.students_count || 0} học sinh
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Chủ nhiệm:
                    </span>
                    <span className="text-slate-700 truncate max-w-[140px]">
                      {cls.homeroom_teacher?.full_name || 'Chưa phân công'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openClassDetail(cls)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Danh sách HS</span>
                </button>
                <button
                  onClick={() => {
                    setShowAddStudentsModal(cls);
                    setStudentsRawText('');
                    setCreatedResult(null);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                  title="Thêm nhanh học sinh"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm HS</span>
                </button>
                <button
                  onClick={() => handleDeleteClass(cls)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Xóa lớp học"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: TẠO LỚP HỌC MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                Tạo Lớp Học Mới
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên Lớp Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ví dụ: 10A1, 10A2, 11B1, 12 Tin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Khối Lớp</label>
                <select
                  value={createForm.grade_id}
                  onChange={(e) => setCreateForm({ ...createForm, grade_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã Định Danh Lớp (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder="Bỏ trống hệ thống sẽ tự sinh (VD: 10A1_2026)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phân Công Giáo Viên Phụ Trách / Chủ Nhiệm
                </label>
                <select
                  value={createForm.homeroom_teacher_id}
                  onChange={(e) => setCreateForm({ ...createForm, homeroom_teacher_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Mặc định (Tự động gán cho tài khoản của bạn) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username}) {t.email ? `• ${t.email}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Giáo viên được phân công sẽ có toàn quyền quản lý học sinh và giao đề thi cho lớp học này.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingClass}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {creatingClass ? 'Đang tạo...' : 'Xác Nhận Tạo Lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM NHANH HỌC SINH BẰNG CHUỖI VĂN BẢN */}
      {showAddStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  Thêm Học Sinh Vào Lớp: {showAddStudentsModal.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dán danh sách họ tên từ Excel/Word để hệ thống tự cấp tài khoản và mật khẩu
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddStudentsModal(null);
                  setCreatedResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              /* KẾT QUẢ CẤP TÀI KHOẢN */
              <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      Đã thêm thành công <b>{createdResult.length}</b> học sinh vào lớp {showAddStudentsModal.name}!
                    </span>
                  </div>
                  <button
                    onClick={copyResultToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-all shadow-xs"
                  >
                    {copiedResult ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedResult ? 'Đã sao chép!' : 'Sao chép danh sách'}</span>
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">STT</th>
                        <th className="py-2.5 px-3 font-semibold">Họ và tên</th>
                        <th className="py-2.5 px-3 font-semibold">Tên đăng nhập</th>
                        <th className="py-2.5 px-3 font-semibold">Mật khẩu</th>
                        <th className="py-2.5 px-3 font-semibold">Mã HS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {createdResult.map((st, i) => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{st.full_name}</td>
                          <td className="py-2 px-3 font-mono text-indigo-600">{st.username}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{st.password}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{st.code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowAddStudentsModal(null);
                      setCreatedResult(null);
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              /* FORM NHẬP DANH SÁCH */
              <form onSubmit={handleQuickAddStudents} className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Dán danh sách họ tên học sinh (Mỗi học sinh 1 dòng)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      (Hỗ trợ copy cả cột từ Excel, có số thứ tự đầu dòng)
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={studentsRawText}
                    onChange={(e) => setStudentsRawText(e.target.value)}
                    placeholder={`1. Nguyễn Văn An&#10;2. Trần Thị Bích&#10;3. Lê Hoàng Cường&#10;Phạm Minh Đức`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu mặc định cho các tài khoản mới
                  </label>
                  <input
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Học sinh có thể đổi mật khẩu này sau khi đăng nhập lần đầu.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentsModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingStudents}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isAddingStudents ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản & Thêm Vào Lớp'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: XEM CHI TIẾT DANH SÁCH HỌC SINH CỦA LỚP */}
      {activeClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Danh Sách Học Sinh: Lớp {activeClassDetail.name} ({activeClassDetail.grade?.name})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã lớp: <span className="font-mono">{activeClassDetail.code}</span> • Sĩ số:{' '}
                  <b>{activeClassDetail.students?.length || activeClassDetail.students_count || 0}</b> học sinh
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowAddStudentsModal(activeClassDetail);
                    setStudentsRawText('');
                    setCreatedResult(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm học sinh</span>
                </button>
                <button
                  onClick={() => setActiveClassDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Phân công giáo viên chủ nhiệm */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700">Giáo viên phụ trách:</span>
                <select
                  value={activeClassDetail.homeroom_teacher?.id || ''}
                  onChange={(e) => handleUpdateHomeroomTeacher(activeClassDetail.id, e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
                >
                  <option value="">-- Chưa phân công giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-slate-400 text-[11px]">
                (Thay đổi giáo viên phụ trách sẽ tự động cập nhật phân quyền lớp)
              </span>
            </div>

            <div className="p-6">
              {loadingDetail ? (
                <div className="text-center py-8 text-xs text-slate-400">Đang tải danh sách học sinh...</div>
              ) : !activeClassDetail.students || activeClassDetail.students.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Lớp này hiện chưa có học sinh nào.</p>
                  <button
                    onClick={() => {
                      setShowAddStudentsModal(activeClassDetail);
                      setStudentsRawText('');
                      setCreatedResult(null);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm học sinh ngay</span>
                  </button>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">STT</th>
                        <th className="py-2.5 px-3 font-semibold">Họ và tên</th>
                        <th className="py-2.5 px-3 font-semibold">Tên đăng nhập</th>
                        <th className="py-2.5 px-3 font-semibold">Mã học sinh</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeClassDetail.students.map((st, i) => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{st.full_name}</td>
                          <td className="py-2.5 px-3 font-mono text-indigo-600">{st.username}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{st.code || '-'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveStudent(st.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Xóa học sinh khỏi lớp này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setActiveClassDetail(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
