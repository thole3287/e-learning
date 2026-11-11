import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
        Đang xác thực phiên làm việc...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Điều hướng về trang chủ tương ứng với vai trò
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};

// Root Redirect Component
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
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

          {/* Exam Room (Distraction-Free Layout) */}
          <Route
            path="/exam/room/:assignmentId"
            element={
              <ProtectedRoute allowedRoles={['student', 'super_admin']}>
                <ExamRoomView />
              </ProtectedRoute>
            }
          />

          {/* Exam Result */}
          <Route
            path="/exam/result/:attemptId"
            element={
              <ProtectedRoute>
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
