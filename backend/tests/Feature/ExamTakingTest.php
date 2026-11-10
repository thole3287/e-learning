<?php

namespace Tests\Feature;

use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\StudentAnswer;
use App\Models\Subject;
use App\Models\User;
use App\Services\ExamGradingService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ExamTakingTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        ExamAssignment::query()->update([
            'start_time' => now()->subDay(),
            'end_time' => now()->addDays(7),
        ]);
    }

    public function test_student_can_login_and_receive_token(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'login' => 'student1',
            'password' => 'Student@123456',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'username', 'email', 'role'],
                    'token',
                    'token_type',
                ],
            ]);
    }

    public function test_student_can_start_assigned_exam(): void
    {
        $student = User::where('username', 'student2')->firstOrFail();
        $assignment = ExamAssignment::firstOrFail();

        $response = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/assignments/{$assignment->id}/start");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    'attempt_id',
                    'exam_id',
                    'title',
                    'duration_minutes',
                    'started_at',
                    'expires_at',
                    'questions',
                ],
            ]);
    }

    public function test_exam_questions_do_not_leak_correct_answers(): void
    {
        $student = User::where('username', 'student2')->firstOrFail();
        $assignment = ExamAssignment::firstOrFail();

        $response = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/assignments/{$assignment->id}/start");

        $questions = $response->json('data.questions');
        $this->assertNotEmpty($questions);

        foreach ($questions as $q) {
            $this->assertArrayNotHasKey('is_correct', $q);
            $this->assertArrayNotHasKey('explanation', $q);
            foreach ($q['options'] as $opt) {
                $this->assertArrayNotHasKey('is_correct', $opt);
            }
        }
    }

    public function test_student_can_autosave_answers(): void
    {
        $student = User::where('username', 'student2')->firstOrFail();
        $assignment = ExamAssignment::firstOrFail();

        $startRes = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/assignments/{$assignment->id}/start");

        $attemptId = $startRes->json('data.attempt_id');
        $q1 = $startRes->json('data.questions.0');
        $opt1 = $q1['options'][0]['id'];

        $saveRes = $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/attempts/{$attemptId}/answers", [
                'question_id' => $q1['id'],
                'selected_option_ids' => [$opt1],
                'is_flagged' => true,
            ]);

        $saveRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('student_answers', [
            'exam_attempt_id' => $attemptId,
            'question_id' => $q1['id'],
            'is_flagged' => true,
        ]);
    }

    public function test_student_cannot_access_other_student_attempt(): void
    {
        $student1 = User::where('username', 'student1')->firstOrFail();
        $student2 = User::where('username', 'student2')->firstOrFail();

        $assignment = ExamAssignment::firstOrFail();
        $attempt = ExamAttempt::create([
            'exam_assignment_id' => $assignment->id,
            'exam_id' => $assignment->exam_id,
            'student_id' => $student1->id,
            'started_at' => now(),
            'expires_at' => now()->addMinutes(45),
            'status' => 'in_progress',
        ]);

        $response = $this->actingAs($student2, 'sanctum')
            ->getJson("/api/v1/attempts/{$attempt->id}");

        $response->assertStatus(403);
    }

    public function test_true_false_gdpt_2018_grading(): void
    {
        $gradingService = app(ExamGradingService::class);
        $user = User::where('role', 'teacher')->firstOrFail();
        $subject = Subject::firstOrFail();

        // Tạo câu hỏi Đúng / Sai gồm 4 mệnh đề chuẩn GDPT 2018
        $question = Question::create([
            'creator_id' => $user->id,
            'subject_id' => $subject->id,
            'question_type' => 'true_false',
            'difficulty_level' => 2,
            'content' => 'Câu hỏi thí nghiệm hóa học đúng sai',
            'default_points' => 1.00,
        ]);

        $optA = QuestionOption::create(['question_id' => $question->id, 'content' => 'a) Mệnh đề 1', 'is_correct' => true, 'order_index' => 1]);
        $optB = QuestionOption::create(['question_id' => $question->id, 'content' => 'b) Mệnh đề 2', 'is_correct' => false, 'order_index' => 2]);
        $optC = QuestionOption::create(['question_id' => $question->id, 'content' => 'c) Mệnh đề 3', 'is_correct' => false, 'order_index' => 3]);
        $optD = QuestionOption::create(['question_id' => $question->id, 'content' => 'd) Mệnh đề 4', 'is_correct' => true, 'order_index' => 4]);

        $exam = Exam::firstOrFail();
        $examQuestion = ExamQuestion::firstOrCreate(
            ['exam_id' => $exam->id, 'question_id' => $question->id],
            ['points' => 1.00, 'order_index' => 99]
        );

        $attempt = ExamAttempt::firstOrFail();

        // 1. Đúng 1 ý: đạt 0.10 điểm (10%)
        $ans1 = new StudentAnswer([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $question->id,
            'text_answer' => json_encode([$optA->id => true, $optB->id => true, $optC->id => true, $optD->id => false]),
        ]);
        $res1 = $gradingService->evaluateQuestion($question, $ans1, 1.00);
        $this->assertEquals(0.10, $res1['earned_points']);
        $this->assertFalse($res1['is_correct']);

        // 2. Đúng 2 ý: đạt 0.25 điểm (25%)
        $ans2 = new StudentAnswer([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $question->id,
            'text_answer' => json_encode([$optA->id => true, $optB->id => false, $optC->id => true, $optD->id => false]),
        ]);
        $res2 = $gradingService->evaluateQuestion($question, $ans2, 1.00);
        $this->assertEquals(0.25, $res2['earned_points']);
        $this->assertFalse($res2['is_correct']);

        // 3. Đúng 3 ý: đạt 0.50 điểm (50%)
        $ans3 = new StudentAnswer([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $question->id,
            'text_answer' => json_encode([$optA->id => true, $optB->id => false, $optC->id => false, $optD->id => false]),
        ]);
        $res3 = $gradingService->evaluateQuestion($question, $ans3, 1.00);
        $this->assertEquals(0.50, $res3['earned_points']);
        $this->assertFalse($res3['is_correct']);

        // 4. Đúng trọn vẹn 4 ý: đạt 1.00 điểm (100%)
        $ans4 = new StudentAnswer([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $question->id,
            'text_answer' => json_encode([$optA->id => true, $optB->id => false, $optC->id => false, $optD->id => true]),
        ]);
        $res4 = $gradingService->evaluateQuestion($question, $ans4, 1.00);
        $this->assertEquals(1.00, $res4['earned_points']);
        $this->assertTrue($res4['is_correct']);
    }
}
