# KẾ HOẠCH TRIỂN KHAI CHI TIẾT (IMPLEMENTATION PLAN)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. LỘ TRÌNH TỔNG QUAN (ROADMAP)

Dự án được phân chia thành 6 giai đoạn tuần tự, có kiểm soát chất lượng (Quality Gates) tại từng bước:

```
[Phase 1: Discovery & Analysis] ✅
             |
             v
[Phase 2: System & DB Design]  ✅
             |
             v
[Phase 3: Backend Development (Laravel 12+ REST API)]
             |
             v
[Phase 4: Frontend Development (React 19 + Vite + Shadcn)]
             |
             v
[Phase 5: Integration, End-to-End Testing & Security Audit]
             |
             v
[Phase 6: Containerization (Docker) & Production Deployment]
```

---

## 2. CHI TIẾT CÁC TASK THEO GIAI ĐOẠN

### Phase 1: Discovery & Analysis (Khảo sát & Phân tích) - ĐÃ HOÀN THÀNH
- [x] **Task 1.1:** Khảo sát môi trường và repository workspace.
- [x] **Task 1.2:** Phân tích yêu cầu chức năng (Functional Requirements) và phi chức năng (NFR).
- [x] **Task 1.3:** Xác định danh mục Actor và đặc tả các Use Case trọng yếu (`docs/use-cases.md`).
- [x] **Task 1.4:** Thiết lập bộ Quy tắc nghiệp vụ toàn diện (`docs/business-rules.md`).
- [x] **Task 1.5:** Phát hiện các khoảng trống nghiệp vụ và giải pháp xử lý.

### Phase 2: System Design (Thiết kế hệ thống) - ĐÃ HOÀN THÀNH
- [x] **Task 2.1:** Thiết kế kiến trúc tổng thể Clean Architecture (`docs/system-architecture.md`).
- [x] **Task 2.2:** Thiết kế lược đồ Cơ sở dữ liệu chuẩn hóa 3NF (`docs/database-design.md`).
- [x] **Task 2.3:** Xây dựng sơ đồ thực thể quan hệ chi tiết (`docs/erd.md`).
- [x] **Task 2.4:** Thiết kế đặc tả RESTful API v1 (`docs/api-specification.md`).
- [x] **Task 2.5:** Thiết kế ma trận phân quyền RBAC và Policy mapping (`docs/authorization-matrix.md`).
- [x] **Task 2.6:** Xây dựng chiến lược kiểm thử (`docs/testing-strategy.md`).
- [x] **Task 2.7:** Xây dựng tài liệu hướng dẫn triển khai (`docs/deployment-guide.md`).

---

### Phase 3: Backend Development (Phát triển Backend Laravel 12+)
- [ ] **Sprint 3.1: Khởi tạo Project & Cấu hình môi trường**
  - Khởi tạo khung dự án Laravel 12 trong thư mục `backend/`.
  - Cấu hình file `.env`, kết nối MySQL 8, Redis, Queue driver.
  - Cài đặt các package cốt lõi: Laravel Sanctum, Laravel Excel (`maatwebsite/excel`).
- [ ] **Sprint 3.2: Database Migrations & Seeders**
  - Viết toàn bộ migrations cho 17 bảng dữ liệu kèm Foreign keys & Indexes.
  - Xây dựng Seeders tạo dữ liệu mẫu chuẩn nghiệp vụ:
    - 1 Super Admin (`admin@elearning.vn` / `Admin@123456`)
    - 3 Giáo viên các bộ môn Toán, Lý, Tiếng Anh
    - 2 Lớp học với 30 Học sinh mẫu
    - 1 Ngân hàng 100 câu hỏi mẫu (đủ 4 dạng, chứa công thức Toán LaTeX)
    - 2 Đề thi mẫu kèm cấu hình giao bài.
- [ ] **Sprint 3.3: Authentication & User Management Module**
  - Implement Login, Logout, Refresh, Get Profile, Change Password APIs.
  - Implement Users CRUD, Filter, Import danh sách người dùng từ Excel.
  - Ghi nhận lịch sử đăng nhập vào `login_histories`.
- [ ] **Sprint 3.4: Academic & Question Bank Module**
  - CRUD Schools, Academic Years, Grades, Classes, Assign Teachers.
  - CRUD Subjects, Chapters, Lessons.
  - CRUD Questions, Question Options (Hỗ trợ công thức KaTeX, upload ảnh minh họa an toàn).
  - Import/Export câu hỏi Excel.
- [ ] **Sprint 3.5: Exam Builder & Assignment Module**
  - CRUD Exams, Cấu hình thời gian, thang điểm, xáo trộn câu hỏi/đáp án.
  - Thuật toán trích xuất câu hỏi tự động theo ma trận tỷ lệ độ khó (`ExamMatrixService`).
  - Giao đề thi cho Lớp học hoặc cá nhân học sinh (`ExamAssignmentService`).
- [ ] **Sprint 3.6: Exam Engine & Auto-Grading (CỐT LÕI)**
  - API `POST /exams/{id}/start`: Khởi tạo phiên thi, tính `expires_at` từ server, snapshot thứ tự câu hỏi đã xáo trộn, giấu hoàn toàn `is_correct`.
  - API `POST /attempts/{id}/answers`: Autosave với cơ chế `UPSERT` tối ưu concurrency.
  - API `POST /attempts/{id}/submit`: Nộp bài với Transaction và Pessimistic Locking.
  - Động cơ chấm điểm tự động đa dạng câu hỏi (`ExamGradingService`).
  - Command Scheduler `exams:check-expired-attempts` tự động thu bài khi hết giờ.
- [ ] **Sprint 3.7: Analytics & Reporting Module**
  - API thống kê tổng quan (Admin/Teacher Dashboard).
  - Phổ điểm bài thi, tỷ lệ hoàn thành, thống kê câu hỏi sai nhiều (`Item Analysis`).
  - Xuất bảng điểm ra Excel.
- [ ] **Sprint 3.8: Backend Unit & Feature Testing**
  - Viết test case tự động bao phủ toàn bộ luồng chấm điểm, bảo mật token, và chống gian lận thời gian.

---

### Phase 4: Frontend Development (Phát triển React 19 + TypeScript + Shadcn UI)
- [ ] **Sprint 4.1: Khởi tạo Project & Cấu hình UI System**
  - Khởi tạo thư mục `frontend/` bằng Vite + React 19 + TypeScript.
  - Cài đặt Tailwind CSS, Shadcn UI, Lucide Icons, Recharts, KaTeX/MathJax.
  - Cài đặt React Router, TanStack Query, React Hook Form, Zod.
  - Thiết lập Axios Interceptor xử lý JWT Bearer token và refresh tự động.
- [ ] **Sprint 4.2: Shared Layouts & Authentication Views**
  - Layouts: `AdminLayout`, `TeacherLayout`, `StudentLayout`, `ExamLayout`.
  - Sidebar đa cấp thu gọn, Header hiển thị thông tin tài khoản và breadcrumbs.
  - Màn hình Đăng nhập trực quan, Đổi mật khẩu, Hồ sơ cá nhân.
- [ ] **Sprint 4.3: Module Giao diện Super Admin**
  - Dashboard quản trị: Thống kê số lượng, biểu đồ tăng trưởng.
  - Quản lý người dùng: Bảng danh sách phân trang, bộ lọc đa năng, modal thêm/sửa, import Excel.
  - Quản lý trường học, năm học, phân công lớp học.
- [ ] **Sprint 4.4: Module Giao diện Giáo viên (Teacher)**
  - Quản lý ngân hàng câu hỏi: Soạn thảo câu hỏi có Preview công thức Toán trực tiếp bằng KaTeX, upload ảnh.
  - Soạn đề thi: Kéo thả câu hỏi, sinh đề tự động theo ma trận.
  - Giao đề thi và theo dõi phòng thi trực tiếp (Realtime Exam Monitoring).
  - Báo cáo phân tích phổ điểm trực quan với Recharts.
- [ ] **Sprint 4.5: Module Giao diện Học sinh & Phòng thi Chuyên dụng (CỐT LÕI)**
  - Student Dashboard: Thẻ bài thi sắp diễn ra, đang mở và lịch sử bài thi.
  - **Phòng thi tập trung (Distraction-Free Exam Interface):**
    - Thanh thông tin: Tiêu đề đề thi, đồng hồ đếm ngược đồng bộ server, cảnh báo đổi màu khi sắp hết giờ.
    - Khung hiển thị câu hỏi: Render công thức Toán sắc nét, font chữ to rõ ràng.
    - Khung lựa chọn đáp án: Thao tác click chọn phản hồi tức thì.
    - Question Palette: Lưới câu hỏi 1..N hiển thị trạng thái đã làm / chưa làm / cờ vàng xem lại.
    - Nút Nộp bài kèm Modal cảnh báo số câu chưa làm trước khi xác nhận.
  - Màn hình Kết quả thi & Xem lại bài làm (tuân thủ cấu hình mở đáp án của giáo viên).

---

### Phase 5: Integration, End-to-End Testing & Security Audit
- [ ] **Task 5.1:** Tích hợp kiểm thử luồng nghiệp vụ hoàn chỉnh từ Tạo câu hỏi -> Tạo đề -> Giao bài -> Học sinh thi -> Autosave -> Thu bài tự động -> Chấm điểm -> Thống kê.
- [ ] **Task 5.2:** Kiểm thử trường hợp mất mạng / F5 trình duyệt trong khi thi (khôi phục trạng thái 100%).
- [ ] **Task 5.3:** Kiểm tra lỗ hổng bảo mật: Thử can thiệp điểm số từ client, thử xem đáp án qua Inspect/Network tab, thử gửi request nộp bài sau khi hết giờ.
- [ ] **Task 5.4:** Kiểm tra phân quyền truy cập chéo (IDOR / Vertical / Horizontal Privilege Escalation).

---

### Phase 6: Containerization & Deployment Guide
- [ ] **Task 6.1:** Xây dựng `Dockerfile` cho Backend (PHP 8.3 FPM) và Frontend (Node build -> Nginx).
- [ ] **Task 6.2:** Xây dựng `docker-compose.yml` tích hợp 5 dịch vụ: App (Laravel), Web (Nginx), Database (MySQL 8), Cache (Redis), Queue Worker/Scheduler.
- [ ] **Task 6.3:** Hoàn thiện tài liệu `README.md` và `docs/deployment-guide.md` chi tiết từ bước clone code đến chạy production chỉ bằng 1 câu lệnh `docker compose up -d`.
