# SƠ ĐỒ THỰC THỂ QUAN HỆ (ENTITY RELATIONSHIP DIAGRAM - ERD)
## ONLINE EXAMINATION & LMS PLATFORM

---

## 1. SƠ ĐỒ MERMAID ERD

```mermaid
erDiagram
    SCHOOLS ||--o{ USERS : "contains"
    SCHOOLS ||--o{ ACADEMIC_YEARS : "has"
    SCHOOLS ||--o{ CLASSES : "manages"

    ACADEMIC_YEARS ||--o{ CLASSES : "schedules"
    GRADES ||--o{ CLASSES : "categorizes"
    GRADES ||--o{ CHAPTERS : "applies_to"
    
    USERS ||--o{ CLASSES : "homeroom_teachers"
    USERS ||--o{ CLASS_STUDENTS : "enrolled_as_student"
    CLASSES ||--o{ CLASS_STUDENTS : "has_students"
    
    USERS ||--o{ TEACHER_CLASSES : "assigned_teacher"
    CLASSES ||--o{ TEACHER_CLASSES : "taught_classes"
    SUBJECTS ||--o{ TEACHER_CLASSES : "course_subject"

    SUBJECTS ||--o{ CHAPTERS : "divided_into"
    CHAPTERS ||--o{ LESSONS : "composed_of"
    
    USERS ||--o{ QUESTIONS : "creates"
    SUBJECTS ||--o{ QUESTIONS : "belongs_to_subject"
    CHAPTERS ||--o{ QUESTIONS : "optional_chapter"
    LESSONS ||--o{ QUESTIONS : "optional_lesson"
    QUESTIONS ||--o{ QUESTION_OPTIONS : "has_options"

    USERS ||--o{ EXAMS : "creates"
    SUBJECTS ||--o{ EXAMS : "exam_subject"
    GRADES ||--o{ EXAMS : "exam_grade"
    EXAMS ||--o{ EXAM_QUESTIONS : "includes_questions"
    QUESTIONS ||--o{ EXAM_QUESTIONS : "included_in_exams"

    EXAMS ||--o{ EXAM_ASSIGNMENTS : "assigned_via"
    CLASSES ||--o{ EXAM_ASSIGNMENTS : "assigned_to_class"
    USERS ||--o{ EXAM_ASSIGNMENTS : "assigned_to_student"
    USERS ||--o{ EXAM_ASSIGNMENTS : "assigned_by_teacher"

    EXAM_ASSIGNMENTS ||--o{ EXAM_ATTEMPTS : "has_attempts"
    USERS ||--o{ EXAM_ATTEMPTS : "student_takes_attempt"
    EXAM_ATTEMPTS ||--o{ STUDENT_ANSWERS : "records_answers"
    QUESTIONS ||--o{ STUDENT_ANSWERS : "answered_for_question"

    USERS ||--o{ LOGIN_HISTORIES : "tracks_logins"
    USERS ||--o{ ACTIVITY_LOGS : "logs_actions"

    SCHOOLS {
        bigint id PK
        string name
        string code UK
        string email
        string phone
        text address
        boolean is_active
    }

    USERS {
        bigint id PK
        bigint school_id FK
        string username UK
        string email UK
        string password
        string full_name
        enum role
        string code
        enum status
    }

    ACADEMIC_YEARS {
        bigint id PK
        bigint school_id FK
        string name
        date start_date
        date end_date
        boolean is_current
    }

    GRADES {
        bigint id PK
        string name
        tinyint level
    }

    CLASSES {
        bigint id PK
        bigint school_id FK
        bigint academic_year_id FK
        bigint grade_id FK
        bigint homeroom_teacher_id FK
        string name
        string code
    }

    CLASS_STUDENTS {
        bigint id PK
        bigint class_id FK
        bigint student_id FK
        date enrolled_at
        enum status
    }

    TEACHER_CLASSES {
        bigint id PK
        bigint teacher_id FK
        bigint class_id FK
        bigint subject_id FK
    }

    SUBJECTS {
        bigint id PK
        string name
        string code UK
        text description
    }

    CHAPTERS {
        bigint id PK
        bigint subject_id FK
        bigint grade_id FK
        string name
        int order_index
    }

    LESSONS {
        bigint id PK
        bigint chapter_id FK
        string name
        int order_index
    }

    QUESTIONS {
        bigint id PK
        bigint creator_id FK
        bigint subject_id FK
        bigint chapter_id FK
        bigint lesson_id FK
        enum question_type
        tinyint difficulty_level
        longtext content
        longtext explanation
        decimal default_points
        boolean is_shared
        enum status
    }

    QUESTION_OPTIONS {
        bigint id PK
        bigint question_id FK
        text content
        boolean is_correct
        int order_index
    }

    EXAMS {
        bigint id PK
        bigint creator_id FK
        bigint subject_id FK
        bigint grade_id FK
        string title
        string code UK
        int duration_minutes
        decimal total_points
        boolean shuffle_questions
        boolean shuffle_options
        enum status
    }

    EXAM_QUESTIONS {
        bigint id PK
        bigint exam_id FK
        bigint question_id FK
        int order_index
        decimal points
    }

    EXAM_ASSIGNMENTS {
        bigint id PK
        bigint exam_id FK
        bigint class_id FK
        bigint student_id FK
        bigint assigned_by FK
        datetime start_time
        datetime end_time
        int max_attempts
        enum view_score_type
        boolean show_solutions
    }

    EXAM_ATTEMPTS {
        bigint id PK
        bigint exam_assignment_id FK
        bigint exam_id FK
        bigint student_id FK
        int attempt_number
        json question_order
        json option_order
        timestamp started_at
        timestamp expires_at
        timestamp submitted_at
        timestamp graded_at
        enum status
        decimal score
        int total_correct
        int total_incorrect
        int total_unanswered
    }

    STUDENT_ANSWERS {
        bigint id PK
        bigint exam_attempt_id FK
        bigint question_id FK
        json selected_option_ids
        text text_answer
        boolean is_flagged
        boolean is_correct
        decimal earned_points
        timestamp saved_at
    }

    LOGIN_HISTORIES {
        bigint id PK
        bigint user_id FK
        string ip_address
        text user_agent
        enum status
        timestamp login_at
    }

    ACTIVITY_LOGS {
        bigint id PK
        bigint user_id FK
        string action
        string model_type
        bigint model_id
        json payload
        timestamp created_at
    }
```

---

## 2. GIẢI THÍCH CÁC MỐI QUAN HỆ CỐT LÕI

1. **Khối - Lớp - Học sinh (School Hierarchy):**
   - Một trường học (`schools`) có nhiều năm học (`academic_years`) và nhiều lớp học (`classes`).
   - Quan hệ `class_students` phân tách rõ ràng việc học sinh gia nhập lớp, cho phép theo dõi lịch sử chuyển lớp mà không làm mất liên kết kết quả thi trong quá khứ.
2. **Cây kiến thức môn học (Subject Knowledge Tree):**
   - `subjects` (1) ---> (N) `chapters` (1) ---> (N) `lessons`.
   - Giúp giáo viên phân loại câu hỏi chi tiết tới từng bài học, hỗ trợ thuật toán trích xuất đề thi theo ma trận phân bổ kiến thức chính xác.
3. **Mối quan hệ Ngân hàng Câu hỏi - Đề thi (Question Bank to Exam):**
   - Đề thi (`exams`) liên kết với Câu hỏi (`questions`) thông qua bảng trung gian `exam_questions`.
   - Bảng `exam_questions` lưu trữ `order_index` (thứ tự trong đề gốc) và `points` (điểm số riêng biệt của câu hỏi trong đề thi này), cho phép một câu hỏi được tái sử dụng ở nhiều đề với thang điểm khác nhau.
4. **Mối quan hệ Đề thi - Giao bài - Lượt thi (Exam - Assignment - Attempt):**
   - Một đề thi có thể được giao nhiều lần cho nhiều lớp khác nhau (`exam_assignments`).
   - Mỗi lần giao có khung giờ thi (`start_time`, `end_time`) và chính sách riêng (`max_attempts`, `view_score_type`, `show_solutions`).
   - Khi học sinh làm bài, một bản ghi `exam_attempts` được tạo ra gắn với `exam_assignments` tương ứng.
5. **Cơ chế Snapshot thứ tự ngẫu nhiên (Shuffling Snapshot):**
   - Cột `question_order` và `option_order` (kiểu JSON) trong `exam_attempts` lưu lại chính xác thứ tự câu hỏi và phương án mà thí sinh nhìn thấy.
   - Nhờ vậy, ngay cả khi làm mới trang hoặc giáo viên xem lại bài thi của học sinh, thứ tự hiển thị vẫn nhất quán 100% với lúc làm bài.
6. **Lưu vết câu trả lời độc lập (Answer Persistence):**
   - Mỗi câu trả lời của thí sinh được lưu vào một dòng trong bảng `student_answers` với khóa duy nhất `uq_attempt_question (exam_attempt_id, question_id)`.
   - Thiết kế này tối ưu cho thao tác `UPSERT` tần suất cao khi học sinh click đổi đáp án liên tục trong quá trình làm bài.
