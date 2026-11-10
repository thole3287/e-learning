<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\PracticeAnswer;
use App\Models\PracticeSession;
use App\Models\Question;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PracticeTest extends TestCase
{
    use DatabaseTransactions;

    protected User $student;
    protected User $teacher;
    protected Subject $chemistry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::where('role', 'student')->first() ?? User::factory()->create(['role' => 'student']);
        $this->teacher = User::where('role', 'teacher')->first() ?? User::factory()->create(['role' => 'teacher']);
        $this->chemistry = Subject::where('id', 3)->first() ?? Subject::first();
    }

    public function test_can_get_matrix_info(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/practice/matrix-info?subject_id={$this->chemistry->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'subject' => ['id', 'name', 'code'],
                    'chapters',
                    'total_available_questions',
                    'total_by_level',
                ],
            ]);
    }

    public function test_student_can_start_self_practice_session(): void
    {
        $chapters = Chapter::where('subject_id', $this->chemistry->id)->pluck('id')->all();

        $payload = [
            'subject_id' => $this->chemistry->id,
            'chapter_ids' => array_slice($chapters, 0, 2),
            'matrix' => [
                'level1' => 2,
                'level2' => 2,
            ],
            'mode' => 'interactive',
            'duration_minutes' => 15,
        ];

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/practice/start', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'title',
                    'subject_id',
                    'mode',
                    'questions',
                ],
            ]);

        $this->assertDatabaseHas('practice_sessions', [
            'student_id' => $this->student->id,
            'subject_id' => $this->chemistry->id,
            'mode' => 'interactive',
        ]);
    }

    public function test_student_can_save_answer_with_instant_feedback_in_interactive_mode(): void
    {
        $chapters = Chapter::where('subject_id', $this->chemistry->id)->pluck('id')->all();

        $startRes = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/practice/start', [
                'subject_id' => $this->chemistry->id,
                'chapter_ids' => $chapters,
                'matrix' => ['level1' => 2],
                'mode' => 'interactive',
            ]);

        $sessionId = $startRes->json('data.id');
        $firstQuestion = $startRes->json('data.questions.0');

        $q = Question::with('options')->find($firstQuestion['id']);
        $correctOption = $q->options->where('is_correct', true)->first();

        $savePayload = ['question_id' => $q->id];
        if ($q->question_type === 'fill_in_blank' || $q->question_type === 'short_answer') {
            $savePayload['text_answer'] = $correctOption ? $correctOption->content : '18';
        } else {
            $savePayload['selected_option_ids'] = [$correctOption->id];
        }

        $saveRes = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/practice/sessions/{$sessionId}/save", $savePayload);

        $saveRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'saved' => true,
                    'is_correct' => true,
                ],
            ]);

        $this->assertEquals($q->explanation, $saveRes->json('data.explanation'));
    }

    public function test_student_can_submit_session_and_calculate_score(): void
    {
        $chapters = Chapter::where('subject_id', $this->chemistry->id)->pluck('id')->all();

        $startRes = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/v1/practice/start', [
                'subject_id' => $this->chemistry->id,
                'chapter_ids' => $chapters,
                'matrix' => ['level1' => 3],
                'mode' => 'exam',
            ]);

        $sessionId = $startRes->json('data.id');
        $session = PracticeSession::find($sessionId);
        $questions = Question::whereIn('id', $session->question_order)->with('options')->get();

        // Trả lời đúng cho câu đầu tiên
        $firstQ = $questions->first();
        $correctOpt = $firstQ->options->where('is_correct', true)->first();
        PracticeAnswer::create([
            'practice_session_id' => $sessionId,
            'question_id' => $firstQ->id,
            'selected_option_ids' => [$correctOpt->id],
        ]);

        $submitRes = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/practice/sessions/{$sessionId}/submit");

        $submitRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $session->refresh();
        $this->assertEquals('completed', $session->status);
        $this->assertEquals(1, $session->total_correct);
        $this->assertNotNull($session->score);
    }

    public function test_student_can_view_practice_history(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/practice/history');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_teacher_can_view_practice_overview_and_session_detail(): void
    {
        // Tạo một session đã hoàn thành
        $session = PracticeSession::create([
            'student_id' => $this->student->id,
            'subject_id' => $this->chemistry->id,
            'title' => 'Test Practice Session',
            'status' => 'completed',
            'score' => 8.50,
            'total_questions' => 10,
            'total_correct' => 8,
            'total_incorrect' => 2,
            'total_unanswered' => 0,
            'mode' => 'interactive',
            'started_at' => now()->subMinutes(20),
            'completed_at' => now(),
            'question_order' => [],
        ]);

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/practice/teacher/overview');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'summary' => [
                        'total_sessions',
                        'average_score',
                        'active_students_count',
                    ],
                    'sessions',
                ],
            ]);

        // Chi tiết
        $detailRes = $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/practice/teacher/sessions/{$session->id}");

        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $session->id,
                    'score' => 8.5,
                ],
            ]);
    }
}
