import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginView } from './features/auth/LoginView';
import { DashboardLayout } from './layouts/DashboardLayout';

// Admin Views
import { AdminDashboardView } from './features/admin/AdminDashboardView';
import { UsersManagementView } from './features/admin/UsersManagementView';

// Student Views
import { StudentDashboardView } from './features/student/StudentDashboardView';
import { StudentPracticeView } from './features/student/StudentPracticeView';
import { PracticeRoomView } from './features/student/PracticeRoomView';
import { PracticeResultView } from './features/student/PracticeResultView';

// Teacher Views
import { TeacherDashboardView } from './features/teacher/TeacherDashboardView';
import { QuestionBankView } from './features/teacher/QuestionBankView';
import { ExamBuilderView } from './features/teacher/ExamBuilderView';
import { ExamAnalyticsView } from './features/teacher/ExamAnalyticsView';
import { TeacherPracticeResultsView } from './features/teacher/TeacherPracticeResultsView';
import { ClassManagementView } from './features/teacher/ClassManagementView';

// Exam Room Views
import { ExamRoomView } from './features/exam-taking/ExamRoomView';
import { ExamResultView } from './features/exam-taking/ExamResultView';
import { PublicExamJoinView } from './features/student/PublicExamJoinView';

export const isGuestUser = (user: any): boolean => {
  if (!user) return false;
  if (user.is_guest === true || user.is_guest === 1 || user.is_guest === '1') return true;
  if (user.role === 'guest') return true;
  if (typeof user.username === 'string' && user.username.startsWith('hs_')) return true;
  if (typeof user.email === 'string' && (user.email.includes('@hochoa247.io.vn') || user.email.includes('guest'))) return true;
  return false;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
        Đang xác thực phiên làm việc...
      </div>
    );
  }

  // 1. Chưa đăng nhập: Tuyệt đối không cho vào bất kỳ trang bảo vệ nào
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isGuest = isGuestUser(user);

  // 2. Thí sinh tự do (Guest): CHỈ được phép ở phòng thi hoặc xem kết quả bài thi
  if (isGuest) {
    const isExamTakingRoute = location.pathname.startsWith('/exam/room/') || location.pathname.startsWith('/exam/result/');
    if (!isExamTakingRoute) {
      logout('/login');
      return <Navigate to="/login" replace />;
    }
  }

  // 3. Kiểm tra vai trò được phép (RBAC)
  const currentRole = isGuest ? 'guest' : user.role;
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    if (currentRole === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (currentRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (currentRole === 'student') return <Navigate to="/student/dashboard" replace />;

    // Vai trò không hợp lệ (như guest vào /student): đăng xuất sạch và chuyển về /login
    logout('/login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Root Redirect Component
const RootRedirect: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isGuestUser(user)) {
    logout('/login');
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;

  logout('/login');
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardLayout title="Quản Trị Hệ Thống" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardView />} />
            <Route path="users" element={<UsersManagementView />} />
            <Route path="classes" element={<ClassManagementView />} />
          </Route>

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'super_admin']}>
                <DashboardLayout title="Bàn Làm Việc Giáo Viên" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TeacherDashboardView />} />
            <Route path="questions" element={<QuestionBankView />} />
            <Route path="exams" element={<ExamBuilderView />} />
            <Route path="exams/:examId/analytics" element={<ExamAnalyticsView />} />
            <Route path="practice-results" element={<TeacherPracticeResultsView />} />
            <Route path="classes" element={<ClassManagementView />} />
          </Route>

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout title="Phòng Thi Học Sinh" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboardView />} />
            <Route path="practice" element={<StudentPracticeView />} />
            <Route path="practice/result/:sessionId" element={<PracticeResultView />} />
            <Route path="history" element={<StudentDashboardView />} />
          </Route>

          {/* Practice Room (Distraction-Free Layout) */}
          <Route
            path="/student/practice/session/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['student', 'super_admin']}>
                <PracticeRoomView />
              </ProtectedRoute>
            }
          />

          {/* Public Exam Access for Students & Free Guests (Link làm bài trực tiếp) */}
          <Route path="/exam/:code" element={<PublicExamJoinView />} />
          <Route path="/join/:code" element={<PublicExamJoinView />} />

          {/* Exam Room (Distraction-Free Layout) */}
          <Route
            path="/exam/room/:assignmentId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'super_admin', 'guest']}>
                <ExamRoomView />
              </ProtectedRoute>
            }
          />

          {/* Exam Result */}
          <Route
            path="/exam/result/:attemptId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'super_admin', 'guest']}>
                <ExamResultView />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
