# MA TRẬN PHÂN QUYỀN HỆ THỐNG (AUTHORIZATION MATRIX)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. NGUYÊN TẮC KIỂM SOÁT QUYỀN TRUY CẬP (ACCESS CONTROL PRINCIPLES)

1. **Phân quyền tại Backend (Server-Side Authorization):**
   - Tuyệt đối không phụ thuộc vào việc ẩn/hiện nút bấm trên giao diện người dùng (Frontend). Mọi Endpoint API đều phải đi qua Middleware xác thực và Laravel Policy tương ứng.
2. **Nguyên tắc quyền tối thiểu (Principle of Least Privilege):**
   - Mỗi vai trò chỉ được cấp quyền hạn tối thiểu cần thiết để hoàn thành công việc của mình.
3. **Kiểm tra quyền sở hữu đối tượng (Object-Level Authorization):**
   - Giáo viên chỉ được xem và sửa đổi các câu hỏi, đề thi do mình tạo hoặc được phân công.
   - Học sinh chỉ có quyền thao tác trên lượt thi (`exam_attempts`) do chính tài khoản của mình khởi tạo.

---

## 2. MA TRẬN PHÂN QUYỀN THEO TÍNH NĂNG (FEATURE RBAC MATRIX)

| Mã Quyền (Permission) | Tên chức năng | Super Admin | Teacher | Student | Laravel Policy / Rule |
|---|---|:---:|:---:|:---:|---|
| **USER_MANAGEMENT** | | | | | |
| `users.view_any` | Xem danh sách người dùng | ✅ | ❌ | ❌ | `UserPolicy@viewAny` |
| `users.create` | Tạo tài khoản người dùng | ✅ | ❌ | ❌ | `UserPolicy@create` |
| `users.update` | Sửa thông tin tài khoản | ✅ | ❌ | ❌ | `UserPolicy@update` |
| `users.delete` | Xóa/Khóa tài khoản | ✅ | ❌ | ❌ | `UserPolicy@delete` |
| `users.import` | Nhập tài khoản từ Excel | ✅ | ❌ | ❌ | `UserPolicy@import` |
| `profile.update` | Cập nhật hồ sơ cá nhân | ✅ | ✅ | ✅ | Bất kỳ ai với tài khoản của mình |
| **SCHOOL_ACADEMIC** | | | | | |
| `schools.manage` | Quản lý thông tin trường | ✅ | ❌ | ❌ | `AdminOnly` |
| `classes.view_any` | Xem danh sách tất cả lớp | ✅ | ❌ | ❌ | `ClassPolicy@viewAny` |
| `classes.view_assigned`| Xem lớp được phân công | ✅ | ✅ | ❌ | Chỉ các lớp trong `teacher_classes` |
| `classes.create_edit` | Thêm / Sửa lớp học | ✅ | ❌ | ❌ | `ClassPolicy@manage` |
| `classes.assign_teacher`| Phân công giáo viên | ✅ | ❌ | ❌ | `ClassPolicy@assignTeacher` |
| `classes.add_student` | Thêm học sinh vào lớp | ✅ | ✅ (nếu cấp)| ❌ | `ClassPolicy@addStudent` |
| **SUBJECTS_CURRICULUM**| | | | | |
| `subjects.manage` | Thêm/Sửa/Xóa môn học | ✅ | ❌ | ❌ | `SubjectPolicy@manage` |
| `chapters.manage` | Quản lý chương/bài học | ✅ | ✅ | ❌ | `CurriculumPolicy@manage` |
| **QUESTION_BANK** | | | | | |
| `questions.view_any` | Xem toàn bộ ngân hàng câu hỏi| ✅ | ❌ | ❌ | `QuestionPolicy@viewAny` |
| `questions.view_own` | Xem câu hỏi của mình/chia sẻ| ✅ | ✅ | ❌ | `creator_id == user.id || is_shared` |
| `questions.create` | Tạo câu hỏi mới | ✅ | ✅ | ❌ | `QuestionPolicy@create` |
| `questions.update` | Chỉnh sửa câu hỏi | ✅ | ✅ (của mình) | ❌ | `QuestionPolicy@update` |
| `questions.delete` | Xóa câu hỏi (Soft delete) | ✅ | ✅ (của mình) | ❌ | `QuestionPolicy@delete` |
| `questions.import_export`| Nhập/Xuất file Excel | ✅ | ✅ | ❌ | `QuestionPolicy@importExport` |
| **EXAM_MANAGEMENT** | | | | | |
| `exams.view_any` | Xem tất cả đề thi toàn trường | ✅ | ❌ | ❌ | `ExamPolicy@viewAny` |
| `exams.create` | Soạn đề thi mới | ✅ | ✅ | ❌ | `ExamPolicy@create` |
| `exams.update` | Sửa cấu hình đề thi | ✅ | ✅ (của mình) | ❌ | `ExamPolicy@update` (khi chưa có thí sinh thi) |
| `exams.delete` | Xóa đề thi | ✅ | ✅ (của mình) | ❌ | `ExamPolicy@delete` |
| `exams.publish` | Xuất bản đề thi | ✅ | ✅ (của mình) | ❌ | `ExamPolicy@publish` |
| `exams.assign` | Giao đề thi cho lớp học | ✅ | ✅ (lớp dạy)| ❌ | `ExamPolicy@assign` |
| **EXAM_TAKING (THI)**| | | | | |
| `exams.take` | Tham gia làm bài thi | ❌ | ❌ | ✅ | Lớp học sinh có trong `exam_assignments` |
| `attempts.autosave` | Tự động lưu câu trả lời | ❌ | ❌ | ✅ | `ExamAttemptPolicy@saveAnswer` (`student_id == user.id`) |
| `attempts.submit` | Nộp bài thi | ❌ | ❌ | ✅ | `ExamAttemptPolicy@submit` (`status == IN_PROGRESS`) |
| `attempts.view_result`| Xem kết quả bài thi | ✅ | ✅ (lớp dạy)| ✅ (của mình)| Tuân thủ `view_score_type` & `show_solutions` |
| **REPORTS_ANALYTICS**| | | | | |
| `reports.system` | Báo cáo toàn hệ thống | ✅ | ❌ | ❌ | `ReportPolicy@systemOverview` |
| `reports.exam` | Báo cáo phổ điểm đề thi | ✅ | ✅ (đề dạy) | ❌ | `ReportPolicy@examAnalytics` |
| `reports.export_excel` | Xuất bảng điểm lớp ra Excel| ✅ | ✅ | ❌ | `ReportPolicy@exportGrades` |
| `reports.personal` | Xem lịch sử & tiến độ cá nhân| ✅ | ✅ | ✅ | `student_id == user.id` |
| `logs.view` | Xem Audit Log & Login History| ✅ | ❌ | ❌ | `AdminOnly` |

---

## 3. TRIỂN KHAI TRONG LARAVEL POLICIES

Mỗi Controller kiểm tra thông qua `authorize()` helper:

```php
// Ví dụ: ExamController.php
public function update(UpdateExamRequest $request, Exam $exam)
{
    $this->authorize('update', $exam);
    // Xử lý cập nhật
}

// Ví dụ: ExamPolicy.php
public function update(User $user, Exam $exam): bool
{
    if ($user->isSuperAdmin()) {
        return true;
    }
    
    // Giáo viên chỉ được sửa đề của chính mình và chưa có ai làm bài
    return $user->isTeacher() 
        && $exam->creator_id === $user->id 
        && $exam->attempts()->count() === 0;
}
```
