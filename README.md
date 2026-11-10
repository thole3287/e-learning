# HỆ THỐNG THI TRẮC NGHIỆM TRỰC TUYẾN (ONLINE EXAMINATION PLATFORM)
## Enterprise-Grade E-Learning & Assessment System

---

## 🌟 GIỚI THIỆU DỰ ÁN

Hệ thống thi trắc nghiệm trực tuyến là nền tảng quản lý giáo dục và đánh giá năng lực học sinh toàn diện, được thiết kế theo kiến trúc hướng module, chuẩn hóa bảo mật theo tiêu chuẩn OWASP, sẵn sàng chịu tải cao và hỗ trợ mở rộng AI.

Dự án phục vụ 3 nhóm tác nhân chính:
- **Super Admin (Quản trị viên):** Quản lý cơ cấu trường học, năm học, khối lớp, phân quyền người dùng và kiểm toán toàn hệ thống.
- **Teacher (Giáo viên):** Quản lý ngân hàng câu hỏi đa dạng (hỗ trợ công thức Toán LaTeX/KaTeX), soạn đề tự động theo ma trận độ khó Bloom, giao bài theo lớp và phân tích phổ điểm.
- **Student (Học sinh):** Giao diện phòng thi tập trung (Distraction-Free), đồng bộ thời gian thực từ máy chủ, cơ chế tự động lưu bài (Autosave), tự động nộp bài khi hết giờ và xem phân tích kết quả.

---

## 🛠 TECH STACK

### Backend
- **Framework:** Laravel 12+ (PHP 8.3+)
- **Database:** MySQL 8.0+ (Chuẩn hóa 3NF, Foreign Keys, Composite Indexes)
- **Authentication:** Laravel Sanctum (Stateful / Bearer Token)
- **Authorization:** Role-Based Access Control (RBAC) & Laravel Policies
- **Caching & Queues:** Redis 7+ & Laravel Queue Workers
- **Automation:** Laravel Scheduler (Auto-submit background task)

### Frontend
- **Core:** React 19+ & TypeScript
- **Bundler:** Vite
- **UI Components:** Tailwind CSS & Shadcn UI & Lucide Icons
- **State & Data Fetching:** TanStack Query (React Query)
- **Form & Validation:** React Hook Form & Zod
- **Data Visualization:** Recharts (Phổ điểm, biểu đồ tiến độ học tập)
- **Math Rendering:** KaTeX / MathJax

### DevOps & Infrastructure
- Docker & Docker Compose
- Nginx Reverse Proxy
- PHP-FPM & Supervisor

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```
d:\e-learning\
├── docs/                        # Tài liệu phân tích và thiết kế kiến trúc chuẩn
│   ├── requirements.md          # Phân tích yêu cầu chức năng & phi chức năng
│   ├── business-rules.md        # Toàn bộ quy tắc nghiệp vụ cốt lõi
│   ├── use-cases.md             # Đặc tả chi tiết các Use Case quan trọng
│   ├── system-architecture.md   # Thiết kế kiến trúc phân tầng & data flow
│   ├── database-design.md       # Lược đồ database chi tiết từng bảng
│   ├── erd.md                   # Sơ đồ thực thể quan hệ Mermaid ERD
│   ├── api-specification.md     # Đặc tả chuẩn RESTful API v1
│   ├── authorization-matrix.md  # Ma trận phân quyền RBAC & Policy
│   ├── implementation-plan.md   # Kế hoạch triển khai chia theo sprint
│   ├── testing-strategy.md      # Chiến lược kiểm thử tự động & bảo mật
│   └── deployment-guide.md      # Hướng dẫn triển khai Docker & Native
├── backend/                     # Mã nguồn Backend (Laravel 12+)
├── frontend/                    # Mã nguồn Frontend (React 19 + TypeScript + Vite)
├── docker/                      # Cấu hình Docker, Nginx, PHP
├── docker-compose.yml           # Khởi chạy toàn bộ hệ thống bằng Docker
└── README.md                    # Tài liệu giới thiệu tổng quan dự án
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY NHANH (QUICK START)

### Cách 1: Chạy bằng Docker Compose (Khuyến nghị)

```bash
# 1. Khởi động toàn bộ cụm container (App, Web, MySQL, Redis, Worker)
docker compose up -d --build

# 2. Khởi tạo App Key và Migration dữ liệu mẫu
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed --force
docker compose exec app php artisan storage:link
```
Truy cập ứng dụng tại: `http://localhost`.

---

### Cách 2: Chạy môi trường Local Native (PHP + Node)

#### Khởi chạy Backend (Terminal 1)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

#### Khởi chạy Queue & Scheduler (Terminal 2)
```bash
cd backend
php artisan queue:work
php artisan schedule:work
```

#### Khởi chạy Frontend (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```
Truy cập Frontend tại: `http://localhost:5173`.

---

## 🔑 TÀI KHOẢN MẪU KHỞI TẠO (DEFAULT SEEDED USERS)

| Vai trò | Email | Tên đăng nhập | Mật khẩu mặc định |
|---|---|---|---|
| **Super Admin** | `admin@elearning.vn` | `admin` | `Admin@123456` |
| **Giáo viên Toán** | `teacher.math@elearning.vn` | `teacher_math` | `Teacher@123456` |
| **Giáo viên Vật lý**| `teacher.physics@elearning.vn`| `teacher_phys` | `Teacher@123456` |
| **Học sinh 1** | `student1@elearning.vn` | `student1` | `Student@123456` |
| **Học sinh 2** | `student2@elearning.vn` | `student2` | `Student@123456` |
