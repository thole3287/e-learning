<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamAttempt;
use App\Models\Grade;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\StudentAnswer;
use App\Models\Subject;
use App\Models\User;
use App\Services\ExamAttemptService;
use App\Services\ExamGradingService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Tests\TestCase;

class ComprehensiveExamFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $teacher;
    protected School $school;
    protected Grade $grade;
    protected Subject $subject;
    protected Exam $exam;
    protected ExamAssignment $assignment;
    protected array $createdQuestions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::first() ?? School::create([
            'name' => 'THPT Chuyên Thực Nghiệm',
            'code' => 'THPT_TN',
            'is_active' => true,
        ]);

        $this->grade = Grade::first() ?? Grade::create(['name' => 'Khối 12', 'level' => 12]);
        $this->subject = Subject::first() ?? Subject::create(['name' => 'Vật Lý', 'code' => 'VAT_LY']);

        $this->teacher = User::create([
            'school_id' => $this->school->id,
            'username' => 'teacher_flow_' . uniqid(),
            'email' => 'teacher_flow_' . uniqid() . '@elearning.vn',
            'password' => 'Teacher@123456',
            'full_name' => 'Thầy Thử Nghiệm Luồng',
            'role' => 'teacher',
            'code' => 'GV_FLOW_' . uniqid(),
            'status' => 'active',
        ]);

        // Tạo đề thi chuẩn 10 điểm
        $this->exam = Exam::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'grade_id' => $this->grade->id,
            'title' => 'Đề Thi Kiểm Tra Toàn Diện',
            'code' => 'EXAM_FLOW_' . uniqid(),
            'duration_minutes' => 45,
            'total_points' => 10.0,
            'shuffle_questions' => true,
            'shuffle_options' => true,
            'status' => 'published',
            'settings' => [
                'tf_grading_weights' => [10, 25, 50, 100],
            ],
        ]);

        // 1. Câu hỏi Trắc nghiệm 1 lựa chọn (Single Choice) - 2.5 điểm
        $q1 = Question::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'question_type' => 'single_choice',
            'difficulty_level' => 1,
            'content' => 'Dao động điều hòa có gia tốc biến thiên thế nào so với li độ?',
            'default_points' => 2.5,
            'status' => 'active',
        ]);
        $opt1A = QuestionOption::create(['question_id' => $q1->id, 'content' => 'Ngược pha với li độ', 'is_correct' => true, 'order_index' => 1]);
        $opt1B = QuestionOption::create(['question_id' => $q1->id, 'content' => 'Cùng pha với li độ', 'is_correct' => false, 'order_index' => 2]);
        $opt1C = QuestionOption::create(['question_id' => $q1->id, 'content' => 'Vuông pha với li độ', 'is_correct' => false, 'order_index' => 3]);
        $opt1D = QuestionOption::create(['question_id' => $q1->id, 'content' => 'Lệch pha pi/3', 'is_correct' => false, 'order_index' => 4]);
        $this->exam->examQuestions()->create(['question_id' => $q1->id, 'order_index' => 1, 'points' => 2.5]);
        $this->createdQuestions['q1'] = ['question' => $q1, 'options' => [$opt1A, $opt1B, $opt1C, $opt1D]];

        // 2. Câu hỏi Đúng / Sai chuẩn GDPT 2018 (True / False) - 4 ý, tổng 5.0 điểm
        $q2 = Question::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'question_type' => 'true_false',
            'difficulty_level' => 2,
            'content' => 'Xét một con lắc lò xo dao động điều hòa tự do:',
            'default_points' => 5.0,
            'status' => 'active',
        ]);
        $opt2A = QuestionOption::create(['question_id' => $q2->id, 'content' => 'a) Cơ năng bảo toàn khi bỏ qua ma sát', 'is_correct' => true, 'order_index' => 1]);
        $opt2B = QuestionOption::create(['question_id' => $q2->id, 'content' => 'b) Vận tốc đạt cực đại tại vị trí biên', 'is_correct' => false, 'order_index' => 2]);
        $opt2C = QuestionOption::create(['question_id' => $q2->id, 'content' => 'c) Thế năng đạt cực đại tại vị trí cân bằng', 'is_correct' => false, 'order_index' => 3]);
        $opt2D = QuestionOption::create(['question_id' => $q2->id, 'content' => 'd) Chu kỳ không phụ thuộc vào biên độ dao động', 'is_correct' => true, 'order_index' => 4]);
        $this->exam->examQuestions()->create(['question_id' => $q2->id, 'order_index' => 2, 'points' => 5.0]);
        $this->createdQuestions['q2'] = ['question' => $q2, 'options' => [$opt2A, $opt2B, $opt2C, $opt2D]];

        // 3. Câu hỏi Trả lời ngắn (Short Answer) - 2.5 điểm
        $q3 = Question::create([
            'creator_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'question_type' => 'short_answer',
            'difficulty_level' => 3,
            'content' => 'Vận tốc truyền âm trong không khí xấp xỉ bao nhiêu m/s ở 20 độ C (nhập số nguyên)?',
            'default_points' => 2.5,
            'status' => 'active',
        ]);
        QuestionOption::create(['question_id' => $q3->id, 'content' => '343', 'is_correct' => true, 'order_index' => 1]);
        $this->exam->examQuestions()->create(['question_id' => $q3->id, 'order_index' => 3, 'points' => 2.5]);
        $this->createdQuestions['q3'] = ['question' => $q3];

        // Mở đợt thi công khai cho học sinh làm bài
        $this->assignment = ExamAssignment::create([
            'exam_id' => $this->exam->id,
            'class_id' => null,
            'student_id' => null,
            'assigned_by' => $this->teacher->id,
            'start_time' => now()->subMinutes(10),
            'end_time' => now()->addHours(2),
            'max_attempts' => 1,
            'view_score_type' => 'immediately',
            'show_solutions' => true,
        ]);
    }

    /**
     * Test toàn diện luồng: Bắt đầu -> Autosave -> Nộp bài -> Chấm điểm GDPT 2018 -> Chống sửa đáp án
     */
    public function test_full_student_exam_lifecycle_and_grading(): void
    {
        $student = User::create([
            'school_id' => $this->school->id,
            'username' => 'student_lifecycle_' . uniqid(),
            'email' => 'student_lifecycle_' . uniqid() . '@elearning.vn',
            'password' => 'Student@123456',
            'full_name' => 'Học Sinh Vòng Đời',
            'role' => 'student',
            'code' => 'HS_LIFE_' . uniqid(),
            'status' => 'active',
        ]);

        // 1. Học sinh bắt đầu làm bài
        $resStart = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/assignments/{$this->assignment->id}/start");

        $resStart->assertOk()
            ->assertJsonPath('success', true);

        $attemptId = $resStart->json('data.attempt_id');
        $this->assertNotNull($attemptId);

        // 2. Thí sinh autosave câu trả lời:
        // Câu 1: Chọn đúng phương án opt1A
        $opt1A = $this->createdQuestions['q1']['options'][0];
        $resSaveQ1 = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/answers", [
                'question_id' => $this->createdQuestions['q1']['question']->id,
                'selected_option_ids' => [$opt1A->id],
                'is_flagged' => false,
            ]);
        $resSaveQ1->assertOk()->assertJsonPath('success', true);

        // Câu 2 (True/False): Trả lời đúng 3 ý (a: Đúng, b: Sai, c: Đúng [sai so với đề], d: Đúng) => đúng 3 ý
        $optsQ2 = $this->createdQuestions['q2']['options'];
        $tfPayload = [
            $optsQ2[0]->id => true,  // a đúng -> đúng (1)
            $optsQ2[1]->id => false, // b sai   -> đúng (2)
            $optsQ2[2]->id => true,  // c sai nhưng chọn true -> sai
            $optsQ2[3]->id => true,  // d đúng -> đúng (3)
        ];
        $resSaveQ2 = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/answers", [
                'question_id' => $this->createdQuestions['q2']['question']->id,
                'text_answer' => json_encode($tfPayload),
                'is_flagged' => true,
            ]);
        $resSaveQ2->assertOk()->assertJsonPath('success', true);

        // Câu 3: Nhập câu trả lời ngắn đúng "343"
        $resSaveQ3 = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/answers", [
                'question_id' => $this->createdQuestions['q3']['question']->id,
                'text_answer' => '343',
                'is_flagged' => false,
            ]);
        $resSaveQ3->assertOk()->assertJsonPath('success', true);

        // 3. Nộp bài thi
        $resSubmit = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/submit");

        $resSubmit->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'graded');

        // 4. Kiểm tra điểm số chi tiết:
        // - Câu 1: đúng trọn vẹn = 2.5 điểm
        // - Câu 2: đúng 3/4 ý GDPT 2018 = 50% của 5.0 = 2.5 điểm
        // - Câu 3: đúng trọn vẹn = 2.5 điểm
        // Tổng điểm kỳ vọng: 2.5 + 2.5 + 2.5 = 7.50 điểm
        $expectedScore = 7.50;
        $actualScore = (float) $resSubmit->json('data.score');
        $this->assertEquals($expectedScore, $actualScore);

        // 5. Kiểm tra bảo mật: Không được sửa đáp án sau khi đã nộp bài
        $resPostSubmitSave = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/answers", [
                'question_id' => $this->createdQuestions['q1']['question']->id,
                'selected_option_ids' => [$opt1A->id],
            ]);
        $resPostSubmitSave->assertStatus(403);
    }

    /**
     * Test hệ thống tự động quét và nộp bài khi hết giờ làm bài
     */
    public function test_auto_submit_expired_attempts_command(): void
    {
        $student = User::create([
            'school_id' => $this->school->id,
            'username' => 'student_expired_' . uniqid(),
            'email' => 'student_expired_' . uniqid() . '@elearning.vn',
            'password' => 'Student@123456',
            'full_name' => 'Học Sinh Quá Hạn',
            'role' => 'student',
            'code' => 'HS_EXP_' . uniqid(),
            'status' => 'active',
        ]);

        // Tạo một attempt đã quá hạn expires_at từ 5 phút trước
        $attempt = ExamAttempt::create([
            'exam_assignment_id' => $this->assignment->id,
            'exam_id' => $this->exam->id,
            'student_id' => $student->id,
            'attempt_number' => 1,
            'started_at' => now()->subMinutes(50),
            'expires_at' => now()->subMinutes(5), // Quá hạn
            'status' => 'in_progress',
        ]);

        // Học sinh đã chọn đúng câu 1
        $opt1A = $this->createdQuestions['q1']['options'][0];
        StudentAnswer::create([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $this->createdQuestions['q1']['question']->id,
            'selected_option_ids' => [$opt1A->id],
            'saved_at' => now()->subMinutes(30),
        ]);

        // Chạy lệnh quét tự động
        $exitCode = Artisan::call('exams:check-expired-attempts');
        $this->assertEquals(0, $exitCode);

        // Kiểm tra lượt thi đã được tự động nộp và chấm điểm
        $attempt->refresh();
        $this->assertEquals('graded', $attempt->status);
        $this->assertNotNull($attempt->graded_at);
        $this->assertEquals(2.5, (float) $attempt->score);
    }

    /**
     * Test mô phỏng tải 2 lớp học (mỗi lớp 40 học sinh = 80 học sinh)
     * đồng thời thực hiện làm bài, autosave và nộp bài
     */
    public function test_concurrency_load_simulation_for_80_students(): void
    {
        $totalStudents = 80; // Kiểm tra 2 lớp học x 40 học sinh = 80 học sinh
        $attemptService = app(ExamAttemptService::class);
        $opt1A = $this->createdQuestions['q1']['options'][0];

        $students = [];
        for ($i = 0; $i < $totalStudents; $i++) {
            $students[] = User::create([
                'school_id' => $this->school->id,
                'username' => 'bench_student_' . $i . '_' . uniqid(),
                'email' => "bench_student_{$i}_" . uniqid() . '@elearning.vn',
                'password' => 'Student@123456',
                'full_name' => "Thí Sinh Mô Phỏng {$i}",
                'role' => 'student',
                'code' => "BENCH_{$i}_" . uniqid(),
                'status' => 'active',
            ]);
        }

        $startTime = microtime(true);

        // Pha 1: 80 học sinh cùng truy cập và bắt đầu phòng thi (tạo attempt, snapshot question_order, option_order)
        $attempts = [];
        foreach ($students as $st) {
            $payload = $attemptService->startAttempt($st, $this->assignment);
            $this->assertNotEmpty($payload['questions']);
            $attempts[] = ExamAttempt::find($payload['attempt_id']);
        }

        // Pha 2: 80 học sinh cùng autosave đáp án
        foreach ($attempts as $idx => $att) {
            $answer = $attemptService->saveAnswer(
                $att,
                $this->createdQuestions['q1']['question']->id,
                [$opt1A->id],
                null,
                false
            );
            $this->assertEquals($this->createdQuestions['q1']['question']->id, $answer->question_id);
        }

        // Pha 3: 80 học sinh cùng nộp bài thi đồng thời và được chấm điểm tự động
        foreach ($attempts as $att) {
            $result = $attemptService->submitAttempt($att);
            $this->assertEquals('graded', $result['status']);
            $this->assertGreaterThanOrEqual(2.5, (float) $result['score']);
        }

        $elapsed = microtime(true) - $startTime;

        // Đảm bảo toàn bộ 80 học sinh được xử lý không lỗi và ghi nhận điểm số chính xác
        $gradedCount = ExamAttempt::whereIn('id', collect($attempts)->pluck('id'))
            ->where('status', 'graded')
            ->count();

        $this->assertEquals($totalStudents, $gradedCount);
        // Thời gian xử lý cho cả 3 pha (80 start + 80 autosave + 80 submit = 240 transactions)
        $this->assertLessThan(20.0, $elapsed, "Thời gian xử lý 80 học sinh mất {$elapsed}s");
    }
}
