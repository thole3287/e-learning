<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TeacherFeatureEnhancementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $teacher;
    protected School $school;
    protected AcademicYear $year;
    protected Grade $grade10;
    protected Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::create([
            'name' => 'THPT Test',
            'code' => 'THPT_TEST',
            'is_active' => true,
        ]);

        $this->year = AcademicYear::create([
            'school_id' => $this->school->id,
            'name' => '2025-2026',
            'start_date' => '2025-09-01',
            'end_date' => '2026-06-30',
            'is_current' => true,
        ]);

        $this->grade10 = Grade::create(['name' => 'Khối 10', 'level' => 10]);

        $this->teacher = User::create([
            'school_id' => $this->school->id,
            'username' => 'teacher_test',
            'email' => 'teacher_test@test.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Thầy Đức Giáo Viên',
            'role' => 'teacher',
            'code' => 'GV_TEST',
            'status' => 'active',
        ]);

        $this->subject = Subject::create([
            'name' => 'Hóa Học',
            'code' => 'HOA_HOC',
        ]);
    }

    public function test_teacher_can_get_grades(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/grades');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['name' => 'Khối 10']);
    }

    public function test_teacher_can_create_class_and_quick_add_students(): void
    {
        // 1. Tạo lớp học
        $resClass = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/classes', [
                'name' => '10A1',
                'grade_id' => $this->grade10->id,
            ]);

        $resClass->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', '10A1');

        $classId = $resClass->json('data.id');

        // 2. Thêm nhanh danh sách học sinh bằng chuỗi văn bản
        $rawText = "1. Nguyễn Văn An\n2. Trần Thị Bích\n3. Lê Hoàng Cường";
        $resStudents = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/classes/{$classId}/quick-add-students", [
                'raw_text' => $rawText,
            ]);

        $resStudents->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data');

        $this->assertDatabaseHas('classes', ['name' => '10A1']);
        $this->assertDatabaseHas('users', ['full_name' => 'Nguyễn Văn An', 'role' => 'student']);
        $this->assertDatabaseHas('users', ['full_name' => 'Trần Thị Bích', 'role' => 'student']);
        $this->assertDatabaseHas('users', ['full_name' => 'Lê Hoàng Cường', 'role' => 'student']);
    }

    public function test_quick_create_exam_with_questions_and_offline_shuffling(): void
    {
        $class = SchoolClass::create([
            'school_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'grade_id' => $this->grade10->id,
            'name' => '10A2',
            'code' => '10A2_2026',
        ]);

        $questionsPayload = [
            [
                'content' => 'Câu 1: Số proton trong hạt nhân nguyên tử Carbon là bao nhiêu?',
                'question_type' => 'single_choice',
                'difficulty_level' => 1,
                'explanation' => 'Carbon có Z = 6',
                'options' => [
                    ['content' => '6', 'is_correct' => true],
                    ['content' => '12', 'is_correct' => false],
                    ['content' => '8', 'is_correct' => false],
                    ['content' => '14', 'is_correct' => false],
                ],
            ],
            [
                'content' => 'Câu 2: Cho các phát biểu sau về nguyên tử Oxy:',
                'question_type' => 'true_false',
                'difficulty_level' => 2,
                'explanation' => 'Oxy có 8 electron',
                'options' => [
                    ['content' => 'Oxy có Z = 8', 'is_correct' => true],
                    ['content' => 'Oxy có 10 electron ở trạng thái cơ bản', 'is_correct' => false],
                    ['content' => 'Oxy thuộc chu kì 2', 'is_correct' => true],
                    ['content' => 'Oxy là kim loại', 'is_correct' => false],
                ],
            ],
            [
                'content' => 'Câu 3: Số electron tối đa trong phân lớp p là bao nhiêu?',
                'question_type' => 'short_answer',
                'difficulty_level' => 1,
                'explanation' => 'Phân lớp p có tối đa 6 electron',
                'options' => [
                    ['content' => '6', 'is_correct' => true],
                ],
            ],
        ];

        // 1. Tạo đề thi cấp tốc từ câu hỏi
        $resQuick = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/exams/quick-create', [
                'title' => 'Đề Kiểm Tra Giữa Kì 1 Hóa 10',
                'subject_id' => $this->subject->id,
                'grade_id' => $this->grade10->id,
                'duration_minutes' => 45,
                'total_points' => 10.0,
                'pass_points' => 5.0,
                'save_to_bank' => true,
                'questions' => $questionsPayload,
                'assign_class_ids' => [$class->id],
            ]);

        $resQuick->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'Đề Kiểm Tra Giữa Kì 1 Hóa 10');

        $examId = $resQuick->json('data.id');

        // Kiểm tra xem câu hỏi đã được lưu vào ngân hàng và gán đề thi
        $this->assertDatabaseHas('exams', ['id' => $examId]);
        $this->assertDatabaseHas('questions', ['content' => 'Câu 1: Số proton trong hạt nhân nguyên tử Carbon là bao nhiêu?']);
        $this->assertDatabaseHas('exam_assignments', ['exam_id' => $examId, 'class_id' => $class->id]);

        // 2. Thử nghiệm tính năng đảo đề Offline
        $resShuffle = $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/exams/{$examId}/shuffled-offline?num_codes=4&start_code=101");

        $resShuffle->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(4, 'data.variants')
            ->assertJsonCount(4, 'data.answer_matrix.rows');

        $variants = $resShuffle->json('data.variants');
        $this->assertEquals('101', $variants[0]['code']);
        $this->assertEquals('102', $variants[1]['code']);
        $this->assertEquals('103', $variants[2]['code']);
        $this->assertEquals('104', $variants[3]['code']);

        // Đảm bảo có đủ 3 phần đã phân loại
        $this->assertNotEmpty($variants[0]['parts']['part1']['questions']);
        $this->assertNotEmpty($variants[0]['parts']['part2']['questions']);
        $this->assertNotEmpty($variants[0]['parts']['part3']['questions']);
        $this->assertNotEmpty($variants[0]['answer_key']);
    }
}
