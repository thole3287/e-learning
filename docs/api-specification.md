# TÀI LIỆU ĐẶC TẢ RESTFUL API (API SPECIFICATION V1)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. TIÊU CHUẨN THIẾT KẾ API

- **Base URL:** `http://localhost:8000/api/v1`
- **Định dạng dữ liệu:** `application/json` cho cả Request và Response.
- **Xác thực:** Bearer Token thông qua Header: `Authorization: Bearer {sanctum_token}`.
- **Cấu trúc JSON Response Envelope chuẩn:**

### Phản hồi thành công:
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... },
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 72
  }
}
```

### Phản hồi lỗi:
```json
{
  "success": false,
  "message": "Dữ liệu gửi lên không hợp lệ",
  "errors": {
    "email": ["Email đã tồn tại trên hệ thống."],
    "duration_minutes": ["Thời lượng làm bài phải tối thiểu 5 phút."]
  }
}
```

---

## 2. DANH MỤC CÁC ENDPOINT THEO MODULE

### 2.1. Phân hệ Xác thực & Tài khoản (Authentication)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Đăng nhập (Email/Username + Password), trả về token và profile |
| `POST` | `/auth/logout` | Authenticated | Thu hồi token hiện tại |
| `GET` | `/auth/me` | Authenticated | Lấy thông tin tài khoản đang đăng nhập |
| `PUT` | `/auth/profile` | Authenticated | Cập nhật thông tin cá nhân (Tên, SĐT, Ngày sinh) |
| `PUT` | `/auth/change-password` | Authenticated | Đổi mật khẩu |

---

### 2.2. Phân hệ Quản lý Người dùng (Users Management)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/users` | Super Admin | Danh sách người dùng (Bộ lọc: `role`, `status`, `school_id`, `search`) |
| `POST` | `/users` | Super Admin | Tạo tài khoản mới |
| `GET` | `/users/{id}` | Super Admin | Chi tiết thông tin người dùng |
| `PUT` | `/users/{id}` | Super Admin | Cập nhật thông tin, kích hoạt/khóa tài khoản |
| `DELETE` | `/users/{id}` | Super Admin | Xóa tài khoản (Soft delete) |
| `POST` | `/users/import` | Super Admin | Nhập hàng loạt người dùng từ file Excel/CSV |
| `POST` | `/users/{id}/reset-password`| Super Admin | Cấp lại mật khẩu mặc định |

---

### 2.3. Phân hệ Cơ cấu Trường & Lớp học (School & Academic Management)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/schools` | Super Admin | Danh sách trường học |
| `POST` | `/schools` | Super Admin | Tạo mới trường học |
| `GET` | `/academic-years` | Super Admin, Teacher | Danh sách năm học |
| `GET` | `/grades` | Authenticated | Danh sách khối lớp (Khối 10, 11, 12) |
| `GET` | `/classes` | Super Admin, Teacher | Danh sách lớp học (kèm phân trang, lọc theo khối/năm) |
| `POST` | `/classes` | Super Admin | Tạo mới lớp học |
| `GET` | `/classes/{id}` | Authenticated | Chi tiết lớp học và danh sách học sinh |
| `PUT` | `/classes/{id}` | Super Admin | Cập nhật lớp học |
| `DELETE` | `/classes/{id}` | Super Admin | Xóa lớp học |
| `POST` | `/classes/{id}/students` | Super Admin, Teacher | Thêm học sinh vào lớp |
| `DELETE` | `/classes/{id}/students/{student_id}` | Super Admin | Xóa học sinh khỏi lớp |
| `POST` | `/classes/{id}/assign-teacher` | Super Admin | Phân công giáo viên bộ môn / chủ nhiệm |

---

### 2.4. Phân hệ Môn học & Cây kiến thức (Subjects & Curriculum)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/subjects` | Authenticated | Danh sách môn học |
| `POST` | `/subjects` | Super Admin | Tạo môn học mới |
| `PUT` | `/subjects/{id}` | Super Admin | Cập nhật môn học |
| `GET` | `/subjects/{id}/chapters` | Authenticated | Danh sách chương học theo môn và khối |
| `POST` | `/chapters` | Super Admin, Teacher | Tạo mới chương học |
| `GET` | `/chapters/{id}/lessons` | Authenticated | Danh sách bài học trong chương |
| `POST` | `/lessons` | Super Admin, Teacher | Tạo mới bài học |

---

### 2.5. Phân hệ Ngân hàng Câu hỏi (Question Bank)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/questions` | Super Admin, Teacher | Danh sách câu hỏi (Lọc: `subject_id`, `difficulty_level`, `question_type`, `chapter_id`, `search`) |
| `POST` | `/questions` | Super Admin, Teacher | Tạo câu hỏi mới (kèm danh sách options và đáp án) |
| `GET` | `/questions/{id}` | Super Admin, Teacher | Xem chi tiết câu hỏi và đáp án |
| `PUT` | `/questions/{id}` | Super Admin, Teacher | Cập nhật nội dung câu hỏi và các phương án |
| `DELETE` | `/questions/{id}` | Super Admin, Teacher | Xóa câu hỏi (Soft delete) |
| `POST` | `/questions/{id}/duplicate` | Super Admin, Teacher | Nhân bản câu hỏi |
| `POST` | `/questions/import` | Super Admin, Teacher | Nhập câu hỏi từ file Excel |
| `GET` | `/questions/export` | Super Admin, Teacher | Xuất danh sách câu hỏi ra Excel |

---

### 2.6. Phân hệ Quản lý Đề thi (Exam Management)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/exams` | Super Admin, Teacher | Danh sách đề thi do mình tạo hoặc chia sẻ |
| `POST` | `/exams` | Teacher, Super Admin | Tạo khung đề thi mới |
| `GET` | `/exams/{id}` | Teacher, Super Admin | Xem chi tiết cấu trúc đề thi và danh sách câu hỏi |
| `PUT` | `/exams/{id}` | Teacher, Super Admin | Cập nhật cấu hình đề thi (chỉ khi chưa có ai làm) |
| `DELETE` | `/exams/{id}` | Teacher, Super Admin | Xóa đề thi |
| `POST` | `/exams/{id}/questions` | Teacher, Super Admin | Thêm danh sách câu hỏi vào đề thi |
| `DELETE` | `/exams/{id}/questions/{qId}` | Teacher, Super Admin | Xóa câu hỏi khỏi đề thi |
| `POST` | `/exams/{id}/generate-matrix` | Teacher, Super Admin | Tự động chọn câu hỏi từ ngân hàng theo ma trận |
| `POST` | `/exams/{id}/publish` | Teacher, Super Admin | Xuất bản đề thi (`status = 'published'`) |
| `POST` | `/exams/{id}/close` | Teacher, Super Admin | Đóng đề thi (`status = 'closed'`) |
| `POST` | `/exams/{id}/assign` | Teacher, Super Admin | Giao đề thi cho lớp học hoặc học sinh |

---

### 2.7. Phân hệ Thí sinh & Phòng thi Trực tuyến (Exam Taking & Engine) - CỐT LÕI

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/student/exams` | Student | Danh sách đề thi được giao (Trạng thái: Sắp diễn ra, Đang mở, Đã nộp) |
| `POST` | `/exams/{id}/start` | Student | Bắt đầu làm bài thi / Tiếp tục phiên làm dở dang |
| `GET` | `/attempts/{attempt_id}` | Student | Lấy thông tin phòng thi, câu hỏi và câu trả lời đã lưu |
| `POST` | `/attempts/{attempt_id}/answers` | Student | Autosave câu trả lời cho một câu hỏi |
| `POST` | `/attempts/{attempt_id}/submit` | Student | Nộp bài thi chính thức và kích hoạt chấm điểm |
| `GET` | `/attempts/{attempt_id}/result` | Student, Teacher | Xem kết quả bài thi (Điểm số, câu đúng/sai, lời giải nếu được phép) |

#### Chi tiết Payload API `POST /exams/{id}/start`:
- **Response:**
```json
{
  "success": true,
  "data": {
    "attempt_id": 482,
    "exam_id": 12,
    "title": "Kiểm tra Giữa kỳ 1 - Môn Toán 12",
    "duration_minutes": 45,
    "started_at": "2026-11-01T22:00:00Z",
    "expires_at": "2026-11-01T22:45:00Z",
    "server_now": "2026-11-01T22:00:02Z",
    "total_questions": 40,
    "questions": [
      {
        "id": 101,
        "question_type": "single_choice",
        "difficulty_level": 1,
        "content": "Tính đạo hàm của hàm số $y = x^3 - 3x + 1$?",
        "points": 0.25,
        "options": [
          { "id": 401, "content": "$y' = 3x^2 - 3$" },
          { "id": 402, "content": "$y' = 3x^2 + 3$" },
          { "id": 403, "content": "$y' = x^2 - 3$" },
          { "id": 404, "content": "$y' = 3x^2$" }
        ]
      }
    ],
    "saved_answers": [
      {
        "question_id": 101,
        "selected_option_ids": [401],
        "text_answer": null,
        "is_flagged": false
      }
    ]
  }
}
```
*(Lưu ý bảo mật: Tuyệt đối không trả `is_correct` và `explanation` trong API này).*

#### Chi tiết Payload API `POST /attempts/{id}/answers` (Autosave):
- **Request:**
```json
{
  "question_id": 101,
  "selected_option_ids": [401],
  "text_answer": null,
  "is_flagged": true
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Đã lưu câu trả lời",
  "data": {
    "question_id": 101,
    "saved_at": "2026-11-01T22:05:12Z"
  }
}
```

---

### 2.8. Phân hệ Báo cáo & Thống kê (Reports & Analytics)

| Phương thức | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| `GET` | `/reports/dashboard-stats` | Authenticated | Thống kê tổng hợp theo vai trò (Admin, Teacher, Student) |
| `GET` | `/reports/exams/{id}/overview` | Teacher, Admin | Phổ điểm, điểm TB, min, max, tỷ lệ hoàn thành |
| `GET` | `/reports/exams/{id}/item-analysis`| Teacher, Admin | Phân tích từng câu hỏi: tỷ lệ chọn A/B/C/D, tỷ lệ sai cao |
| `GET` | `/reports/exams/{id}/export` | Teacher, Admin | Xuất bảng điểm lớp ra file Excel |
| `GET` | `/reports/students/{id}/progress` | Student, Teacher | Lịch sử tiến bộ học tập qua các kỳ thi |
| `GET` | `/activity-logs` | Super Admin | Nhật ký kiểm toán hệ thống |
