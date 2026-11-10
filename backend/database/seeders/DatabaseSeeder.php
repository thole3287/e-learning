<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Chapter;
use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamQuestion;
use App\Models\Grade;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeacherClass;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Trường học
        $school = School::create([
            'name' => 'Trường THPT Chuyên Chu Văn An',
            'code' => 'THPT_CVA',
            'email' => 'contact@cva.edu.vn',
            'phone' => '02438234567',
            'address' => 'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
            'is_active' => true,
        ]);

        // 2. Năm học
        $academicYear = AcademicYear::create([
            'school_id' => $school->id,
            'name' => '2025 - 2026',
            'start_date' => '2025-09-05',
            'end_date' => '2026-05-31',
            'is_current' => true,
        ]);

        // 3. Khối lớp
        $grade10 = Grade::create(['name' => 'Khối 10', 'level' => 10]);
        $grade11 = Grade::create(['name' => 'Khối 11', 'level' => 11]);
        $grade12 = Grade::create(['name' => 'Khối 12', 'level' => 12]);

        // 4. Người dùng: Super Admin
        $admin = User::create([
            'school_id' => $school->id,
            'username' => 'admin',
            'email' => 'admin@elearning.vn',
            'password' => 'Admin@123456',
            'full_name' => 'Quản trị viên Hệ thống',
            'role' => 'super_admin',
            'code' => 'ADMIN01',
            'status' => 'active',
        ]);

        // 5. Người dùng: Giáo viên
        $teacherMath = User::create([
            'school_id' => $school->id,
            'username' => 'teacher_math',
            'email' => 'teacher.math@elearning.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Thầy Nguyễn Văn Toán',
            'role' => 'teacher',
            'code' => 'GV_TOAN',
            'phone' => '0912345678',
            'status' => 'active',
        ]);

        $teacherPhys = User::create([
            'school_id' => $school->id,
            'username' => 'teacher_phys',
            'email' => 'teacher.physics@elearning.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Cô Trần Thị Lý',
            'role' => 'teacher',
            'code' => 'GV_LY',
            'phone' => '0923456789',
            'status' => 'active',
        ]);

        $teacherEng = User::create([
            'school_id' => $school->id,
            'username' => 'teacher_eng',
            'email' => 'teacher.english@elearning.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Cô Lê Mai Anh',
            'role' => 'teacher',
            'code' => 'GV_ANH',
            'phone' => '0934567890',
            'status' => 'active',
        ]);

        // 6. Lớp học
        $class12A1 = SchoolClass::create([
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'grade_id' => $grade12->id,
            'homeroom_teacher_id' => $teacherMath->id,
            'name' => '12A1',
            'code' => '12A1_2025',
        ]);

        $class12A2 = SchoolClass::create([
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'grade_id' => $grade12->id,
            'homeroom_teacher_id' => $teacherPhys->id,
            'name' => '12A2',
            'code' => '12A2_2025',
        ]);

        // 7. Học sinh mẫu
        $students = [];
        for ($i = 1; $i <= 10; $i++) {
            $student = User::create([
                'school_id' => $school->id,
                'username' => 'student' . $i,
                'email' => "student{$i}@elearning.vn",
                'password' => 'Student@123456',
                'full_name' => "Học sinh Nguyễn Văn {$i}",
                'role' => 'student',
                'code' => 'HS2026' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'gender' => $i % 2 === 0 ? 'female' : 'male',
                'status' => 'active',
            ]);
            $students[] = $student;

            // 5 học sinh đầu vào lớp 12A1, 5 học sinh sau vào 12A2
            $assignedClass = ($i <= 5) ? $class12A1 : $class12A2;
            $assignedClass->students()->attach($student->id, [
                'enrolled_at' => '2025-09-05',
                'status' => 'active',
            ]);
        }

        // 8. Môn học & Phân công giáo viên
        $subMath = Subject::create([
            'name' => 'Toán học',
            'code' => 'MATH',
            'description' => 'Môn Toán học Trung học Phổ thông',
        ]);

        $subPhys = Subject::create([
            'name' => 'Vật lý',
            'code' => 'PHYS',
            'description' => 'Môn Vật lý Trung học Phổ thông',
        ]);

        TeacherClass::create(['teacher_id' => $teacherMath->id, 'class_id' => $class12A1->id, 'subject_id' => $subMath->id]);
        TeacherClass::create(['teacher_id' => $teacherMath->id, 'class_id' => $class12A2->id, 'subject_id' => $subMath->id]);
        TeacherClass::create(['teacher_id' => $teacherPhys->id, 'class_id' => $class12A1->id, 'subject_id' => $subPhys->id]);

        // 9. Cây chương trình kiến thức Toán 12
        $chap1 = Chapter::create([
            'subject_id' => $subMath->id,
            'grade_id' => $grade12->id,
            'name' => 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
            'order_index' => 1,
        ]);

        $lesson1 = Lesson::create([
            'chapter_id' => $chap1->id,
            'name' => 'Bài 1: Tính đơn điệu của hàm số',
            'order_index' => 1,
        ]);

        $lesson2 = Lesson::create([
            'chapter_id' => $chap1->id,
            'name' => 'Bài 2: Cực trị của hàm số',
            'order_index' => 2,
        ]);

        // 10. Ngân hàng câu hỏi mẫu (hỗ trợ KaTeX)
        $qData = [
            [
                'type' => 'single_choice',
                'level' => 1,
                'content' => 'Cho hàm số $y = x^3 - 3x^2 + 2$. Đạo hàm $y\'$ của hàm số đã cho là:',
                'explanation' => 'Áp dụng công thức $(x^n)\' = n \\cdot x^{n-1}$, ta có $y\' = 3x^2 - 6x$.',
                'options' => [
                    ['content' => '$y\' = 3x^2 - 6x$', 'is_correct' => true],
                    ['content' => '$y\' = 3x^2 - 3x$', 'is_correct' => false],
                    ['content' => '$y\' = x^2 - 6x$', 'is_correct' => false],
                    ['content' => '$y\' = 3x^2 + 6x$', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'single_choice',
                'level' => 2,
                'content' => 'Hàm số $y = \\frac{2x + 1}{x - 1}$ đồng biến hay nghịch biến trên các khoảng xác định?',
                'explanation' => 'Ta có $y\' = \\frac{2(-1) - 1(1)}{(x-1)^2} = \\frac{-3}{(x-1)^2} < 0, \\forall x \\ne 1$. Do đó hàm số nghịch biến trên từng khoảng $(-\\infty; 1)$ và $(1; +\\infty)$.',
                'options' => [
                    ['content' => 'Nghịch biến trên $(-\\infty; 1)$ và $(1; +\\infty)$', 'is_correct' => true],
                    ['content' => 'Đồng biến trên $(-\\infty; 1)$ và $(1; +\\infty)$', 'is_correct' => false],
                    ['content' => 'Đồng biến trên $\\mathbb{R}$', 'is_correct' => false],
                    ['content' => 'Nghịch biến trên $\\mathbb{R} \\setminus \\{1\\}$', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'single_choice',
                'level' => 3,
                'content' => 'Giá trị cực tiểu của hàm số $y = x^3 - 3x + 1$ là:',
                'explanation' => 'Đạo hàm $y\' = 3x^2 - 3 = 0 \\iff x = \\pm 1$. Bảng biến thiên cho thấy cực tiểu đạt tại $x = 1$, giá trị cực tiểu $y(1) = 1 - 3 + 1 = -1$.',
                'options' => [
                    ['content' => '$-1$', 'is_correct' => true],
                    ['content' => '$3$', 'is_correct' => false],
                    ['content' => '$1$', 'is_correct' => false],
                    ['content' => '$-2$', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'single_choice',
                'level' => 4,
                'content' => 'Tìm tất cả các giá trị của tham số $m$ để hàm số $y = \\frac{x + 2m}{x - m + 3}$ đồng biến trên khoảng $(-\\infty; -4)$:',
                'explanation' => 'Hàm số xác định khi $x \\ne m - 3$. Đạo hàm $y\' = \\frac{-m + 3 - 2m}{(x - m + 3)^2} = \\frac{3 - 3m}{(x - m + 3)^2}$. Để đồng biến thì $y\' > 0 \\iff 3 - 3m > 0 \\iff m < 1$. Đồng thời điều kiện không thuộc khoảng $(-\\infty; -4)$ suy ra $m - 3 \\ge -4 \\iff m \\ge -1$. Vậy $-1 \\le m < 1$.',
                'options' => [
                    ['content' => '$-1 \\le m < 1$', 'is_correct' => true],
                    ['content' => '$m < 1$', 'is_correct' => false],
                    ['content' => '$-1 < m < 1$', 'is_correct' => false],
                    ['content' => '$m \\ge -1$', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'true_false',
                'level' => 1,
                'content' => 'Hàm số $y = x^4 - 2x^2 + 1$ luôn có 3 điểm cực trị. Khẳng định này Đúng hay Sai?',
                'explanation' => 'Ta có $y\' = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\iff x \\in \\{0, 1, -1\\}$. Do $y\'$ đổi dấu qua cả 3 nghiệm nên có 3 điểm cực trị.',
                'options' => [
                    ['content' => 'Đúng', 'is_correct' => true],
                    ['content' => 'Sai', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'fill_in_blank',
                'level' => 2,
                'content' => 'Số đường tiệm cận đứng của đồ thị hàm số $y = \\frac{x + 1}{x^2 - 1}$ là bao nhiêu?',
                'explanation' => 'Ta có $y = \\frac{x+1}{(x-1)(x+1)} = \\frac{1}{x-1}$ (với $x \\ne -1$). Do đó chỉ có duy nhất 1 tiệm cận đứng là $x = 1$.',
                'options' => [
                    ['content' => '1', 'is_correct' => true],
                ],
            ],
            [
                'type' => 'multiple_choice',
                'level' => 3,
                'content' => 'Những mệnh đề nào sau đây là ĐÚNG về hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ ($a \\ne 0$)?',
                'explanation' => 'Đồ thị hàm số bậc ba luôn có tâm đối xứng là điểm uốn, và nếu có cực trị thì luôn có 2 cực trị.',
                'options' => [
                    ['content' => 'Đồ thị luôn nhận điểm uốn làm tâm đối xứng', 'is_correct' => true],
                    ['content' => 'Nếu hàm số có cực trị thì luôn có đúng hai điểm cực trị', 'is_correct' => true],
                    ['content' => 'Đồ thị luôn cắt trục hoành tại ít nhất một điểm', 'is_correct' => true],
                    ['content' => 'Hàm số luôn luôn có giá trị lớn nhất và nhỏ nhất trên $\\mathbb{R}$', 'is_correct' => false],
                ],
            ],
        ];

        $createdQuestions = [];
        foreach ($qData as $idx => $q) {
            $question = Question::create([
                'creator_id' => $teacherMath->id,
                'subject_id' => $subMath->id,
                'chapter_id' => $chap1->id,
                'lesson_id' => ($idx % 2 === 0) ? $lesson1->id : $lesson2->id,
                'question_type' => $q['type'],
                'difficulty_level' => $q['level'],
                'content' => $q['content'],
                'explanation' => $q['explanation'],
                'default_points' => 1.00,
                'is_shared' => true,
                'status' => 'active',
            ]);

            foreach ($q['options'] as $oIdx => $opt) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'content' => $opt['content'],
                    'is_correct' => $opt['is_correct'],
                    'order_index' => $oIdx + 1,
                ]);
            }
            $createdQuestions[] = $question;
        }

        // 11. Tạo Đề thi mẫu
        $exam = Exam::create([
            'creator_id' => $teacherMath->id,
            'subject_id' => $subMath->id,
            'grade_id' => $grade12->id,
            'title' => 'Kiểm tra Giữa kỳ 1 - Môn Toán 12 (Chuẩn kiến thức)',
            'code' => 'TOAN12_GK1',
            'description' => 'Bài thi trắc nghiệm khách quan gồm 7 câu hỏi thuộc Chương 1 Đạo hàm và Khảo sát đồ thị hàm số.',
            'duration_minutes' => 45,
            'total_points' => 10.00,
            'pass_points' => 5.00,
            'shuffle_questions' => true,
            'shuffle_options' => true,
            'status' => 'published',
        ]);

        $pointPerQuestion = round(10.0 / count($createdQuestions), 2);
        foreach ($createdQuestions as $oIdx => $question) {
            ExamQuestion::create([
                'exam_id' => $exam->id,
                'question_id' => $question->id,
                'order_index' => $oIdx + 1,
                'points' => $pointPerQuestion,
            ]);
        }

        // 12. Giao đề thi cho lớp 12A1
        ExamAssignment::create([
            'exam_id' => $exam->id,
            'class_id' => $class12A1->id,
            'assigned_by' => $teacherMath->id,
            'start_time' => now()->subHours(2), // Đã mở phòng thi
            'end_time' => now()->addDays(7),    // Đóng phòng sau 7 ngày
            'max_attempts' => 2,
            'view_score_type' => 'immediately',
            'show_solutions' => true,
        ]);
    }
}
