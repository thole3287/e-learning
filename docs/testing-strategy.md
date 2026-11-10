# CHIẾN LƯỢC KIỂM THỬ HỆ THỐNG (TESTING STRATEGY)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC KIỂM THỬ

Hệ thống thi trắc nghiệm trực tuyến đòi hỏi độ chính xác tuyệt đối về logic chấm điểm, tính toàn vẹn của dữ liệu và khả năng bảo mật phòng thi. Chiến lược kiểm thử tuân thủ mô hình **Testing Pyramid**:

```
        /  E2E Tests  \          10% - Luồng thi trọn vẹn từ lúc giao đến xem điểm
       / Integration   \         30% - Kiểm tra API Endpoints, Policies, Database Transactions
      /   Unit Tests    \        60% - Services, Thuật toán chấm điểm, Validation Rules
```

---

## 2. KIỂM THỬ BACKEND (PHPUNIT / PEST)

### 2.1. Kiểm thử Thuật toán Chấm điểm (Grading Service Unit Tests)
- **Test Case 1 (Single Choice):**
  - Input: Thí sinh chọn phương án đúng. -> Expectation: Đạt 100% điểm câu hỏi.
  - Input: Thí sinh chọn phương án sai. -> Expectation: Đạt 0 điểm.
  - Input: Thí sinh không chọn phương án nào. -> Expectation: Đạt 0 điểm, tính vào `total_unanswered`.
- **Test Case 2 (Multiple Choice - Điểm thành phần):**
  - Câu hỏi có 3 đáp án đúng (A, B, C) và 1 đáp án sai (D), điểm tối đa 1.0.
  - Input: Thí sinh chọn A, B -> Expectation: Điểm = $(2/3) \times 1.0 = 0.67$.
  - Input: Thí sinh chọn A, B, D -> Expectation: Bị trừ điểm do chọn sai D.
- **Test Case 3 (Fill in the Blank):**
  - Đáp án chuẩn: `["Hà Nội", "ha noi", "Ha Noi"]`.
  - Input: `"   Hà Nội   "` -> Expectation: Chuẩn hóa trim() thành công, tính đúng 100% điểm.
  - Input: `"Sài Gòn"` -> Expectation: 0 điểm.

### 2.2. Kiểm thử Bảo mật & Phân quyền (Security & Authorization Feature Tests)
- **Test Auth & Token:** Không gửi token hoặc token hết hạn gọi API được bảo vệ -> Expectation: HTTP 401 Unauthorized.
- **Test Horizontal Privilege Escalation (IDOR):** Học sinh A cố tình gọi API nộp bài hoặc lưu câu trả lời cho `attempt_id` của học sinh B -> Expectation: HTTP 403 Forbidden.
- **Test Data Leakage Prevention:** Gọi API `POST /exams/{id}/start` hoặc `GET /attempts/{id}` -> Expectation: JSON trả về KHÔNG chứa các key `is_correct`, `explanation`, `correct_answer`.
- **Test Đề thi chưa mở:** Gọi bắt đầu thi khi `NOW() < start_time` -> Expectation: HTTP 403 "Bài thi chưa đến thời gian mở".
- **Test Quá hạn làm bài:** Gọi lưu câu trả lời khi `NOW() > expires_at` -> Expectation: HTTP 422 "Thời gian làm bài đã kết thúc".

### 2.3. Kiểm thử Giao dịch & Xung đột đồng thời (Concurrency & Race Conditions)
- **Test Double Submit:** Gửi 2 request nộp bài cùng lúc cho 1 lượt thi -> Expectation: Một request thành công chuyển trạng thái `GRADED`, request thứ hai bị từ chối với HTTP 400 "Bài thi đã được nộp trước đó". Không phát sinh lỗi tính điểm 2 lần.
- **Test Autosave Upsert:** Gửi liên tiếp 5 request đổi câu trả lời cho cùng một câu hỏi -> Expectation: Bảng `student_answers` chỉ tồn tại duy nhất 1 bản ghi lưu giá trị cuối cùng.

### 2.4. Kiểm thử Tác vụ nền (Scheduler & Job Tests)
- **Test Auto-submit Command:** Tạo 3 lượt thi có `expires_at` trong quá khứ và trạng thái `IN_PROGRESS`. Chạy command `php artisan exams:check-expired-attempts` -> Expectation: Cả 3 lượt thi đều tự động chuyển sang `AUTO_SUBMITTED`, tính điểm đầy đủ và lưu `graded_at`.

---

## 3. KIỂM THỬ FRONTEND (VITEST & TESTING LIBRARY)

- **Test Form Validation (Zod):**
  - Form Đăng nhập: Báo lỗi khi email rỗng hoặc sai định dạng.
  - Form Soạn đề: Báo lỗi khi thời lượng làm bài <= 0 hoặc tổng điểm = 0.
- **Test Question Palette Navigation:**
  - Click vào câu số 5 trên bảng điều hướng -> Expectation: Câu hỏi số 5 cuộn vào tầm nhìn và được kích hoạt.
  - Chọn đáp án cho câu 5 -> Expectation: Ô số 5 đổi sang màu xanh lá ("Đã làm").
  - Click nút cờ "Xem lại" -> Expectation: Ô số 5 xuất hiện icon cờ vàng.
- **Test Countdown Timer & Auto-trigger:**
  - Mock đồng hồ về 00:00 -> Expectation: Hệ thống tự động disable toàn bộ lựa chọn đáp án và tự động gọi API submit.
- **Test Offline Fallback:**
  - Giả lập mất mạng `navigator.onLine = false` -> Expectation: Hiển thị thanh cảnh báo màu vàng "Mất kết nối Internet - Đang lưu tạm vào bộ nhớ máy". Dữ liệu không bị mất.

---

## 4. MA TRẬN KIỂM SOÁT LỖ HỔNG (OWASP TOP 10 AUDIT CHECKLIST)

| Nguy cơ bảo mật | Biện pháp phòng vệ trong hệ thống | Đánh giá |
|---|---|:---:|
| **SQL Injection** | Sử dụng 100% Eloquent ORM và PDO Parameter Binding; tuyệt đối không nối chuỗi raw SQL. | ✅ Đạt |
| **Cross-Site Scripting (XSS)** | Làm sạch nội dung HTML/LaTeX từ giáo viên bằng HTMLPurifier; React tự động escape ký tự khi render. | ✅ Đạt |
| **Broken Access Control** | Triển khai Laravel Policies ở 100% các Resource API; xác thực quyền sở hữu `user_id`. | ✅ Đạt |
| **Rate Limiting & DoS** | Áp dụng Throttle middleware 60 req/phút cho các API Autosave. | ✅ Đạt |
| **Data Tampering** | Thời gian và điểm số tính toán 100% tại Backend; Client chỉ gửi lựa chọn phương án. | ✅ Đạt |
