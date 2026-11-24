<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\Grade;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\ExamMatrixService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ExamMatrixAndAssignmentTest extends TestCase
{
    use DatabaseTransactions;

    protected User $teacher;
    protected User $studentInClass;
    protected User $studentNotInClass;
    protected SchoolClass $class;
    protected Subject $subject;
    protected Grade $grade;

    protected function setUp(): void
    {
        parent::setUp();

        $school = School::first() ?? School::create([
            'name' => 'THPT Test',
            'code' => 'THPT_TEST',
            'is_active' => true,
        ]);

        $this->grade = Grade::first() ?? Grade::create(['name' => 'Khối 12', 'level' => 12]);
        $this->subject = Subject::first() ?? Subject::create(['name' => 'Toán Học', 'code' => 'TOAN']);

        $this->teacher = User::create([
            'school_id' => $school->id,
            'username' => 'teacher_matrix_' . uniqid(),
            'email' => 'teacher_matrix_' . uniqid() . '@elearning.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Giáo Viên Ma Trận',
            'role' => 'teacher',
            'code' => 'GV_MAT_' . uniqid(),
            'status' => 'active',
        ]);

        $this->class = SchoolClass::create([
            'school_id' => $school->id,
            'academic_year_id' => AcademicYear::first()?->id ?? 1,
            'grade_id' => $this->grade->id,
            'name' => '12A' . rand(10, 99),
            'code' => 'CLS_' . uniqid(),
        ]);

        $this->studentInClass = User::create([
            'school_id' => $school->id,
            'username' => 'student_in_' . uniqid(),
            'email' => 'student_in_' . uniqid() . '@elearning.vn',
            'password' => 'Student@123456',
            'full_name' => 'Học Sinh Trong Lớp',
            'role' => 'student',
            'code' => 'HS_IN_' . uniqid(),
            'status' => 'active',
        ]);
        $this->class->students()->attach($this->studentInClass->id, [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->studentNotInClass = User::create([
            'school_id' => $school->id,
            'username' => 'student_out_' . uniqid(),
            'email' => 'student_out_' . uniqid() . '@elearning.vn',
            'password' => 'Student@123456',
            'full_name' => 'Học Sinh Ngoài Lớp',
            'role' => 'student',
            'code' => 'HS_OUT_' . uniqid(),
            'status' => 'active',
        ]);
    }

    /**
     * Test tự động tạo đề thi theo ma trận Bloom khi đủ số lượng câu hỏi
     */
    public function test_matrix_generation_succeeds_with_valid_counts(): void
    {
        $matrixService = app(ExamMatrixService::class);

        // Tạo sẵn các câu hỏi theo 4 mức độ nhận thức
        for ($level = 1; $level <= 4; $level++) {
            for ($i = 0; $i < 3; $i++) {
                $q = Question::create([
                    'creator_id' => $this->teacher->id,
                    'subject_id' => $this->subject->id,
                    'grade_id' => $this->grade->id,
                    'difficulty_level' => $level,
                    'question_type' => 'single_choice',
                    'content' => "Câu hỏi mức độ {$level} số {$i}",
                    'default_points' => 1.0,
                    'status' => 'active',
                ]);
                QuestionOption::create(['question_id' => $q->id, 'content' => 'A. Đúng', 'is_correct' => true]);
                QuestionOption::create(['question_id' => $q->id, 'content' => 'B. Sai', 'is_correct' => false]);
            }
        }

        $exam = Exam::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'grade_id' => $this->grade->id,
            'title' => 'Đề Thi Ma Trận Chuẩn',
            'code' => 'EXAM_MAT_' . uniqid(),
            'duration_minutes' => 45,
            'total_points' => 10.0,
            'status' => 'draft',
        ]);

        $matrix = [
            'subject_id' => $this->subject->id,
            'levels' => [
                1 => 2, // 2 câu nhận biết
                2 => 2, // 2 câu thông hiểu
                3 => 1, // 1 câu vận dụng
                4 => 1, // 1 câu vận dụng cao
            ],
        ];

        $updatedExam = $matrixService->generateExamByMatrix($exam, $matrix);

        $this->assertCount(6, $updatedExam->examQuestions);
        // Kiểm tra phân bổ điểm: 10 điểm / 6 câu = 1.67 điểm/câu
        $this->assertEquals(1.67, (float) $updatedExam->examQuestions->first()->points);
    }

    /**
     * Test ma trận sinh đề bắn Exception khi ngân hàng câu hỏi không đủ
     */
    public function test_matrix_generation_throws_exception_when_bank_lacks_questions(): void
    {
        $this->expectException(ValidationException::class);

        $matrixService = app(ExamMatrixService::class);

        $exam = Exam::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'grade_id' => $this->grade->id,
            'title' => 'Đề Thi Thiếu Câu',
            'code' => 'EXAM_MAT_FAIL_' . uniqid(),
            'duration_minutes' => 45,
            'total_points' => 10.0,
            'status' => 'draft',
        ]);

        // Yêu cầu 999 câu vận dụng cao (cấp 4) - chắc chắn không đủ
        $matrix = [
            'subject_id' => $this->subject->id,
            'levels' => [
                4 => 999,
            ],
        ];

        $matrixService->generateExamByMatrix($exam, $matrix);
    }

    /**
     * Test quyền vào phòng thi khi đề được giao cho một lớp học cụ thể
     */
    public function test_class_assignment_access_control(): void
    {
        $exam = Exam::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'grade_id' => $this->grade->id,
            'title' => 'Đề Thi Nội Bộ Lớp 12A',
            'code' => 'EXAM_CLS_' . uniqid(),
            'duration_minutes' => 30,
            'total_points' => 10.0,
            'status' => 'published',
        ]);

        $q = Question::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'question_type' => 'single_choice',
            'content' => 'Câu 1 trong lớp',
            'default_points' => 10.0,
            'status' => 'active',
        ]);
        QuestionOption::create(['question_id' => $q->id, 'content' => 'A. Đúng', 'is_correct' => true]);
        $exam->examQuestions()->create(['question_id' => $q->id, 'order_index' => 1, 'points' => 10.0]);

        $assignment = ExamAssignment::create([
            'exam_id' => $exam->id,
            'class_id' => $this->class->id,
            'assigned_by' => $this->teacher->id,
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2),
            'max_attempts' => 1,
            'view_score_type' => 'immediately',
            'show_solutions' => true,
        ]);

        // 1. Học sinh thuộc lớp -> Bắt đầu làm bài THÀNH CÔNG (200)
        $resInClass = $this->actingAs($this->studentInClass, 'sanctum')
            ->postJson("/api/v1/assignments/{$assignment->id}/start");

        $resInClass->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['attempt_id', 'questions']]);

        // 2. Học sinh KHÔNG thuộc lớp -> Bị chặn (403 Forbidden)
        $resNotInClass = $this->actingAs($this->studentNotInClass, 'sanctum')
            ->postJson("/api/v1/assignments/{$assignment->id}/start");

        $resNotInClass->assertStatus(403);
    }
}
