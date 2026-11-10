# THIẾT KẾ CƠ SỞ DỮ LIỆU CHI TIẾT (DATABASE DESIGN)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. NGUYÊN TẮC THIẾT KẾ DATABASE

1. **Chuẩn hóa dữ liệu (3NF):** Đảm bảo không trùng lặp thông tin, trừ một số trường snapshot kết quả điểm số (`score`, `total_correct`, `total_incorrect`) để đảm bảo toàn vẹn lịch sử không bị ảnh hưởng khi ngân hàng câu hỏi thay đổi.
2. **Khóa ngoại & Ràng buộc toàn vẹn (Foreign Key Constraints):** Toàn bộ các mối quan hệ đều có khóa ngoại và hành vi `ON DELETE CASCADE` hoặc `ON DELETE RESTRICT` được cân nhắc kỹ lưỡng để tránh mồ côi dữ liệu (orphaned rows).
3. **Đánh chỉ mục (Indexing Strategy):**
   - Đánh index cho các cột tìm kiếm thường xuyên (`email`, `username`, `student_code`, `code`).
   - Đánh composite index cho các cặp tìm kiếm theo phạm vi: `(school_id, status)`, `(subject_id, difficulty_level)`, `(exam_id, class_id)`, `(exam_attempt_id, question_id)`.
   - Index cho các cột thời gian phục vụ Background Cron Job: `(status, expires_at)`.
4. **Soft Deletes:** Áp dụng `deleted_at` cho các bảng quan trọng (`users`, `questions`, `exams`, `classes`) để có thể khôi phục khi thao tác nhầm và duy trì lịch sử kiểm toán.
5. **Character Set & Collation:** Sử dụng `utf8mb4` và `utf8mb4_unicode_ci` hỗ trợ đầy đủ tiếng Việt có dấu, ký tự đặc biệt và biểu tượng toán học.

---

## 2. DANH SÁCH BẢNG & CHI TIẾT CÁC CỘT

### 2.1. Nhóm Xác thực & Phân quyền (Authentication & Authorization)

#### Bảng `users`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `school_id` | BIGINT UNSIGNED | NULLABLE, FK -> schools(id) | Thuộc trường học nào |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Tên đăng nhập |
| `email` | VARCHAR(191) | UNIQUE, NOT NULL | Địa chỉ email |
| `password` | VARCHAR(255) | NOT NULL | Mật khẩu đã hash (Bcrypt) |
| `full_name` | VARCHAR(100) | NOT NULL | Họ và tên đầy đủ |
| `role` | ENUM | NOT NULL, DEFAULT 'student' | Giá trị: `super_admin`, `teacher`, `student` |
| `code` | VARCHAR(50) | NULLABLE | Mã học sinh hoặc mã giáo viên |
| `phone` | VARCHAR(20) | NULLABLE | Số điện thoại |
| `avatar_url` | VARCHAR(255) | NULLABLE | Đường dẫn ảnh đại diện |
| `date_of_birth` | DATE | NULLABLE | Ngày sinh |
| `gender` | ENUM('male', 'female', 'other') | NULLABLE | Giới tính |
| `status` | ENUM('active', 'inactive', 'blocked') | DEFAULT 'active' | Trạng thái tài khoản |
| `remember_token` | VARCHAR(100) | NULLABLE | Token ghi nhớ đăng nhập |
| `created_at` | TIMESTAMP | NULLABLE | Thời điểm tạo |
| `updated_at` | TIMESTAMP | NULLABLE | Thời điểm cập nhật |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete |

*Indexes:*
- `INDEX idx_users_role_status (role, status)`
- `INDEX idx_users_school (school_id)`
- `INDEX idx_users_code (code)`

#### Bảng `login_histories`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `user_id` | BIGINT UNSIGNED | FK -> users(id) ON DELETE CASCADE | Người dùng đăng nhập |
| `ip_address` | VARCHAR(45) | NOT NULL | Địa chỉ IP (hỗ trợ IPv4 & IPv6) |
| `user_agent` | TEXT | NULLABLE | Chuỗi nhận diện trình duyệt & OS |
| `status` | ENUM('success', 'failed') | NOT NULL | Kết quả đăng nhập |
| `login_at` | TIMESTAMP | NOT NULL | Thời điểm đăng nhập |

---

### 2.2. Nhóm Quản trị Đào tạo (School & Academic)

#### Bảng `schools`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `name` | VARCHAR(255) | NOT NULL | Tên trường học |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã trường (VD: `THPT_CHU_VAN_AN`) |
| `email` | VARCHAR(100) | NULLABLE | Email liên hệ |
| `phone` | VARCHAR(20) | NULLABLE | Số điện thoại |
| `address` | TEXT | NULLABLE | Địa chỉ trường |
| `is_active` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `created_at` / `updated_at` | TIMESTAMP | | Timestamps |

#### Bảng `academic_years`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `school_id` | BIGINT UNSIGNED | FK -> schools(id) ON DELETE CASCADE | Trường học |
| `name` | VARCHAR(50) | NOT NULL | Tên năm học (VD: 2025-2026) |
| `start_date` | DATE | NOT NULL | Ngày bắt đầu |
| `end_date` | DATE | NOT NULL | Ngày kết thúc |
| `is_current` | BOOLEAN | DEFAULT FALSE | Năm học hiện tại |
| `created_at` / `updated_at` | TIMESTAMP | | Timestamps |

#### Bảng `grades`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `name` | VARCHAR(50) | NOT NULL | Khối lớp (Khối 10, Khối 11, Khối 12) |
| `level` | TINYINT | NOT NULL | Cấp số (10, 11, 12) |

#### Bảng `classes`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `school_id` | BIGINT UNSIGNED | FK -> schools(id) ON DELETE CASCADE | Trường học |
| `academic_year_id`| BIGINT UNSIGNED | FK -> academic_years(id) | Năm học |
| `grade_id` | BIGINT UNSIGNED | FK -> grades(id) | Khối lớp |
| `homeroom_teacher_id` | BIGINT UNSIGNED | NULLABLE, FK -> users(id) | Giáo viên chủ nhiệm |
| `name` | VARCHAR(100) | NOT NULL | Tên lớp (VD: 12A1) |
| `code` | VARCHAR(50) | NOT NULL | Mã lớp (VD: 12A1_2025) |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | | Timestamps & Soft delete |

*Indexes:*
- `UNIQUE KEY uq_class_code_year (code, academic_year_id)`

#### Bảng `class_students` (Học sinh trong lớp)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `class_id` | BIGINT UNSIGNED | FK -> classes(id) ON DELETE CASCADE | Lớp học |
| `student_id` | BIGINT UNSIGNED | FK -> users(id) ON DELETE CASCADE | Học sinh |
| `enrolled_at` | DATE | NOT NULL | Ngày gia nhập lớp |
| `status` | ENUM('active', 'transferred', 'dropped') | DEFAULT 'active' | Trạng thái học |

*Indexes:*
- `UNIQUE KEY uq_class_student (class_id, student_id)`

#### Bảng `teacher_classes` (Phân công giảng dạy)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `teacher_id` | BIGINT UNSIGNED | FK -> users(id) ON DELETE CASCADE | Giáo viên |
| `class_id` | BIGINT UNSIGNED | FK -> classes(id) ON DELETE CASCADE | Lớp học |
| `subject_id` | BIGINT UNSIGNED | FK -> subjects(id) ON DELETE CASCADE| Môn giảng dạy |

*Indexes:*
- `UNIQUE KEY uq_teacher_class_sub (teacher_id, class_id, subject_id)`

---

### 2.3. Nhóm Môn học & Chương trình (Subject & Curriculum)

#### Bảng `subjects`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `name` | VARCHAR(100) | NOT NULL | Tên môn (Toán, Vật lý, Tin học,...) |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã môn (MATH, PHYS, CS) |
| `description` | TEXT | NULLABLE | Mô tả môn học |

#### Bảng `chapters`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `subject_id` | BIGINT UNSIGNED | FK -> subjects(id) ON DELETE CASCADE | Thuộc môn |
| `grade_id` | BIGINT UNSIGNED | FK -> grades(id) | Thuộc khối |
| `name` | VARCHAR(255) | NOT NULL | Tên chương (Chương 1: Đạo hàm) |
| `order_index` | INT | DEFAULT 1 | Thứ tự hiển thị |

#### Bảng `lessons`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `chapter_id` | BIGINT UNSIGNED | FK -> chapters(id) ON DELETE CASCADE | Thuộc chương |
| `name` | VARCHAR(255) | NOT NULL | Tên bài học |
| `order_index` | INT | DEFAULT 1 | Thứ tự |

---

### 2.4. Nhóm Ngân hàng Câu hỏi (Question Bank)

#### Bảng `questions`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `creator_id` | BIGINT UNSIGNED | FK -> users(id) | Giáo viên tạo câu hỏi |
| `subject_id` | BIGINT UNSIGNED | FK -> subjects(id) | Môn học |
| `chapter_id` | BIGINT UNSIGNED | NULLABLE, FK -> chapters(id) | Chương học |
| `lesson_id` | BIGINT UNSIGNED | NULLABLE, FK -> lessons(id) | Bài học |
| `question_type`| ENUM | NOT NULL | `single_choice`, `multiple_choice`, `true_false`, `fill_in_blank`, `short_answer` |
| `difficulty_level` | TINYINT | NOT NULL, DEFAULT 1 | 1: Nhận biết, 2: Thông hiểu, 3: Vận dụng, 4: Vận dụng cao |
| `content` | LONGTEXT | NOT NULL | Nội dung câu hỏi (chứa LaTeX/HTML) |
| `explanation` | LONGTEXT | NULLABLE | Giải thích đáp án chi tiết |
| `default_points`| DECIMAL(5,2) | DEFAULT 1.00 | Điểm mặc định |
| `status` | ENUM('active', 'draft', 'archived') | DEFAULT 'active' | Trạng thái |
| `is_shared` | BOOLEAN | DEFAULT FALSE | Chia sẻ dùng chung trong trường |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | | Timestamps & Soft delete |

*Indexes:*
- `INDEX idx_questions_filter (subject_id, chapter_id, difficulty_level, question_type)`
- `INDEX idx_questions_creator (creator_id)`

#### Bảng `question_options` (Phương án trả lời)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `question_id` | BIGINT UNSIGNED | FK -> questions(id) ON DELETE CASCADE | Thuộc câu hỏi nào |
| `content` | TEXT | NOT NULL | Nội dung phương án (hỗ trợ LaTeX) |
| `is_correct` | BOOLEAN | NOT NULL, DEFAULT FALSE | Đáp án đúng hay sai |
| `order_index` | INT | DEFAULT 1 | Thứ tự phương án A, B, C, D |

*Indexes:*
- `INDEX idx_options_question (question_id, is_correct)`

---

### 2.5. Nhóm Quản lý Đề thi & Phòng thi (Exam Engine)

#### Bảng `exams`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `creator_id` | BIGINT UNSIGNED | FK -> users(id) | Giáo viên tạo đề |
| `subject_id` | BIGINT UNSIGNED | FK -> subjects(id) | Môn thi |
| `grade_id` | BIGINT UNSIGNED | FK -> grades(id) | Khối thi |
| `title` | VARCHAR(255) | NOT NULL | Tiêu đề đề thi (VD: Kiểm tra 1 tiết Toán) |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã đề thi |
| `description` | TEXT | NULLABLE | Hướng dẫn làm bài |
| `duration_minutes` | INT UNSIGNED | NOT NULL | Thời lượng làm bài (phút) |
| `total_points` | DECIMAL(5,2) | NOT NULL, DEFAULT 10.00 | Tổng điểm |
| `pass_points` | DECIMAL(5,2) | DEFAULT 5.00 | Điểm đạt |
| `shuffle_questions`| BOOLEAN | DEFAULT TRUE | Xáo trộn ngẫu nhiên thứ tự câu hỏi |
| `shuffle_options` | BOOLEAN | DEFAULT TRUE | Xáo trộn phương án trả lời |
| `status` | ENUM | DEFAULT 'draft' | `draft`, `published`, `closed`, `archived` |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | | Timestamps & Soft delete |

#### Bảng `exam_questions` (Liên kết Câu hỏi trong Đề thi)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `exam_id` | BIGINT UNSIGNED | FK -> exams(id) ON DELETE CASCADE | Đề thi |
| `question_id` | BIGINT UNSIGNED | FK -> questions(id) | Câu hỏi gốc |
| `order_index` | INT | NOT NULL, DEFAULT 1 | Thứ tự trong đề gốc |
| `points` | DECIMAL(5,2) | NOT NULL, DEFAULT 1.00 | Điểm cho câu này trong đề |

*Indexes:*
- `UNIQUE KEY uq_exam_question (exam_id, question_id)`

#### Bảng `exam_assignments` (Giao đề thi cho Lớp/Học sinh)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `exam_id` | BIGINT UNSIGNED | FK -> exams(id) ON DELETE CASCADE | Đề thi |
| `class_id` | BIGINT UNSIGNED | NULLABLE, FK -> classes(id) ON DELETE CASCADE | Giao cho lớp nào |
| `student_id` | BIGINT UNSIGNED | NULLABLE, FK -> users(id) ON DELETE CASCADE | Giao đích danh học sinh |
| `assigned_by` | BIGINT UNSIGNED | FK -> users(id) | Giáo viên thực hiện giao |
| `start_time` | DATETIME | NOT NULL | Thời điểm mở phòng thi |
| `end_time` | DATETIME | NOT NULL | Thời điểm đóng phòng thi |
| `max_attempts` | INT UNSIGNED | DEFAULT 1 | Số lần được phép thi |
| `view_score_type` | ENUM | DEFAULT 'immediately' | `immediately`, `after_closed`, `manual` |
| `show_solutions` | BOOLEAN | DEFAULT FALSE | Cho phép xem giải thích sau khi thi |
| `created_at` / `updated_at` | TIMESTAMP | | Timestamps |

*Indexes:*
- `INDEX idx_assignments_lookup (class_id, exam_id, start_time, end_time)`

#### Bảng `exam_attempts` (Lượt làm bài của học sinh)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `exam_assignment_id` | BIGINT UNSIGNED | FK -> exam_assignments(id) ON DELETE CASCADE | Kỳ thi được giao |
| `exam_id` | BIGINT UNSIGNED | FK -> exams(id) | Đề thi |
| `student_id` | BIGINT UNSIGNED | FK -> users(id) ON DELETE CASCADE | Thí sinh |
| `attempt_number` | INT UNSIGNED | NOT NULL, DEFAULT 1 | Lần thi thứ mấy |
| `question_order` | JSON | NULLABLE | Mảng ID câu hỏi đã xáo trộn cho lượt thi |
| `option_order` | JSON | NULLABLE | Map xáo trộn phương án cho từng câu |
| `started_at` | TIMESTAMP | NOT NULL | Server time khi bắt đầu |
| `expires_at` | TIMESTAMP | NOT NULL | Server time hết hạn tối đa |
| `submitted_at` | TIMESTAMP | NULLABLE | Server time khi nộp bài |
| `graded_at` | TIMESTAMP | NULLABLE | Server time khi chấm xong |
| `status` | ENUM | DEFAULT 'in_progress' | `not_started`, `in_progress`, `submitted`, `auto_submitted`, `graded`, `expired` |
| `score` | DECIMAL(5,2) | NULLABLE | Điểm số đạt được |
| `total_correct` | INT UNSIGNED | DEFAULT 0 | Số câu đúng |
| `total_incorrect`| INT UNSIGNED | DEFAULT 0 | Số câu sai |
| `total_unanswered`| INT UNSIGNED | DEFAULT 0 | Số câu chưa làm |
| `created_at` / `updated_at` | TIMESTAMP | | Timestamps |

*Indexes:*
- `INDEX idx_attempts_student (student_id, exam_id, status)`
- `INDEX idx_attempts_auto_submit (status, expires_at)`

#### Bảng `student_answers` (Câu trả lời chi tiết của học sinh)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `exam_attempt_id` | BIGINT UNSIGNED | FK -> exam_attempts(id) ON DELETE CASCADE | Thuộc lượt thi nào |
| `question_id` | BIGINT UNSIGNED | FK -> questions(id) | Câu hỏi |
| `selected_option_ids` | JSON | NULLABLE | Mảng ID phương án đã chọn |
| `text_answer` | TEXT | NULLABLE | Câu trả lời dạng chuỗi (điền từ) |
| `is_flagged` | BOOLEAN | DEFAULT FALSE | Đánh dấu câu cần xem lại |
| `is_correct` | BOOLEAN | NULLABLE | Kết quả sau khi chấm (True/False) |
| `earned_points` | DECIMAL(5,2) | DEFAULT 0.00 | Điểm đạt được cho câu này |
| `saved_at` | TIMESTAMP | NOT NULL | Thời điểm lưu câu trả lời |

*Indexes:*
- `UNIQUE KEY uq_attempt_question (exam_attempt_id, question_id)`

---

### 2.6. Nhóm Nhật ký & Cấu hình (System & Audit)

#### Bảng `activity_logs`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Khóa chính |
| `user_id` | BIGINT UNSIGNED | NULLABLE, FK -> users(id) ON DELETE SET NULL | Người thực hiện |
| `action` | VARCHAR(100) | NOT NULL | Hành động (VD: `EXAM_PUBLISHED`, `GRADE_OVERRIDDEN`) |
| `model_type` | VARCHAR(100) | NULLABLE | Tên Model tương tác |
| `model_id` | BIGINT UNSIGNED | NULLABLE | ID bản ghi |
| `payload` | JSON | NULLABLE | Dữ liệu chi tiết trước/sau thay đổi |
| `ip_address` | VARCHAR(45) | NULLABLE | IP người dùng |
| `created_at` | TIMESTAMP | NOT NULL | Thời điểm ghi log |

#### Bảng `system_settings`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `key` | VARCHAR(100) | PK | Khóa cấu hình (VD: `autosave_interval_seconds`) |
| `value` | TEXT | NOT NULL | Giá trị cấu hình |
| `description` | VARCHAR(255) | NULLABLE | Diễn giải |
