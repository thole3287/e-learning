# QUY TẮC NGHIỆP VỤ HỆ THỐNG (BUSINESS RULES)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. QUY TẮC VỀ TÀI KHOẢN VÀ PHÂN QUYỀN (ACCOUNT & RBAC RULES)

- **BR-ACC-01 (Tính duy nhất tài khoản):** Mỗi người dùng phải có `email` và `username` là duy nhất trên toàn hệ thống. Học sinh có thể có thêm `student_code` duy nhất theo trường học.
- **BR-ACC-02 (Phân quyền đa cấp):** Hệ thống triển khai 3 vai trò chính:
  1. `super_admin`: Toàn quyền thao tác trên mọi dữ liệu và cấu hình hệ thống.
  2. `teacher`: Quản lý ngân hàng câu hỏi, tạo đề, giao đề và xem kết quả của các lớp/môn được phân công. Không được chỉnh sửa đề thi của giáo viên khác trừ khi được cấp quyền chia sẻ chung (`is_shared = true`).
  3. `student`: Chỉ được xem và làm bài thi được giao cho lớp mình đang theo học hoặc giao đích danh cho cá nhân; chỉ được xem kết quả bài làm của chính mình.
- **BR-ACC-03 (Bảo vệ tính toàn vẹn tài khoản):** Khi tài khoản bị vô hiệu hóa (`status = 'INACTIVE'` hoặc `is_blocked = true`), mọi phiên làm việc (Tokens) bị hủy ngay lập tức và người dùng không thể thực hiện bất kỳ thao tác nào.
- **BR-ACC-04 (Học sinh chuyển lớp):** Khi học sinh chuyển từ Lớp A sang Lớp B, các kết quả bài thi đã hoàn thành ở Lớp A vẫn được bảo lưu trong lịch sử học tập.

---

## 2. QUY TẮC QUẢN LÝ CÂU HỎI & NGÂN HÀNG ĐỀ (QUESTION BANK RULES)

- **BR-QB-01 (Định danh và phân loại câu hỏi):** Mỗi câu hỏi bắt buộc phải thuộc về 1 Môn học (`subject_id`), 1 Mức độ nhận thức (`difficulty_level`: 1 - Nhận biết, 2 - Thông hiểu, 3 - Vận dụng, 4 - Vận dụng cao) và 1 Dạng câu hỏi (`question_type`).
- **BR-QB-02 (Ràng buộc phương án theo dạng câu hỏi):**
  - `SINGLE_CHOICE`: Tối thiểu 2 phương án; bắt buộc có đúng 1 phương án có `is_correct = true`.
  - `MULTIPLE_CHOICE`: Tối thiểu 3 phương án; bắt buộc có ít nhất 2 phương án có `is_correct = true`.
  - `TRUE_FALSE`: Bắt buộc có 2 phương án (Đúng / Sai) với 1 phương án `is_correct = true`.
  - `FILL_IN_BLANK`: Tối thiểu 1 đáp án mẫu được chấp nhận.
  - `SHORT_ANSWER`: Có hướng dẫn chấm hoặc từ khóa chuẩn.
- **BR-QB-03 (Toàn vẹn đề thi đã xuất bản):** Nếu một câu hỏi đã nằm trong một Đề thi đã xuất bản (`PUBLISHED`) hoặc đang có học sinh làm bài, câu hỏi đó KHÔNG ĐƯỢC XÓA cứng (Hard Delete). Hệ thống áp dụng Soft Delete hoặc nhân bản bản sao (Snapshot) lúc đưa vào đề thi.

---

## 3. QUY TẮC VÒNG ĐỜI VÀ CẤU HÌNH ĐỀ THI (EXAM LIFECYCLE RULES)

### 3.1. Máy trạng thái đề thi (Exam State Machine)
```
[DRAFT] ---> [PUBLISHED] ---> [IN_PROGRESS] ---> [CLOSED]
   |             |
   v             v
[ARCHIVED]   [ARCHIVED]
```

- **DRAFT:** Giáo viên đang biên soạn câu hỏi, cấu hình điểm. Học sinh không thấy đề thi này.
- **PUBLISHED:** Đề thi đã hoàn tất biên tập và được gán lịch thi cho lớp. Học sinh thấy lịch thi nhưng chưa thể làm bài nếu chưa tới `start_time`.
- **IN_PROGRESS:** Đang trong khoảng thời gian diễn ra kỳ thi (`start_time <= now() <= end_time`).
- **CLOSED:** Kỳ thi kết thúc. Không nhận thêm bất kỳ lượt thi mới nào. Kích hoạt tính năng xem đáp án và giải thích chi tiết (nếu có cấu hình).
- **ARCHIVED:** Lưu trữ hồ sơ, không hiển thị trong danh sách mặc định.

- **BR-EXM-01 (Nguyên tắc bất biến khi đã có lượt thi):** Khi đề thi đã có ít nhất 1 học sinh bắt đầu làm bài (`exam_attempts.count > 0`), giáo viên KHÔNG ĐƯỢC PHÉP thay đổi cấu trúc đề (thêm/bớt câu hỏi, đổi đáp án đúng, đổi thời lượng làm bài).

---

## 4. QUY TẮC PHÒNG THI & LƯỢT THI (EXAM ATTEMPT RULES) - CỐT LÕI

### 4.1. Máy trạng thái lượt thi (Attempt State Machine)
```
              +-------------------------------------+
              |                                     | (Server Timer Expired)
              v                                     |
[NOT_STARTED] ---> [IN_PROGRESS] ---> [SUBMITTED] -------> [GRADED]
                          |                         |
                          | (Hết giờ/Timeout)       v
                          +-----------------> [AUTO_SUBMITTED]
```

- **BR-ATT-01 (Khởi tạo lượt thi Server-Authoritative):**
  - Thời điểm bắt đầu `started_at` được gán bằng `NOW()` trên Server/DB, tuyệt đối không nhận từ Client.
  - Hạn chót hoàn thành bài thi `expires_at` được tính bằng:
    $$\text{expires\_at} = \min(\text{started\_at} + \text{duration\_minutes}, \text{exam\_assignment.end\_time})$$
    *(Nếu thời gian còn lại của kỳ thi ngắn hơn thời lượng làm bài, thời gian làm bài bị giới hạn bởi thời điểm đóng đề).*
- **BR-ATT-02 (Giới hạn số lần thi):** Học sinh chỉ được bắt đầu lượt thi mới nếu số lượt thi đã hoàn thành (`status` in `['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED']`) nhỏ hơn `max_attempts` của kỳ thi.
- **BR-ATT-03 (Đơn nhất phiên làm bài):** Mỗi học sinh chỉ được có duy nhất 1 lượt thi ở trạng thái `IN_PROGRESS` tại một thời điểm cho một bài thi. Không cho phép mở 2 tab làm song song 2 lượt thi cùng đề.
- **BR-ATT-04 (Tự động lưu câu trả lời - Autosave):**
  - Mỗi khi học sinh chọn hoặc thay đổi câu trả lời, frontend gửi payload `{question_id, selected_option_ids, text_answer}` đến backend.
  - Backend cập nhật bản ghi `student_answers` qua `UPSERT` (Insert on duplicate key update) gắn với `exam_attempt_id`.
  - Nếu học sinh F5 hoặc rớt mạng, khi vào lại màn hình làm bài, hệ thống tải lại toàn bộ trạng thái trả lời đã lưu.
- **BR-ATT-05 (Kiểm soát nộp bài & Tránh Race Condition):**
  - Thao tác nộp bài (`POST /attempts/{id}/submit`) bắt buộc chạy trong Database Transaction kèm khóa bi quan (`lockForUpdate()`) trên bản ghi `exam_attempts`.
  - Điều kiện nộp hợp lệ: `status == 'IN_PROGRESS'`. Nếu bản ghi đã có `status != 'IN_PROGRESS'`, yêu cầu bị từ chối ngay lập tức (tránh trường hợp double-click hoặc nộp bài 2 lần).
  - Ngay sau khi nộp, chuyển trạng thái sang `SUBMITTED`, tính `submitted_at = NOW()`, và kích hoạt Service chấm điểm.

---

## 5. QUY TẮC CHẤM ĐIỂM TỰ ĐỘNG (GRADING ALGORITHM RULES)

- **BR-GRD-01 (Công thức tính điểm từng câu):**
  - **SINGLE_CHOICE / TRUE_FALSE:**
    - Đúng 100%: Điểm câu hỏi = `points_per_question`.
    - Sai hoặc Chưa trả lời: 0 điểm.
  - **MULTIPLE_CHOICE:**
    - Cấu hình 1 (Tất cả hoặc không có gì - All or Nothing): Phải chọn đúng toàn bộ các đáp án đúng và không chọn đáp án sai nào thì mới được điểm tối đa, ngược lại 0 điểm.
    - Cấu hình 2 (Điểm thành phần - Partial Scoring):
      $$\text{Điểm} = \max\left(0, \frac{\text{Số đáp án đúng đã chọn}}{\text{Tổng số đáp án đúng}} - \frac{\text{Số đáp án sai đã chọn}}{\text{Tổng số đáp án sai}}\right) \times \text{Điểm câu hỏi}$$
  - **FILL_IN_BLANK:**
    - So sánh chuỗi đã qua xử lý (`trim()`, loại bỏ dấu cách thừa, chuyển về chữ thường nếu không phân biệt hoa thường). Nếu khớp với một trong các chuỗi được chấp nhận -> Điểm tối đa.
- **BR-GRD-02 (Tính tổng điểm bài thi):**
  - Tổng điểm đạt được:
    $$\text{Total Score} = \sum_{i=1}^{N} \text{Điểm câu } i$$
  - Điểm quy đổi thang điểm chuẩn (VD: thang điểm 10):
    $$\text{Final Grade} = \left(\frac{\text{Total Score}}{\text{Max Possible Score}}\right) \times 10$$
  - Làm tròn đến 2 chữ số thập phân (`round(final_grade, 2)`).
- **BR-GRD-03 (Bất biến điểm số):** Sau khi hoàn thành chấm điểm, bản ghi `exam_attempts` lưu trữ snapshot điểm số (`score`, `total_correct`, `total_incorrect`, `total_unanswered`, `graded_at`). Mọi thay đổi về sau trong ngân hàng câu hỏi KHÔNG làm thay đổi kết quả các lượt thi đã nộp.

---

## 6. QUY TẮC XEM KẾT QUẢ VÀ ĐÁP ÁN (REVIEW & RESULT VISIBILITY RULES)

- **BR-RES-01 (Thời điểm xem điểm):**
  - Nếu `view_score_type = 'IMMEDIATELY'`: Học sinh thấy điểm số ngay khi nộp bài.
  - Nếu `view_score_type = 'AFTER_CLOSED'`: Học sinh chỉ thấy trạng thái "Đã nộp bài", điểm số chỉ hiển thị sau khi `exam_assignment.end_time <= NOW()`.
  - Nếu `view_score_type = 'MANUAL'`: Chỉ hiển thị khi giáo viên bấm nút "Công bố kết quả".
- **BR-RES-02 (Bảo mật đáp án & giải thích):**
  - Tuyệt đối không trả về `correct_option` hoặc `explanation` trong API làm bài hoặc API nộp bài nếu kỳ thi chưa kết thúc.
  - Chỉ trả về đáp án và lời giải chi tiết khi và chỉ khi:
    $$\text{exam\_assignment.show\_solutions} = \text{true} \quad \text{VÀ} \quad \text{exam\_assignment.end\_time} \le \text{NOW()}$$

---

## 7. QUY TẮC HOẠT ĐỘNG NỀN & BẢO VỆ HỆ THỐNG (SYSTEM JOBS & PROTECTION RULES)

- **BR-SYS-01 (Xử lý quá hạn tự động - Auto-Submit Cron Job):**
  - Mỗi 1 phút, Scheduler quét các `exam_attempts` có `status = 'IN_PROGRESS'` và `expires_at < NOW() - INTERVAL 1 MINUTE` (cho phép độ trễ mạng 1 phút).
  - Tự động chuyển trạng thái sang `AUTO_SUBMITTED`, tính điểm dựa trên câu trả lời gần nhất đã lưu trong `student_answers`.
- **BR-SYS-02 (Rate Limiting bảo vệ API thi):**
  - API lưu câu trả lời `POST /attempts/{id}/answers` áp dụng rate-limit tối đa 60 requests/phút trên mỗi token để chống spam hoặc script tự động.
- **BR-SYS-03 (Audit Log bắt buộc):**
  - Bắt buộc ghi lại Log khi: Đăng nhập thất bại quá 5 lần, Xuất bản đề thi, Gia hạn thời gian thi cho học sinh, Chỉnh sửa điểm số sau phúc khảo.
