# HƯỚNG DẪN TRIỂN KHAI LÊN WEB HOSTING (cPanel / DirectAdmin / Plesk)

Hệ thống đã được đóng gói hoàn chỉnh: **Frontend React SPA** và **Backend Laravel API** chạy tích hợp trên cùng 1 hosting thông thường mà **KHÔNG CẦN DOCKER**.

---

## 1. YÊU CẦU CỦA GÓI HOSTING

1. **Phiên bản PHP**: Chọn **PHP 8.3** (hoặc PHP 8.2 trở lên).
2. **Extensions PHP cần bật** (trên cPanel vào mục *Select PHP Version*):
   - `pdo_mysql`
   - `mbstring`
   - `fileinfo`
   - `zip`
   - `bcmath`
   - `ctype`
   - `curl`
3. **Cơ sở dữ liệu**: MySQL 8.0+ hoặc MariaDB 10.4+.

---

## 2. DỮ LIỆU ĐÃ CHUẨN BỊ SẴN TRONG PROJECT

1. **File Database SQL**: Đã xuất sẵn tại `d:\e-learning\elearning_db.sql` (kèm đầy đủ 17 bảng, tài khoản quản trị, giáo viên, học sinh và ngân hàng đề thi).
2. **Frontend đã build**: Đã compile sang static assets và đồng bộ sẵn vào thư mục `backend/public/`.

---

## 3. CÁC BƯỚC ĐƯA LÊN HOSTING

### Bước 1: Tạo Database trên cPanel
1. Đăng nhập vào cPanel của hosting.
2. Tìm mục **MySQL Databases** (hoặc **MySQL Database Wizard**):
   - Tạo 1 Database mới (ví dụ: `u12345_elearning`).
   - Tạo 1 MySQL User (ví dụ: `u12345_user`) và mật khẩu mạnh.
   - Thêm User vào Database và tích chọn **ALL PRIVILEGES**.
3. Vào công cụ **phpMyAdmin**:
   - Chọn database vừa tạo.
   - Bấm tab **Import** (Nhập).
   - Chọn file `elearning_db.sql` từ máy tính của bạn và bấm **Go** (Thực hiện).

---

### Bước 2: Nén và Upload mã nguồn lên Hosting

1. Nén toàn bộ thư mục `backend` trên máy tính thành file `backend.zip`.
2. Mở **File Manager** trên cPanel:
   - **Cách A (Khuyên dùng - Đổi Document Root trong cPanel)**:
     - Upload file `backend.zip` vào thư mục gốc của tài khoản hosting (ngang hàng với thư mục `public_html`).
     - Giải nén ra thành thư mục `backend` (đường dẫn: `/home/username/backend`).
     - Vào cPanel -> mục **Domains** -> bấm **Manage** bên cạnh tên miền của bạn -> đổi **Document Root** thành:
       `backend/public` (hoặc `/home/username/backend/public`).
   - **Cách B (Nếu hosting không cho đổi Document Root, bắt buộc dùng `public_html`)**:
     - Tạo thư mục `/home/username/elearning` và giải nén toàn bộ `backend` vào đây.
     - Di chuyển TOÀN BỘ file bên trong `backend/public/` vào bên trong thư mục `public_html/`.
     - Mở file `public_html/index.php`, sửa 2 dòng đường dẫn:
       ```php
       require __DIR__.'/../elearning/vendor/autoload.php';
       $app = require_once __DIR__.'/../elearning/bootstrap/app.php';
       ```

---

### Bước 3: Cấu hình file `.env` trên Hosting

Trong thư mục `backend` (hoặc `elearning`):
1. Đổi tên file `.env.example` thành `.env` (hoặc sửa trực tiếp file `.env`).
2. Chỉnh sửa các thông số sau cho khớp với thông tin hosting của bạn:
   ```dotenv
   APP_NAME="Online Examination Platform"
   APP_ENV=production
   APP_KEY=base64:GGv0ZgfwgVZsUs/0uvscCDjAma8kDZrykDDYerd2Rl8=
   APP_DEBUG=false
   APP_URL=https://ten-mien-cua-ban.com

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=u12345_elearning
   DB_USERNAME=u12345_user
   DB_PASSWORD=mat_khau_database_cua_ban

   SESSION_DRIVER=database
   CACHE_STORE=database
   QUEUE_CONNECTION=database
   ```

---

### Bước 4: Thiết lập Cron Job tự động (Thu bài thi khi hết giờ)

Trên cPanel tìm mục **Cron Jobs**:
- Chọn chu kỳ: **Every minute (\* \* \* \* \*)**.
- Điền câu lệnh:
  ```bash
  /usr/local/bin/php /home/username/backend/artisan schedule:run >> /dev/null 2>&1
  ```
  *(Thay `username` bằng tên tài khoản hosting của bạn)*.

---

## 4. TÀI KHOẢN ĐĂNG NHẬP MẶC ĐỊNH

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| **Quản trị viên (Super Admin)** | `admin` | `Admin@123456` |
| **Giáo viên Toán** | `teacher_math` | `Teacher@123456` |
| **Học sinh 1** | `student1` | `Student@123456` |
