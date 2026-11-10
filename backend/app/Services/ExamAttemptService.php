<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ExamAttemptService
{
    protected ExamGradingService $gradingService;

    public function __construct(ExamGradingService $gradingService)
    {
        $this->gradingService = $gradingService;
    }

    /**
     * Bắt đầu một lượt làm bài mới hoặc khôi phục phiên đang làm dở
     */
    public function startAttempt(User $student, ExamAssignment $assignment): array
    {
        // 1. Kiểm tra quyền của học sinh với bài thi
        $hasAccess = false;
        if ($assignment->student_id === $student->id) {
            $hasAccess = true;
        } elseif ($assignment->class_id) {
            $isEnrolled = $student->enrolledClasses()
                ->where('classes.id', $assignment->class_id)
                ->wherePivot('status', 'active')
                ->exists();
            if ($isEnrolled) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && !$student->isSuperAdmin()) {
            throw new AccessDeniedHttpException('Bạn không được phân công tham gia bài thi này.');
        }

        // 2. Kiểm tra khung giờ thi
        $now = now();
        if ($now->lt($assignment->start_time)) {
            throw new AccessDeniedHttpException('Bài thi chưa đến thời gian mở. Thời gian bắt đầu: ' . $assignment->start_time->format('H:i d/m/Y'));
        }
        if ($now->gt($assignment->end_time)) {
            throw new AccessDeniedHttpException('Bài thi đã kết thúc thời gian làm bài.');
        }

        // 3. Kiểm tra xem có phiên thi nào đang IN_PROGRESS hay không (Khôi phục phiên)
        $existingAttempt = ExamAttempt::where('exam_assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->where('status', 'in_progress')
            ->first();

        if ($existingAttempt) {
            // Kiểm tra xem phiên đang dở có bị quá hạn không
            if ($existingAttempt->isExpired()) {
                // Tự động thu bài và chấm điểm
                $existingAttempt->update([
                    'status' => 'auto_submitted',
                    'submitted_at' => $existingAttempt->expires_at,
                ]);
                $this->gradingService->gradeAttempt($existingAttempt);
            } else {
                // Phiên còn hợp lệ -> Trả về dữ liệu phòng thi hiện tại
                return $this->buildExamRoomPayload($existingAttempt);
            }
        }

        // 4. Kiểm tra số lần thi đã thực hiện
        $completedAttemptsCount = ExamAttempt::where('exam_assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded', 'expired'])
            ->count();

        if ($completedAttemptsCount >= $assignment->max_attempts) {
            throw ValidationException::withMessages([
                'exam' => ['Bạn đã sử dụng hết số lần làm bài quy định (' . $assignment->max_attempts . ' lần).'],
            ]);
        }

        // 5. Khởi tạo lượt thi mới
        $exam = $assignment->exam()->with(['examQuestions.question.options'])->firstOrFail();
        $examQuestions = $exam->examQuestions->sortBy('order_index');

        // Snapshot thứ tự câu hỏi
        $questionIds = $examQuestions->pluck('question_id')->toArray();
        if ($exam->shuffle_questions) {
            shuffle($questionIds);
        }

        // Snapshot thứ tự phương án của từng câu (Không xáo trộn câu Đúng/Sai để giữ nguyên a, b, c, d)
        $optionOrderMap = [];
        foreach ($examQuestions as $eq) {
            $optIds = $eq->question->options->pluck('id')->toArray();
            if ($exam->shuffle_options && $eq->question->question_type !== 'true_false') {
                shuffle($optIds);
            }
            $optionOrderMap[$eq->question_id] = $optIds;
        }

        $startedAt = now();
        $maxExpire = $startedAt->copy()->addMinutes($exam->duration_minutes);
        $expiresAt = $maxExpire->lt($assignment->end_time) ? $maxExpire : $assignment->end_time;

        $newAttempt = ExamAttempt::create([
            'exam_assignment_id' => $assignment->id,
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'attempt_number' => $completedAttemptsCount + 1,
            'question_order' => $questionIds,
            'option_order' => $optionOrderMap,
            'started_at' => $startedAt,
            'expires_at' => $expiresAt,
            'status' => 'in_progress',
        ]);

        return $this->buildExamRoomPayload($newAttempt);
    }

    /**
     * Tự động lưu câu trả lời (Autosave)
     */
    public function saveAnswer(ExamAttempt $attempt, int $questionId, ?array $selectedOptionIds, ?string $textAnswer, bool $isFlagged): StudentAnswer
    {
        if (!$attempt->isInProgress()) {
            throw new AccessDeniedHttpException('Bài thi đã nộp hoặc không thể chỉnh sửa câu trả lời.');
        }

        if ($attempt->isExpired()) {
            $attempt->update([
                'status' => 'auto_submitted',
                'submitted_at' => $attempt->expires_at,
            ]);
            $this->gradingService->gradeAttempt($attempt);
            throw new AccessDeniedHttpException('Thời gian làm bài đã kết thúc. Bài thi đã được tự động nộp.');
        }

        // UPSERT vào student_answers
        return StudentAnswer::updateOrCreate(
            [
                'exam_attempt_id' => $attempt->id,
                'question_id' => $questionId,
            ],
            [
                'selected_option_ids' => $selectedOptionIds,
                'text_answer' => $textAnswer,
                'is_flagged' => $isFlagged,
                'saved_at' => now(),
            ]
        );
    }

    /**
     * Nộp bài thi
     */
    public function submitAttempt(ExamAttempt $attempt): array
    {
        return DB::transaction(function () use ($attempt) {
            $lockedAttempt = ExamAttempt::where('id', $attempt->id)->lockForUpdate()->firstOrFail();

            if (!$lockedAttempt->isInProgress()) {
                throw new AccessDeniedHttpException('Bài thi đã được nộp trước đó.');
            }

            $lockedAttempt->update([
                'status' => 'submitted',
                'submitted_at' => now(),
            ]);

            // Tiến hành chấm điểm ngay
            $gradedAttempt = $this->gradingService->gradeAttempt($lockedAttempt);

            return $this->buildAttemptResultPayload($gradedAttempt);
        });
    }

    /**
     * Xây dựng dữ liệu trả về cho phòng thi (BẢO MẬT: Giấu tuyệt đối is_correct & explanation)
     */
    public function buildExamRoomPayload(ExamAttempt $attempt): array
    {
        $exam = $attempt->exam;
        $questionIds = $attempt->question_order ?? [];
        $optionOrderMap = $attempt->option_order ?? [];

        // Lấy danh sách câu hỏi theo ID
        $questions = Question::with('options')->whereIn('id', $questionIds)->get()->keyBy('id');
        $examQuestions = ExamQuestion::where('exam_id', $exam->id)->get()->keyBy('question_id');

        // Sắp xếp lại danh sách câu hỏi theo đúng snapshot question_order
        $orderedQuestions = [];
        foreach ($questionIds as $qId) {
            if (!$questions->has($qId)) {
                continue;
            }
            $q = $questions->get($qId);
            $eq = $examQuestions->get($qId);

            // Sắp xếp lại options theo snapshot option_order
            $allOptions = $q->options->keyBy('id');
            $orderedOptions = [];
            $optIds = $optionOrderMap[$qId] ?? $allOptions->keys()->toArray();

            foreach ($optIds as $optId) {
                if ($allOptions->has($optId)) {
                    $opt = $allOptions->get($optId);
                    $orderedOptions[] = [
                        'id' => $opt->id,
                        'content' => $opt->content,
                        // BẢO MẬT: Tuyệt đối KHÔNG trả về is_correct
                    ];
                }
            }

            $orderedQuestions[] = [
                'id' => $q->id,
                'question_type' => $q->question_type,
                'difficulty_level' => $q->difficulty_level,
                'content' => $q->content,
                'points' => (float) ($eq ? $eq->points : $q->default_points),
                'options' => $orderedOptions,
                // BẢO MẬT: Tuyệt đối KHÔNG trả về explanation
            ];
        }

        // Lấy danh sách câu trả lời đã lưu
        $savedAnswers = StudentAnswer::where('exam_attempt_id', $attempt->id)->get()->map(function ($ans) {
            return [
                'question_id' => $ans->question_id,
                'selected_option_ids' => $ans->selected_option_ids,
                'text_answer' => $ans->text_answer,
                'is_flagged' => (bool) $ans->is_flagged,
            ];
        });

        return [
            'attempt_id' => $attempt->id,
            'exam_id' => $exam->id,
            'title' => $exam->title,
            'description' => $exam->description,
            'duration_minutes' => $exam->duration_minutes,
            'started_at' => $attempt->started_at->toISOString(),
            'expires_at' => $attempt->expires_at->toISOString(),
            'server_now' => now()->toISOString(),
            'total_questions' => count($orderedQuestions),
            'questions' => $orderedQuestions,
            'saved_answers' => $savedAnswers,
        ];
    }

    /**
     * Xây dựng dữ liệu kết quả thi theo chính sách bảo mật của Assignment
     */
    public function buildAttemptResultPayload(ExamAttempt $attempt): array
    {
        $assignment = $attempt->assignment;
        $now = now();

        $canViewScore = true;
        if ($assignment->view_score_type === 'after_closed' && $now->lt($assignment->end_time)) {
            $canViewScore = false;
        } elseif ($assignment->view_score_type === 'manual') {
            $canViewScore = false;
        }

        $canViewSolutions = false;
        if ($assignment->show_solutions) {
            if ($assignment->view_score_type === 'after_closed') {
                $canViewSolutions = $now->gte($assignment->end_time);
            } else {
                $canViewSolutions = true;
            }
        }

        $response = [
            'attempt_id' => $attempt->id,
            'exam_id' => $attempt->exam_id,
            'title' => $attempt->exam->title,
            'status' => $attempt->status,
            'submitted_at' => $attempt->submitted_at?->toISOString(),
            'can_view_score' => $canViewScore,
            'can_view_solutions' => $canViewSolutions,
        ];

        if ($canViewScore) {
            $response['score'] = (float) $attempt->score;
            $response['total_correct'] = $attempt->total_correct;
            $response['total_incorrect'] = $attempt->total_incorrect;
            $response['total_unanswered'] = $attempt->total_unanswered;
            $response['total_points'] = (float) $attempt->exam->total_points;
        } else {
            $response['message'] = 'Kết quả điểm số sẽ được công bố sau khi kỳ thi kết thúc.';
        }

        if ($canViewSolutions) {
            // Tải đáp án chi tiết và lời giải
            $questions = Question::with('options')->whereIn('id', $attempt->question_order ?? [])->get()->keyBy('id');
            $studentAnswers = StudentAnswer::where('exam_attempt_id', $attempt->id)->get()->keyBy('question_id');

            $detailedQuestions = [];
            foreach ($attempt->question_order ?? [] as $qId) {
                if (!$questions->has($qId)) {
                    continue;
                }
                $q = $questions->get($qId);
                $ans = $studentAnswers->get($qId);

                $detailedQuestions[] = [
                    'id' => $q->id,
                    'question_type' => $q->question_type,
                    'content' => $q->content,
                    'explanation' => $q->explanation,
                    'options' => $q->options->map(fn($o) => [
                        'id' => $o->id,
                        'content' => $o->content,
                        'is_correct' => (bool) $o->is_correct,
                    ]),
                    'student_selected_option_ids' => $ans?->selected_option_ids,
                    'student_text_answer' => $ans?->text_answer,
                    'is_correct' => $ans?->is_correct,
                    'earned_points' => (float) ($ans?->earned_points ?? 0),
                ];
            }
            $response['detailed_questions'] = $detailedQuestions;
        }

        return $response;
    }
}
