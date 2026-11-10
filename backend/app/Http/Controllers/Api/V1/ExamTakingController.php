<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExamAssignment;
use App\Models\ExamAttempt;
use App\Services\ExamAttemptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamTakingController extends Controller
{
    protected ExamAttemptService $attemptService;

    public function __construct(ExamAttemptService $attemptService)
    {
        $this->attemptService = $attemptService;
    }

    /**
     * Danh sách bài thi được giao cho Học sinh đang đăng nhập
     */
    public function getStudentExams(Request $request): JsonResponse
    {
        $student = $request->user();
        $enrolledClassIds = $student->enrolledClasses()->pluck('classes.id')->toArray();

        $assignments = ExamAssignment::with(['exam.subject'])
            ->where(function ($q) use ($student, $enrolledClassIds) {
                $q->whereIn('class_id', $enrolledClassIds)
                    ->orWhere('student_id', $student->id);
            })
            ->latest('start_time')
            ->get()
            ->map(function ($assignment) use ($student) {
                $now = now();
                $isUpcoming = $now->lt($assignment->start_time);
                $isExpired = $now->gt($assignment->end_time);
                $isOpen = !$isUpcoming && !$isExpired;

                $attempts = ExamAttempt::where('exam_assignment_id', $assignment->id)
                    ->where('student_id', $student->id)
                    ->get();

                $completedAttempts = $attempts->whereIn('status', ['submitted', 'auto_submitted', 'graded']);
                $inProgressAttempt = $attempts->firstWhere('status', 'in_progress');
                $latestCompleted = $completedAttempts->sortByDesc('id')->first();

                // Kiểm tra học sinh có được xem lời giải theo cấu hình giáo viên hay không
                $canViewSolutions = false;
                if ($assignment->show_solutions) {
                    if ($assignment->view_score_type === 'after_closed') {
                        $canViewSolutions = $now->gte($assignment->end_time);
                    } else {
                        $canViewSolutions = true;
                    }
                }

                return [
                    'assignment_id' => $assignment->id,
                    'exam_id' => $assignment->exam_id,
                    'title' => $assignment->exam->title,
                    'subject_name' => $assignment->exam->subject->name,
                    'duration_minutes' => $assignment->exam->duration_minutes,
                    'total_points' => (float) $assignment->exam->total_points,
                    'start_time' => $assignment->start_time->toISOString(),
                    'end_time' => $assignment->end_time->toISOString(),
                    'max_attempts' => $assignment->max_attempts,
                    'completed_attempts_count' => $completedAttempts->count(),
                    'has_in_progress_attempt' => $inProgressAttempt !== null,
                    'in_progress_attempt_id' => $inProgressAttempt?->id,
                    'latest_attempt_id' => $latestCompleted?->id,
                    'can_view_solutions' => $canViewSolutions,
                    'show_solutions' => (bool) $assignment->show_solutions,
                    'view_score_type' => $assignment->view_score_type,
                    'status_label' => $isUpcoming ? 'upcoming' : ($isOpen ? 'open' : 'closed'),
                    'latest_score' => $latestCompleted?->score,
                    'best_score' => $completedAttempts->max('score'),
                    'attempts' => $completedAttempts->sortByDesc('id')->map(function ($att) {
                        return [
                            'id' => $att->id,
                            'attempt_number' => $att->attempt_number,
                            'score' => (float) $att->score,
                            'submitted_at' => $att->submitted_at?->toISOString(),
                        ];
                    })->values()->toArray(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $assignments,
        ]);
    }

    /**
     * Bắt đầu hoặc tiếp tục làm bài thi
     */
    public function startExam(Request $request, ExamAssignment $assignment): JsonResponse
    {
        $payload = $this->attemptService->startAttempt($request->user(), $assignment);

        return response()->json([
            'success' => true,
            'message' => 'Bắt đầu phòng thi thành công',
            'data' => $payload,
        ]);
    }

    /**
     * Lấy thông tin phòng thi của phiên hiện tại
     */
    public function getAttempt(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $attempt->student_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập lượt thi này.'], 403);
        }

        $payload = $this->attemptService->buildExamRoomPayload($attempt);

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * Autosave câu trả lời khi thí sinh chọn đáp án
     */
    public function saveAnswer(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        if ($attempt->student_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền lưu câu trả lời cho lượt thi này.'], 403);
        }

        $validated = $request->validate([
            'question_id' => 'required|exists:questions,id',
            'selected_option_ids' => 'nullable|array',
            'text_answer' => 'nullable|string',
            'is_flagged' => 'boolean',
        ]);

        $answer = $this->attemptService->saveAnswer(
            $attempt,
            $validated['question_id'],
            $validated['selected_option_ids'] ?? null,
            $validated['text_answer'] ?? null,
            $validated['is_flagged'] ?? false
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã lưu câu trả lời',
            'data' => [
                'question_id' => $answer->question_id,
                'saved_at' => $answer->saved_at->toISOString(),
            ],
        ]);
    }

    /**
     * Nộp bài thi chính thức
     */
    public function submitExam(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        if ($attempt->student_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền nộp lượt thi này.'], 403);
        }

        $result = $this->attemptService->submitAttempt($attempt);

        return response()->json([
            'success' => true,
            'message' => 'Nộp bài thi thành công',
            'data' => $result,
        ]);
    }

    /**
     * Xem kết quả bài thi
     */
    public function getResult(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        // Cho phép thí sinh của bài thi, giáo viên tạo đề hoặc admin xem
        if (!$user->isSuperAdmin() && $attempt->student_id !== $user->id && $attempt->exam->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem kết quả này.'], 403);
        }

        $result = $this->attemptService->buildAttemptResultPayload($attempt);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
