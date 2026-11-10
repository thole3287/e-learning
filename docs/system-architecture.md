# THIẾT KẾ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. TỔNG QUAN KIẾN TRÚC TỔNG THỂ (HIGH-LEVEL ARCHITECTURE)

Hệ thống được thiết kế theo kiến trúc **Decoupled Client-Server (SPA + Headless RESTful API)**, tối ưu cho hiệu năng cao, khả năng mở rộng (Scalability), tính module hóa và dễ bảo trì.

```
                              +---------------------------------------+
                              |         CLIENT LAYER (Browser)        |
                              |  React 19 + TypeScript + Vite + Shadcn |
                              +---------------------------------------+
                                                  |
                                                  | HTTPS / REST JSON
                                                  v
                              +---------------------------------------+
                              |        REVERSE PROXY & GATEWAY        |
                              |                 Nginx                 |
                              +---------------------------------------+
                                                  |
                                                  | FastCGI / HTTP
                                                  v
+--------------------------------------------------------------------------------------------------+
|                                    BACKEND API LAYER (Laravel 12+)                               |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | Routing & Security Middleware (Sanctum Auth, RBAC Policy, Rate Limiting, CORS, XSS Sanitizer)|   |
|   +------------------------------------------------------------------------------------------+   |
|                                                  |                                               |
|                                                  v                                               |
|   +------------------------------------------------------------------------------------------+   |
|   | Presentation Layer: Controllers & Form Requests (Input Validation with Strict Rules)     |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                  |                                               |
|                                                  v                                               |
|   +------------------------------------------------------------------------------------------+   |
|   | Application / Domain Service Layer: Business Logic (ExamService, GradingService, etc.)   |   |
|   +------------------------------------------------------------------------------------------+   |
|                         |                                                |                       |
|                         v                                                v                       |
|   +---------------------------------------+    +---------------------------------------------+   |
|   | Data Access Layer: Eloquent Models    |    | Event & Background Jobs (Queue Dispatcher)  |   |
|   +---------------------------------------+    +---------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
          |                                                               |
          v                                                               v
+----------------------+   +-----------------------+           +----------------------+
|  DATABASE (MySQL 8)  |   |      CACHE & QUEUE    |           |   AI EXTENSION MODULE|
| Relational Storage   |   |        (Redis)        |           | (Gemini / OpenAI API)|
+----------------------+   +-----------------------+           +----------------------+
```

---

## 2. KIẾN TRÚC PHÂN TẦNG BACKEND (BACKEND LAYERED ARCHITECTURE)

Áp dụng chặt chẽ các nguyên lý **SOLID**, **Separation of Concerns (SoC)** và **DRY**:

1. **Routing Layer (`routes/api.php`):** Định tuyến có tiền tố phiên bản `/api/v1/`, nhóm logic theo resource.
2. **Middleware Layer:**
   - `auth:sanctum`: Kiểm tra token và định danh người dùng.
   - `CheckRole`: Kiểm tra vai trò `super_admin`, `teacher`, `student`.
   - `throttle:api`: Rate limiting ngăn chặn tấn công DoS/Brute Force.
3. **Form Request Layer (`app/Http/Requests/*`):** Tách biệt toàn bộ logic validate khỏi Controller. Trả về lỗi 422 chuẩn hóa.
4. **Controller Layer (`app/Http/Controllers/Api/V1/*`):** Đóng vai trò HTTP Transport, nhận dữ liệu đã qua validate, ủy quyền cho Service xử lý và trả về API Resource. Controller tuyệt đối không chứa logic nghiệp vụ nặng hoặc truy vấn SQL trực tiếp.
5. **Service Layer (`app/Services/*`):** Trái tim của ứng dụng, chứa toàn bộ nghiệp vụ:
   - `ExamAttemptService`: Quản lý vòng đời lượt thi, tính toán thời gian, bắt đầu thi, autosave.
   - `ExamGradingService`: Thuật toán chấm điểm tự động cho từng dạng câu hỏi, phân loại đúng/sai.
   - `QuestionBankService`: Xử lý thêm/sửa/xóa câu hỏi, parse công thức toán, import/export Excel.
   - `ExamMatrixService`: Sinh đề thi tự động theo ma trận tỷ lệ độ khó và xáo trộn mã đề.
   - `ReportAnalyticsService`: Tính toán phổ điểm, độ lệch chuẩn, phân tích câu hỏi có tỷ lệ sai cao.
6. **Data Access & Model Layer (`app/Models/*`):** Eloquent ORM với Relationships được định nghĩa đầy đủ, Scopes tái sử dụng, Accessors/Mutators và SoftDeletes.
7. **Resource Layer (`app/Http/Resources/*`):** Chuẩn hóa JSON output, bảo mật không làm lộ các trường nhạy cảm (`is_correct`, `password`, `remember_token`).
8. **Asynchronous & Scheduled Tasks (`app/Jobs/*` & `app/Console/Commands/*`):**
   - Xử lý gửi email thông báo, import danh sách học sinh từ file lớn.
   - Cron Job tự động thu bài các lượt thi quá hạn (`CheckExpiredExamAttemptsCommand`).

---

## 3. KIẾN TRÚC FRONTEND (REACT 19 + TYPESCRIPT + SPA)

Cấu trúc thư mục được tổ chức theo tính năng (Feature-based Modular Structure):

```
frontend/
├── src/
│   ├── assets/              # Static files (images, icons, fonts)
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Shadcn UI primitives (Button, Dialog, Dropdown, Table, Input,...)
│   │   ├── common/          # Layout components (Header, Sidebar, Breadcrumb, EmptyState, Loading)
│   │   └── math/            # MathRenderer (hỗ trợ KaTeX/LaTeX)
│   ├── config/              # App config, Axios instance, environment variables
│   ├── contexts/            # React Contexts (AuthContext, ThemeContext)
│   ├── features/            # Feature modules (Domain-driven)
│   │   ├── auth/            # Login, ForgotPassword, Profile, ChangePassword
│   │   ├── admin/           # User management, School/Class management, System settings, Logs
│   │   ├── teacher/         # Question bank, Exam builder, Assign exams, Monitoring, Reports
│   │   ├── student/         # Exam list, Exam room (Taking exam), Exam results, Study history
│   │   └── exam-taking/     # Màn hình phòng thi chuyên dụng: QuestionPalette, Timer, AutosaveStatus
│   ├── hooks/               # Custom hooks (useAuth, useExamTimer, useAutosave, useDebounce)
│   ├── layouts/             # App layouts (AdminLayout, TeacherLayout, StudentLayout, ExamTakingLayout)
│   ├── routes/              # React Router setup với ProtectedRoute & RoleBasedRoute
│   ├── services/            # Axios API calls mapping với backend endpoints
│   ├── types/               # TypeScript interfaces, types, DTOs, Enums
│   └── utils/               # Helper functions (date formatting, score calculation, validation schemas)
```

### Điểm nhấn trải nghiệm Phòng thi (Exam-Taking UX Engine):
- **Giao diện phòng thi tách biệt (Distraction-free Layout):** Ẩn toàn bộ Header, Sidebar của hệ thống để học sinh tập trung 100% vào bài thi.
- **Bảng điều hướng câu hỏi (Question Palette):** Hiển thị lưới câu hỏi với 4 trạng thái trực quan:
  - Chưa làm (Màu xám)
  - Đã làm (Màu xanh lá)
  - Đang xem (Viền nổi bật)
  - Đánh dấu xem lại (Cờ vàng)
- **Đồng hồ đếm ngược thông minh (Smart Countdown Timer):**
  - Đồng bộ thời gian còn lại trực tiếp từ `expires_at` của server.
  - Cảnh báo âm thanh/màu đỏ khi thời gian còn dưới 5 phút và 1 phút.
- **Chiến lược Autosave 2 tầng (Two-Tier Autosave):**
  - Tầng 1: Lưu tức thì vào `localStorage` ngay khi click chọn đáp án (đảm bảo 0% mất dữ liệu dù tắt trình duyệt đột ngột).
  - Tầng 2: Gửi API đồng bộ ngầm lên Backend với cơ chế debounce 500ms, hiển thị icon "Đã đồng bộ lên máy chủ".

---

## 4. THIẾT KẾ ĐỘ TRỄ THẤP & CHỊU TẢI PHÒNG THI (HIGH CONCURRENCY STRATEGY)

Trong các kỳ thi tập trung, hàng trăm học sinh có thể đồng thời bắt đầu làm bài, lưu câu trả lời và nộp bài cùng lúc. Kiến trúc xử lý:

1. **Server-authoritative State:** Toàn bộ trạng thái thi được kiểm soát tại database. Sử dụng `UPSERT` cho câu trả lời để tránh tình trạng duplicate record khi có nhiều request đồng thời.
2. **Pessimistic Locking khi nộp bài:**
   ```php
   DB::transaction(function () use ($attemptId) {
       $attempt = ExamAttempt::where('id', $attemptId)->lockForUpdate()->firstOrFail();
       if ($attempt->status !== ExamAttemptStatus::IN_PROGRESS) {
           throw new InvalidAttemptStateException("Bài thi đã được nộp hoặc không thể chỉnh sửa.");
       }
       $attempt->update([
           'status' => ExamAttemptStatus::SUBMITTED,
           'submitted_at' => now(),
       ]);
       // Tiến hành chấm điểm
   });
   ```
3. **Bộ đệm Redis (Redis Caching):**
   - Cache chi tiết đề thi và danh sách câu hỏi trong Redis với TTL phù hợp trong suốt thời gian diễn ra kỳ thi, giảm tải đọc từ MySQL.
   - Lưu trữ danh sách Session Token đang hoạt động.
4. **Queue Worker:**
   - Tác vụ nặng như gửi email, xuất báo cáo Excel/PDF dung lượng lớn, hoặc chấm điểm bài tự luận (nếu có) được đẩy vào Redis Queue để xử lý nền không chặn luồng HTTP.

---

## 5. THIẾT KẾ MỞ RỘNG TÍCH HỢP AI (AI EXTENSION ARCHITECTURE)

Hệ thống cung cấp sẵn Interface trừu tượng `AiExamAssistantInterface` để dễ dàng cắm các nhà cung cấp AI (Google Gemini API, OpenAI, Anthropic) mà không sửa đổi logic cốt lõi:

```php
namespace App\Contracts\Ai;

interface AiExamAssistantInterface
{
    public function generateQuestionsFromText(string $content, array $options): array;
    public function classifyDifficultyBloom(string $questionText): int;
    public function explainQuestionAnswer(int $questionId): string;
    public function analyzeStudentLearningGap(int $studentId, int $subjectId): array;
}
```

Kiến trúc này cho phép:
- Nhận input tài liệu dạng PDF/Word -> AI tự động bóc tách và sinh ra danh sách câu hỏi trắc nghiệm kèm 4 phương án, đáp án đúng và lời giải thích.
- Phân tích kết quả thi của từng học sinh để đề xuất nội dung kiến thức cần ôn tập bổ sung.
