# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG (DEPLOYMENT GUIDE)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. YÊU CẦU MÔI TRƯỜNG TỐI THIỂU (SYSTEM REQUIREMENTS)

### Môi trường máy chủ (Production Server)
- **Hệ điều hành:** Linux (Ubuntu 22.04 LTS / Debian 12 / AlmaLinux 9) hoặc Windows Server có cài Docker.
- **CPU:** Tối thiểu 2 vCPU (Khuyến nghị 4 vCPU cho kỳ thi 500 thí sinh đồng thời).
- **RAM:** Tối thiểu 4 GB (Khuyến nghị 8 GB khi chạy kèm Redis và Queue Worker).
- **Disk:** Tối thiểu 40 GB SSD (NVMe khuyến nghị để tối ưu I/O cho cơ sở dữ liệu).

### Môi trường phát triển cục bộ (Local Development)
- **Cách 1 (Docker):** Đã cài Docker Desktop v24+ và Docker Compose v2+.
- **Cách 2 (Native):** PHP 8.3+, Composer 2.8+, Node.js 20+, MySQL 8+, Redis 7+ (ví dụ qua Laragon hoặc XAMPP).

---

## 2. TRIỂN KHAI BẰNG DOCKER & DOCKER COMPOSE (KHUYẾN NGHỊ PRODUCTION)

Hệ thống được đóng gói thành cụm 5 containers độc lập:
1. `app`: PHP 8.3-FPM chạy mã nguồn Laravel Backend.
2. `web`: Nginx làm Reverse Proxy, phục vụ Frontend static files và forward API requests về `app`.
3. `db`: MySQL 8.0 lưu trữ cơ sở dữ liệu.
4. `cache`: Redis 7 xử lý bộ đệm và hàng đợi Queue.
5. `worker`: Chạy tiến trình nền `php artisan queue:work` và Laravel Scheduler cho auto-submit.

### Các bước triển khai:

#### Bước 1: Sao chép mã nguồn và cấu hình môi trường
```bash
git clone <repository_url> elearning-platform
cd elearning-platform

# Tạo file môi trường cho Backend
cp backend/.env.example backend/.env

# Tạo file môi trường cho Frontend
cp frontend/.env.example frontend/.env
```

#### Bước 2: Cập nhật thông số bảo mật trong `backend/.env`
```ini
APP_NAME="OnlineExamPlatform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=elearning_db
DB_USERNAME=elearning_user
DB_PASSWORD=YourStrongSecretPassword123!

REDIS_HOST=cache
REDIS_PORT=6379

QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

#### Bước 3: Khởi động hệ thống với Docker Compose
```bash
docker compose up -d --build
```

#### Bước 4: Chạy Migration và Nạp dữ liệu mẫu
```bash
# Sinh App Key
docker compose exec app php artisan key:generate

# Chạy Migration và nạp dữ liệu ban đầu
docker compose exec app php artisan migrate --seed --force

# Cấu hình symlink cho file upload
docker compose exec app php artisan storage:link

# Tối ưu hóa cache
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache
```

Hệ thống đã sẵn sàng hoạt động tại địa chỉ: `http://localhost` (hoặc tên miền của bạn).

---

## 3. TRIỂN KHAI PHÁT TRIỂN CỤC BỘ (LOCAL DEVELOPMENT NATIVE)

### Bước 1: Khởi động Backend (Laravel 12)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Cấu hình kết nối MySQL trong .env (VD: DB_HOST=127.0.0.1, DB_PORT=3306, DB_DATABASE=elearning)
php artisan migrate --seed
php artisan serve --port=8000
```

### Bước 2: Khởi động Queue Worker & Scheduler (Terminal riêng)
```bash
cd backend
php artisan queue:work
php artisan schedule:work
```

### Bước 3: Khởi động Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev
```
Giao diện người dùng sẽ chạy tại: `http://localhost:5173`.

---

## 4. TÀI KHOẢN MẪU KHỞI TẠO SẴN (DEFAULT SEEDED ACCOUNTS)

| Vai trò (Role) | Email | Tên đăng nhập | Mật khẩu mặc định | Ghi chú |
|---|---|---|---|---|
| **Super Admin** | `admin@elearning.vn` | `admin` | `Admin@123456` | Toàn quyền quản trị hệ thống |
| **Giáo viên Toán** | `teacher.math@elearning.vn` | `teacher_math` | `Teacher@123456` | Phụ trách môn Toán khối 12 |
| **Giáo viên Lý** | `teacher.physics@elearning.vn` | `teacher_phys` | `Teacher@123456` | Phụ trách môn Vật lý |
| **Học sinh 1** | `student1@elearning.vn` | `student1` | `Student@123456` | Lớp 12A1 (Mã: HS202601) |
| **Học sinh 2** | `student2@elearning.vn` | `student2` | `Student@123456` | Lớp 12A1 (Mã: HS202602) |

---

## 5. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi phân quyền thư mục storage / bootstrap/cache (Linux):**
   ```bash
   sudo chown -R www-data:www-data storage bootstrap/cache
   sudo chmod -R 775 storage bootstrap/cache
   ```
2. **Lỗi CORS khi gọi API từ Frontend:**
   - Kiểm tra `backend/config/cors.php`, đảm bảo `allowed_origins` đã thêm URL Frontend (VD: `http://localhost:5173`).
3. **Lượt thi hết giờ không tự động nộp bài:**
   - Kiểm tra xem tiến trình `php artisan schedule:work` hoặc Cron Job trên máy chủ đã được cấu hình chưa:
     ```bash
     * * * * * cd /path-to-project/backend && php artisan schedule:run >> /dev/null 2>&1
     ```
