# YÊU CẦU NGHIỆP VỤ VÀ TÍNH NĂNG HỆ THỐNG THI TRẮC NGHIỆM TRỰC TUYẾN
## ONLINE EXAMINATION & LMS PLATFORM (E-LEARNING)

---

## 1. TỔNG QUAN HỆ THỐNG

Dự án **Online Examination Platform** là nền tảng thi trắc nghiệm trực tuyến toàn diện, phục vụ công tác dạy, học, kiểm tra đánh giá và quản lý chuyên môn trong các cơ sở giáo dục (từ cấp phổ thông K12 đến cao đẳng, đại học và trung tâm đào tạo).

Hệ thống hướng tới các mục tiêu:
- Tự động hóa quy trình tổ chức thi: từ khâu soạn câu hỏi, duyệt đề, tạo mã đề, phân bổ phòng thi đến chấm điểm và tổng hợp thống kê.
- Đảm bảo tính trung thực, bảo mật và công bằng: cơ chế chống gian lận nhiều lớp, tính giờ server-authoritative, xáo trộn câu hỏi và phương án, lưu vết hành vi.
- Tối ưu hóa trải nghiệm người dùng: giao diện mượt mà trên mọi thiết bị, phục hồi tức thì phiên làm bài khi mạng chập chờn, phản hồi tức thời.
- Sẵn sàng mở rộng AI: kiến trúc module hóa cho phép tích hợp AI trợ lý soạn thảo câu hỏi, phân loại ma trận độ khó Bloom, phân tích biểu đồ năng lực học sinh (Learning Analytics).

---

## 2. PHÂN TÍCH CÁC TÁC NHÂN (ACTORS)

| Tác nhân (Actor) | Mô tả vai trò | Phạm vi ảnh hưởng |
|---|---|---|
| **Super Admin (Quản trị viên hệ thống)** | Quản trị toàn bộ hạ tầng, cấu hình chung, quản lý trường học, năm học, khối lớp, phân quyền tài khoản, giám sát log bảo mật và thống kê toàn cục. | Toàn hệ thống (Global Scope). |
| **Teacher (Giáo viên / Giảng viên)** | Quản lý ngân hàng câu hỏi, tạo và trộn đề thi, quản lý lớp học được phân công, tổ chức kỳ thi, theo dõi học sinh làm bài thi trực tiếp (realtime monitoring), xem báo cáo điểm số. | Thuộc phạm vi trường học, môn học và các lớp học được phân công (Assigned Scope). |
| **Student (Học sinh / Thí sinh)** | Đăng nhập làm bài kiểm tra được giao, lưu trữ tự động tiến trình làm bài, nộp bài, xem kết quả và lời giải thích (theo cấu hình của giáo viên), theo dõi lịch sử và tiến độ học tập. | Thuộc phạm vi lớp học và tài khoản cá nhân (Personal/Enrolled Scope). |
| **Guest / Anonymous** | Người dùng chưa đăng nhập, chỉ có thể xem trang giới thiệu, đăng nhập hoặc yêu cầu hỗ trợ kỹ thuật. | Giới hạn tối thiểu. |

---

## 3. PHÂN TÍCH CHI TIẾT TỪNG MODULE CHỨC NĂNG

### 3.1. Module Xác thực và Phân quyền (Authentication & RBAC)
- **Đăng nhập đa kênh:** Hỗ trợ đăng nhập qua Username, Email hoặc Mã định danh (Mã học sinh / Mã giáo viên).
- **Cơ chế Token/Session:** Laravel Sanctum phát hành Bearer Token an toàn, tích hợp cơ chế thu hồi token khi đăng xuất hoặc đổi mật khẩu.
- **Phân quyền Role-Based Access Control (RBAC):** Super Admin, Teacher, Student. Mỗi vai trò đi kèm tập Permissions cụ thể kiểm soát thông qua Laravel Policies và Form Requests.
- **Quản lý mật khẩu:** Hash mật khẩu bằng Bcrypt/Argon2id, đổi mật khẩu, cơ chế admin reset mật khẩu tạm thời.
- **Theo dõi phiên:** Ghi nhận lịch sử đăng nhập (`login_histories`: IP, User Agent, Device, Timestamp, Status).

### 3.2. Module Quản trị Đào tạo (School & Academic Structure)
- **Cấu trúc trường học (Multi-School ready):** Bảng `schools` hỗ trợ mở rộng mô hình trường học nhiều cơ sở.
- **Năm học & Học kỳ:** Quản lý năm học (ví dụ: `2025-2026`), các học kỳ (`Học kỳ 1`, `Học kỳ 2`, `Học kỳ hè`).
- **Khối lớp & Lớp học:** Quản lý các khối 1-12, danh sách lớp học (Mã lớp, Tên lớp, Năm học, Niên khóa).
- **Phân công giảng dạy:** Gán giáo viên chủ nhiệm, phân công giáo viên bộ môn theo từng lớp học (`teacher_classes`).
- **Hồ sơ học sinh trong lớp:** Quản lý học sinh thuộc lớp (`class_students`), hỗ trợ chuyển lớp, bảo lưu, thôi học.

### 3.3. Module Quản lý Chuyên môn (Subject & Curriculum)
- **Môn học:** Mã môn, Tên môn (Toán, Vật lý, Hóa học, Ngữ văn, Tiếng Anh,...), Cấp học.
- **Chương học (Chapters):** Phân chia chương trình theo cây phân cấp logic (Môn học -> Chương).
- **Bài học (Lessons):** Chi tiết từng bài học trong chương, gán nhãn mục tiêu kiến thức.
- **Thẻ kiến thức (Tags / Topics):** Gắn thẻ ma trận kiến thức phục vụ việc trích xuất đề thi theo chuyên đề.

### 3.4. Module Ngân hàng Câu hỏi (Question Bank)
- **Định dạng câu hỏi hỗ trợ:**
  1. `SINGLE_CHOICE`: Trắc nghiệm 1 đáp án đúng (A, B, C, D).
  2. `MULTIPLE_CHOICE`: Trắc nghiệm nhiều đáp án đúng (chấm điểm thành phần hoặc điểm tuyệt đối).
  3. `TRUE_FALSE`: Đúng / Sai (từng mệnh đề hoặc tổng thể).
  4. `FILL_IN_BLANK`: Điền vào chỗ trống (so khớp từ khóa, regex, cho phép sai số số học).
  5. `SHORT_ANSWER`: Trả lời ngắn.
- **Ma trận độ khó (Bloom Taxonomy 4 cấp độ):**
  - Nhận biết (Recognition - 1)
  - Thông hiểu (Understanding - 2)
  - Vận dụng (Application - 3)
  - Vận dụng cao (Advanced Application - 4)
- **Nội dung đa phương tiện:** Hỗ trợ công thức Toán/Lý/Hóa qua LaTeX/KaTeX, hình ảnh minh họa đính kèm, định dạng HTML an toàn được làm sạch qua HTMLPurifier.
- **Import/Export:** Hỗ trợ nhập hàng loạt câu hỏi từ file Excel/CSV theo mẫu chuẩn hóa, xuất dữ liệu câu hỏi ra Excel.

### 3.5. Module Quản lý Đề thi (Exam Management)
- **Hình thức tạo đề:**
  - *Tạo đề thủ công:* Chọn trực tiếp từng câu hỏi trong ngân hàng theo bộ lọc.
  - *Tạo đề tự động (Ma trận đề):* Cấu hình số lượng câu hỏi theo Môn học, Chương, và tỷ lệ độ khó (VD: 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao).
- **Cấu hình đề thi:**
  - Thời lượng làm bài (phút).
  - Điểm tổng và thang điểm quy đổi (thang 10, thang 100).
  - Điểm số mặc định cho từng câu hoặc cấu hình riêng theo câu.
  - Cơ chế xáo trộn: Xáo trộn ngẫu nhiên thứ tự câu hỏi (`shuffle_questions`), xáo trộn ngẫu nhiên các phương án trả lời (`shuffle_options`).
  - Tạo mã đề thi con (Variant exam codes): Đề gốc sinh ra các mã đề 101, 102, 103, 104 có hoán vị câu hỏi/đáp án tương ứng.
  - Trạng thái đề: `DRAFT` (Bản nháp), `PUBLISHED` (Đã xuất bản), `CLOSED` (Đã đóng/Lưu trữ).

### 3.6. Module Tổ chức Kỳ thi & Giao bài (Exam Assignment)
- **Đối tượng giao đề:**
  - Giao cho một hoặc nhiều Lớp học (`class_ids`).
  - Giao đích danh từng Học sinh (`student_ids`) - phục vụ thi bù, thi học sinh giỏi, bồi dưỡng.
- **Ràng buộc thời gian:**
  - Thời điểm mở đề (`start_time`): Trước thời điểm này học sinh không được phép vào làm.
  - Thời điểm đóng đề (`end_time`): Sau thời điểm này hệ thống khóa toàn bộ bài thi.
  - Thời lượng làm bài (`duration_minutes`): Bộ đếm thời gian thực tính từ lúc bắt đầu làm bài.
- **Chính sách thi:**
  - Số lần thi tối đa (`max_attempts`): 1 lần hoặc nhiều lần.
  - Xem kết quả: Không cho xem, xem điểm ngay sau khi nộp, hoặc chỉ xem điểm sau khi kỳ thi kết thúc.
  - Xem đáp án & lời giải: Chỉ cho phép khi kỳ thi đã đóng (`show_solutions_after_end`).

### 3.7. Module Phòng thi Trực tuyến & Chấm điểm (Online Examination Engine)
- **Đảm bảo Server-Authoritative:**
  - Khi học sinh bấm "Bắt đầu làm bài", backend khởi tạo bản ghi `exam_attempts` ghi nhận `started_at` chuẩn từ server clock.
  - Thời hạn tối đa `expires_at = started_at + duration_minutes`. Không phụ thuộc vào đồng hồ máy client.
  - Không bao giờ trả thuộc tính `is_correct` hay `explanation` trong API lấy đề thi làm bài.
- **Tự động lưu bài (Autosave & Resume):**
  - Frontend tự động đồng bộ câu trả lời định kỳ (mỗi 15-30 giây) hoặc ngay khi học sinh chọn đáp án qua API `POST /attempts/{id}/answers`.
  - Hỗ trợ khôi phục trạng thái làm bài nguyên vẹn khi mất kết nối mạng, tải lại trang (F5) hoặc đổi máy tính.
- **Nộp bài & Tự động nộp bài:**
  - Học sinh chủ động bấm "Nộp bài" với hộp thoại xác nhận số câu đã làm / chưa làm.
  - Cron Scheduler và Worker backend tự động quét các lượt thi vượt quá `expires_at` để chuyển trạng thái sang `AUTO_SUBMITTED` và kích hoạt chấm điểm.
- **Động cơ chấm điểm tự động (Grading Engine):**
  - Chấm điểm chuẩn xác theo loại câu hỏi:
    - `SINGLE_CHOICE`: 100% điểm nếu chọn đúng phương án, 0 điểm nếu sai.
    - `TRUE_FALSE`: Tính điểm theo từng mệnh đề đúng/sai.
    - `MULTIPLE_CHOICE`: Tính điểm theo công thức trừ điểm nếu chọn sai hoặc điểm tỷ lệ.
    - `FILL_IN_BLANK`: Chuẩn hóa chuỗi (trim, lowercase, loại bỏ khoảng trắng thừa) và so khớp danh sách đáp án chấp nhận.
  - Ghi nhận `score`, `total_correct`, `total_incorrect`, `total_unanswered` và `graded_at`.

### 3.8. Module Báo cáo, Thống kê & Phân tích (Analytics & Reports)
- **Dành cho Super Admin:**
  - Thống kê tổng quan: Số lượng người dùng, trường, lớp, tổng số đề thi và lượt làm bài.
  - Thống kê tỷ lệ phân phối điểm theo môn học và khối lớp.
- **Dành cho Teacher:**
  - Phổ điểm bài thi: Biểu đồ cột phân bố điểm (0-4, 4-6.5, 6.5-8, 8-10), điểm cao nhất, thấp nhất, điểm trung bình.
  - Phân tích câu hỏi khó (Item Analysis): Tỷ lệ làm đúng/sai từng câu hỏi giúp giáo viên nắm được phần kiến thức học sinh còn hổng để bồi dưỡng.
  - Xuất báo cáo điểm lớp học ra định dạng Excel/PDF.
- **Dành cho Student:**
  - Biểu đồ theo dõi tiến độ điểm số qua các kỳ thi theo từng môn học.
  - Bảng tổng hợp lịch sử các lần thi, thời gian làm bài và xếp hạng lớp (nếu được bật).

---

## 4. BẢO MẬT VÀ TOÀN VẸN DỮ LIỆU (SECURITY & COMPLIANCE)

1. **Kiểm soát truy cập ngang hàng (Horizontal Privilege Escalation Prevention):**
   - Học sinh chỉ xem và làm bài của chính mình (`student_id == auth()->id()`).
   - Giáo viên chỉ sửa đề và xem điểm của các lớp/môn mà mình được phân công.
2. **Kiểm soát thời gian chặt chẽ (Anti-Time Tampering):**
   - Mọi mốc thời gian tính toán nộp bài đều căn cứ vào `now()` trên Database/Server.
3. **Chống Race Condition & Double Submit:**
   - Sử dụng `DB::transaction()` kèm Pessimistic Locking (`lockForUpdate()`) hoặc Atomic Status Updates (`where status = 'IN_PROGRESS'`) khi nộp bài để ngăn việc submit 2 lần cùng lúc gây sai lệch kết quả.
4. **An toàn dữ liệu nhạy cảm (Data Leak Prevention):**
   - Resource trả về lúc làm bài tuyệt đối lược bỏ các trường `is_correct`, `correct_answer`, `explanation`.
5. **Ghi nhật ký kiểm toán (Audit Logging):**
   - Ghi lại các thao tác sửa xóa đề, phân công lớp, sửa điểm (nếu có phúc khảo) vào bảng `activity_logs`.
