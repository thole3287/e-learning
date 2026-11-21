import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, BookOpen, Award, Calendar, CheckCircle2, AlertCircle, ArrowRight, UserCheck, School, Eye, Lock } from 'lucide-react';

interface PublicExamDetails {
  id: number;
  code: string;
  title: string;
  subject_name: string;
  grade_name: string;
  creator_name: string;
  duration_minutes: number;
  total_points: number;
  total_questions: number;
  views_count?: number;
  start_time: string;
  end_time: string;
  has_password?: boolean;
  is_open: boolean;
  status_label: 'upcoming' | 'open' | 'closed';
  assignment_id?: number;
  settings?: any;
}

export const PublicExamJoinView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [exam, setExam] = useState<PublicExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Thông tin học sinh tự do (Guest)
  const [guestName, setGuestName] = useState('');
  const [guestClass, setGuestClass] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceGuestMode, setForceGuestMode] = useState(false);

  // Kiểm tra xem đã có tài khoản đăng nhập hay chưa
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 1. Kiểm tra tài khoản hiện tại
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.get('/auth/me')
        .then((res: any) => {
          if (res.success && res.data) {
            setCurrentUser(res.data);
          }
        })
        .catch(() => {
          // Token không hợp lệ thì coi như chưa login
        });
    }

    // 2. Tải thông tin đề thi công khai
    const fetchExam = async () => {
      setLoading(true);
      setError(null);
      try {
        const res: any = await api.get(`/exams/public/${code}`);
        if (res.success && res.data) {
          setExam(res.data);
        } else {
          setError(res.message || 'Không tìm thấy thông tin đề thi này.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Không thể kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchExam();
    }
  }, [code]);

  // Học sinh đã đăng nhập vào thi
  const handleLoggedInJoin = async () => {
    if (!code) return;
    if (exam?.has_password && !enteredPassword.trim()) {
      alert('Vui lòng nhập mật khẩu phòng thi!');
      return;
    }
    setIsSubmitting(true);
    try {
      const res: any = await api.post(`/exams/public/${code}/join`, {
        access_password: enteredPassword.trim(),
      });
      if (res.success && res.data?.assignment_id) {
        navigate(`/exam/room/${res.data.assignment_id}`);
      } else {
        alert(res.message || 'Không thể vào phòng thi lúc này.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi vào phòng thi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thí sinh tự do nhập họ tên và vào thi
  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Vui lòng nhập họ và tên của bạn!');
      return;
    }
    if (exam?.has_password && !enteredPassword.trim()) {
      alert('Vui lòng nhập mật khẩu phòng thi!');
      return;
    }
    if (!code) return;

    setIsSubmitting(true);
    try {
      const res: any = await api.post(`/exams/public/${code}/guest-join`, {
        full_name: guestName.trim(),
        class_name: guestClass.trim(),
        phone: guestPhone.trim(),
        access_password: enteredPassword.trim(),
      });

      if (res.success && res.data?.token && res.data?.assignment_id) {
        if (res.data?.user) {
          login(res.data.user, res.data.token);
        } else {
          localStorage.setItem('auth_token', res.data.token);
        }
        navigate(`/exam/room/${res.data.assignment_id}`);
      } else {
        alert(res.message || 'Không thể tạo phiên thi tự do.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium text-xs">Đang nạp thông tin phòng thi...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Không Thể Truy Cập Bài Thi</h2>
          <p className="text-xs text-slate-500">{error || 'Mã đề thi không tồn tại hoặc đã bị hủy.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            Quay Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-indigo-50/40 flex flex-col items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 sm:p-8 text-white relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider">
              {exam.subject_name} {exam.grade_name ? `• ${exam.grade_name}` : ''}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase shadow-xs ${
                exam.is_open
                  ? 'bg-emerald-400 text-emerald-950 animate-pulse'
                  : exam.status_label === 'upcoming'
                  ? 'bg-amber-300 text-amber-950'
                  : 'bg-slate-300 text-slate-800'
              }`}
            >
              {exam.is_open ? '🟢 Đang Mở Phòng Thi' : exam.status_label === 'upcoming' ? '🟡 Chưa Đến Giờ Thi' : '🔴 Đã Hết Hạn'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">
            {exam.title}
          </h1>
          <p className="text-xs text-emerald-100 mt-1.5 flex flex-wrap items-center gap-1.5">
            <span>Ra đề: {exam.creator_name}</span>
            <span>•</span>
            <span className="font-mono">Mã: {exam.code}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">
              <Eye className="w-3 h-3" />
              <span>{exam.views_count || 1} lượt xem</span>
            </span>
          </p>
        </div>

        {/* Nội dung chi tiết bài thi */}
        <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 sm:p-3 text-center">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Thời gian</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{exam.duration_minutes} phút</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 sm:p-3 text-center">
              <BookOpen className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Số lượng</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{exam.total_questions} câu hỏi</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 sm:p-3 text-center">
              <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Thang điểm</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{exam.total_points} điểm</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 sm:p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-teal-600 mx-auto mb-1" />
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Hình thức</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">Online GDPT</div>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Khung thời gian làm bài trực tuyến:</span>
            </div>
            <div className="text-[11px] text-slate-600 pl-6 space-y-0.5">
              <p>• Bắt đầu: <strong className="text-slate-800">{formatDate(exam.start_time)}</strong></p>
              <p>• Hạn chót: <strong className="text-slate-800">{formatDate(exam.end_time)}</strong></p>
            </div>
          </div>

          {/* KHU VỰC THÍ SINH VÀO PHÒNG THI */}
          {!exam.is_open ? (
            <div
              className={`p-6 rounded-2xl border text-center space-y-3 ${
                exam.status_label === 'upcoming'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}
            >
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-3xl shadow-xs bg-white border border-slate-100">
                {exam.status_label === 'upcoming' ? '⏳' : '⛔'}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-sm sm:text-base">
                  {exam.status_label === 'upcoming'
                    ? 'Phòng Thi Chưa Đến Giờ Mở!'
                    : 'Đã Hết Thời Gian Làm Bài Thi!'}
                </h3>
                <p className="text-xs leading-relaxed opacity-90 max-w-md mx-auto">
                  {exam.status_label === 'upcoming'
                    ? `Đề thi sẽ chính thức mở vào lúc ${formatDate(exam.start_time)}. Thí sinh vui lòng quay lại đúng giờ để vào làm bài.`
                    : `Thời gian nộp bài thi đã kết thúc vào lúc ${formatDate(exam.end_time)}. Hiện tại phòng thi đã đóng và không thể nộp bài thêm.`}
                </p>
                {exam.status_label !== 'upcoming' && (
                  <p className="text-[11px] pt-1 font-semibold text-rose-700">
                    💡 Thí sinh vui lòng liên hệ Giáo viên phụ trách ({exam.creator_name}) nếu cần hỗ trợ gia hạn thời gian làm bài.
                  </p>
                )}
              </div>
            </div>
          ) : currentUser && !forceGuestMode ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {(currentUser.full_name || currentUser.name || 'H').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {currentUser.full_name || currentUser.name || 'Học sinh'}
                    </div>
                    <div className="text-[11px] text-slate-500">{currentUser.email || currentUser.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Đã đăng nhập
                  </span>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>

              {exam.has_password && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-1.5 text-left">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mật khẩu phòng thi <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="password"
                    required
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    placeholder="Nhập mật khẩu do Giáo viên cung cấp"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-slate-800"
                  />
                  <p className="text-[11px] text-amber-700">
                    🔒 Đề thi này có cài đặt mật khẩu bảo vệ.
                  </p>
                </div>
              )}

              <button
                onClick={handleLoggedInJoin}
                disabled={isSubmitting || !exam.is_open}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Đang chuẩn bị đề...' : '🚀 Bắt Đầu Làm Bài Ngay'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setForceGuestMode(true)}
                  className="text-xs text-slate-500 hover:text-emerald-700 font-medium underline underline-offset-4 cursor-pointer transition-colors"
                >
                  ✍️ Hoặc thi với tư cách Thí sinh tự do (Nhập họ tên khác)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGuestJoin} className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Thí sinh tự do (Vào thi không cần tài khoản)</span>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setForceGuestMode(false)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    ← Dùng tài khoản đã đăng nhập
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên thí sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp / Trường học (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={guestClass}
                    onChange={(e) => setGuestClass(e.target.value)}
                    placeholder="VD: 10A14 - THPT FPT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại (Tùy chọn)
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {exam.has_password && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-1.5 text-left">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mật khẩu phòng thi <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="password"
                    required
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    placeholder="Nhập mật khẩu do Giáo viên cung cấp"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-slate-800"
                  />
                  <p className="text-[11px] text-amber-700">
                    🔒 Đề thi này có cài đặt mật khẩu. Vui lòng nhập đúng để vào phòng thi.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !exam.is_open}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? 'Đang chuẩn bị đề thi...' : '🚀 Bắt Đầu Vào Phòng Thi'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
