# ĐẶC TẢ USE CASES HỆ THỐNG (USE CASE SPECIFICATIONS)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. TỔNG QUAN HỆ THỐNG USE CASES

```
+---------------------------------------------------------------------------------+
|                                 ONLINE EXAM SYSTEM                              |
|                                                                                 |
|   +-------------------+                                                         |
|   |    SUPER ADMIN    | ---> [UC-ADM-01: Quản lý người dùng & Import CSV]       |
|   +-------------------+ ---> [UC-ADM-02: Quản lý trường học, năm học & lớp]    |
|                         ---> [UC-ADM-03: Quản lý môn học & chương trình]        |
|                         ---> [UC-ADM-04: Giám sát toàn hệ thống & Audit Log]    |
|                                                                                 |
|   +-------------------+                                                         |
|   |      TEACHER      | ---> [UC-TCH-01: Quản lý ngân hàng câu hỏi & LaTeX]     |
|   +-------------------+ ---> [UC-TCH-02: Import câu hỏi từ file Excel]          |
|                         ---> [UC-TCH-03: Tạo đề thi & sinh mã đề hoán vị]       |
|                         ---> [UC-TCH-04: Giao đề thi theo lớp & đặt lịch thi]   |
|                         ---> [UC-TCH-05: Giám sát phòng thi thời gian thực]     |
|                         ---> [UC-TCH-06: Xem phổ điểm & phân tích câu hỏi sai]  |
|                                                                                 |
|   +-------------------+                                                         |
|   |      STUDENT      | ---> [UC-STU-01: Xem lịch thi & danh sách đề thi]       |
|   +-------------------+ ---> [UC-STU-02: Bắt đầu làm bài thi (Server Timer)]    |
|                         ---> [UC-STU-03: Tự động lưu đáp án khi chọn]           |
|                         ---> [UC-STU-04: Đánh dấu câu hỏi cần xem lại]          |
|                         ---> [UC-STU-05: Nộp bài & xem điểm / đáp án chi tiết]  |
|                         ---> [UC-STU-06: Xem lịch sử & biểu đồ tiến độ học tập] |
|                                                                                 |
|   +-------------------+                                                         |
|   |  CRON / WORKER    | ---> [UC-SYS-01: Quét quá hạn & Tự động nộp bài]        |
|   +-------------------+                                                         |
+---------------------------------------------------------------------------------+
```

---

## 2. DANH MỤC CÁC USE CASE

### 2.1. Phân hệ Quản trị viên (Super Admin)
- **UC-ADM-01:** Quản lý tài khoản người dùng (CRUD, Khóa/Mở khóa, Phân quyền, Import danh sách).
- **UC-ADM-02:** Quản lý cơ cấu trường học (Năm học, Học kỳ, Khối lớp, Danh sách lớp học).
- **UC-ADM-03:** Phân công giảng dạy (Gán giáo viên chủ nhiệm, gán giáo viên bộ môn cho lớp).
- **UC-ADM-04:** Quản lý danh mục học phần (Môn học, Chương, Bài học, Danh mục kiến thức).
- **UC-ADM-05:** Cấu hình hệ thống (Thang điểm, tham số phòng thi, thời gian autosave, email notifications).
- **UC-ADM-06:** Báo cáo thống kê toàn trường & Giám sát nhật ký hoạt động (Audit Logs).

### 2.2. Phân hệ Giáo viên (Teacher)
- **UC-TCH-01:** Quản lý ngân hàng câu hỏi (Tạo, sửa, xóa, gắn nhãn độ khó Bloom, chèn công thức Toán KaTeX/hình ảnh).
- **UC-TCH-02:** Nhập câu hỏi từ file Excel theo template chuẩn hóa.
- **UC-TCH-03:** Soạn thảo đề thi (Thủ công hoặc tự động trích xuất theo ma trận tỷ lệ độ khó).
- **UC-TCH-04:** Xuất bản đề và sinh mã đề hoán vị (Xáo trộn câu hỏi và các phương án).
- **UC-TCH-05:** Giao bài thi cho lớp học (Cấu hình thời gian bắt đầu, kết thúc, thời lượng, số lần thi, hiển thị đáp án).
- **UC-TCH-06:** Theo dõi trực tiếp phòng thi (Số lượng học sinh đang làm bài, số lượng đã nộp).
- **UC-TCH-07:** Thống kê kết quả thi, phân tích phổ điểm và tỷ lệ câu hỏi trả lời sai nhiều nhất.
- **UC-TCH-08:** Xuất danh sách điểm ra định dạng Excel/PDF.

### 2.3. Phân hệ Học sinh (Student)
- **UC-STU-01:** Xem danh sách bài kiểm tra (Sắp diễn ra, Đang diễn ra, Đã hoàn thành).
- **UC-STU-02:** Bắt đầu làm bài thi (Khởi tạo phiên thi `exam_attempt` và kích hoạt đồng hồ Server).
- **UC-STU-03:** Thao tác làm bài thi (Chọn đáp án, đánh dấu câu hỏi xem lại, chuyển câu linh hoạt).
- **UC-STU-04:** Tự động lưu tiến trình làm bài (Autosave background) và khôi phục khi reload trang.
- **UC-STU-05:** Nộp bài thi (Chủ động nộp hoặc hệ thống tự động khóa khi đồng hồ đếm ngược về 0).
- **UC-STU-06:** Xem kết quả thi (Điểm số, số câu đúng/sai, đáp án & giải thích chi tiết theo cấu hình).
- **UC-STU-07:** Theo dõi lịch sử làm bài và biểu đồ tiến bộ học tập cá nhân theo từng môn học.

---

## 3. ĐẶC TẢ CHI TIẾT CÁC USE CASE TRỌNG YẾU

### 3.1. UC-STU-02: Bắt đầu làm bài thi (Start Exam Attempt)
- **Actor:** Student (Học sinh).
- **Tiền điều kiện (Preconditions):**
  1. Học sinh đã đăng nhập hệ thống với token hợp lệ.
  2. Đề thi đã được giao cho lớp của học sinh hoặc đích danh học sinh.
  3. Thời điểm hiện tại `NOW()` nằm trong khoảng `[start_time, end_time]`.
  4. Số lượt thi đã hoàn thành của học sinh còn dưới ngưỡng `max_attempts`.
- **Luồng chính (Main Flow):**
  1. Học sinh truy cập trang thông tin đề thi và bấm "Bắt đầu làm bài".
  2. Frontend gửi request `POST /api/v1/exams/{id}/start`.
  3. Backend kiểm tra toàn bộ tiền điều kiện (Authorization Policy, thời gian, số lần thi).
  4. Backend kiểm tra xem có lượt thi nào đang `IN_PROGRESS` của học sinh này hay không:
     - Nếu đã có: Trả về lượt thi hiện tại kèm các câu trả lời đã lưu trước đó (Phục hồi phiên).
     - Nếu chưa có: Tạo bản ghi mới trong `exam_attempts` với `started_at = NOW()`, `expires_at = min(NOW() + duration, end_time)`, `status = 'IN_PROGRESS'`.
  5. Backend sinh thứ tự hiển thị câu hỏi và hoán vị phương án (dựa trên cấu hình xáo trộn của đề thi).
  6. Backend lọc bỏ hoàn toàn các trường nhạy cảm: `is_correct`, `explanation`, `correct_answer`.
  7. Backend trả về payload dữ liệu phòng thi: danh sách câu hỏi, thời gian hết hạn (`expires_at`), thời gian server hiện tại (`server_now`), và các câu trả lời đã lưu.
  8. Frontend hiển thị giao diện làm bài thi: hiển thị đồng hồ đếm ngược được đồng bộ với server time, danh sách số thứ tự câu hỏi và nội dung câu hỏi đầu tiên.
- **Luồng ngoại lệ (Alternative / Exception Flows):**
  - *Chưa đến giờ thi (`NOW() < start_time`):* Backend trả về HTTP 403 Forbidden kèm thông báo "Bài thi chưa mở. Vui lòng quay lại sau".
  - *Đã quá giờ thi (`NOW() > end_time`):* Backend trả về HTTP 403 "Bài thi đã kết thúc thời gian làm bài".
  - *Đã hết số lần làm bài:* Backend trả về HTTP 422 "Bạn đã sử dụng hết số lần làm bài quy định".

---

### 3.2. UC-STU-03: Tự động lưu câu trả lời (Autosave Answers)
- **Actor:** Student (Học sinh).
- **Tiền điều kiện:** Học sinh đang trong phiên làm bài (`exam_attempt` có `status = 'IN_PROGRESS'`).
- **Luồng chính:**
  1. Học sinh click chọn phương án trắc nghiệm hoặc nhập đáp án vào ô điền từ.
  2. Frontend cập nhật state cục bộ ngay lập tức và đánh dấu câu hỏi "Đã trả lời" trên danh sách điều hướng.
  3. Frontend kích hoạt cơ chế debounce (hoặc gửi ngay) gọi `POST /api/v1/attempts/{attempt_id}/answers` với payload:
     ```json
     {
       "question_id": 105,
       "selected_option_ids": [412],
       "text_answer": null,
       "is_flagged": false
     }
     ```
  4. Backend xác thực:
     - Phiên thi thuộc quyền sở hữu của học sinh hiện tại.
     - Phiên thi đang `IN_PROGRESS`.
     - `NOW() <= expires_at`.
  5. Backend thực hiện `UPSERT` vào bảng `student_answers` ứng với cặp `(exam_attempt_id, question_id)`.
  6. Backend trả về HTTP 200 `{ success: true, saved_at: timestamp }`.
  7. Frontend hiển thị trạng thái "Đã lưu vào máy chủ".
- **Luồng ngoại lệ:**
  - *Mất kết nối mạng:* Frontend lưu câu trả lời vào `IndexedDB` / `localStorage` và hiển thị cảnh báo "Mất kết nối - Đang lưu tạm trên máy". Khi có mạng trở lại, frontend tự động flush danh sách câu trả lời chưa đồng bộ lên server.
  - *Phiên thi đã hết hạn (`NOW() > expires_at`):* Backend từ chối lưu và trả về mã lỗi `ATTEMPT_EXPIRED`, frontend chuyển hướng học sinh sang màn hình nộp bài tự động.

---

### 3.3. UC-STU-05: Nộp bài thi & Chấm điểm (Submit Exam Attempt)
- **Actor:** Student / System.
- **Tiền điều kiện:** `exam_attempt` có `status = 'IN_PROGRESS'`.
- **Luồng chính:**
  1. Học sinh bấm "Nộp bài" trên thanh công cụ.
  2. Hệ thống hiển thị Modal xác nhận: "Bạn đã làm x/y câu. Bạn có chắc chắn muốn nộp bài?".
  3. Học sinh xác nhận "Đồng ý nộp".
  4. Frontend gửi request `POST /api/v1/attempts/{attempt_id}/submit`.
  5. Backend mở Database Transaction:
     - Khóa bi quan bản ghi: `ExamAttempt::lockForUpdate()->find($id)`.
     - Kiểm tra nếu `status != 'IN_PROGRESS'`: Rollback và trả về HTTP 400 "Bài thi đã được nộp trước đó".
     - Cập nhật `status = 'SUBMITTED'`, `submitted_at = NOW()`.
  6. Backend gọi `ExamGradingService::gradeAttempt($attempt)`:
     - Lấy danh sách câu hỏi của đề và đáp án chuẩn từ `question_options`.
     - Duyệt từng câu trả lời trong `student_answers` và so khớp với đáp án chuẩn.
     - Tính số câu đúng (`total_correct`), sai (`total_incorrect`), bỏ trống (`total_unanswered`).
     - Tính tổng điểm thực tế và quy đổi sang thang điểm đề thi.
     - Cập nhật bản ghi `exam_attempts`: `score = $calculatedScore`, `graded_at = NOW()`, `status = 'GRADED'`.
  7. Commit Transaction.
  8. Backend kiểm tra cấu hình xem điểm (`view_score_type`):
     - Nếu cho phép xem ngay: Trả về kết quả điểm số, số câu đúng/sai.
     - Nếu không cho phép: Trả về thông báo "Nộp bài thành công. Điểm số sẽ được công bố sau khi kỳ thi kết thúc".
  9. Frontend hiển thị màn hình thông báo kết quả tương ứng.

---

### 3.4. UC-SYS-01: Tự động nộp bài khi hết giờ (Auto-Submit Background Job)
- **Actor:** Laravel Scheduler / Queue Worker.
- **Tần suất chạy:** Mỗi 1 phút (`* * * * *`).
- **Luồng chính:**
  1. Scheduler kích hoạt command `php artisan exams:check-expired-attempts`.
  2. Lấy danh sách các `exam_attempts` thỏa mãn:
     - `status = 'IN_PROGRESS'`
     - `expires_at < NOW()`
  3. Với mỗi lượt thi quá hạn:
     - Đưa vào Queue Job `ProcessAutoSubmitExamAttemptJob` để xử lý song song, tránh nghẽn thread chính.
  4. Trong Worker Job:
     - Mở Transaction và khóa dòng `exam_attempts`.
     - Đổi trạng thái sang `AUTO_SUBMITTED`, gán `submitted_at = expires_at`.
     - Gọi `ExamGradingService` để chấm điểm dựa trên các câu trả lời gần nhất đã lưu.
     - Chuyển trạng thái sang `GRADED`.
     - Commit Transaction.
     - Ghi nhận vào `activity_logs`.
