<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\PracticeAnswer;
use App\Models\PracticeSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\Subject;
use App\Models\User;
use App\Services\ExamGradingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PracticeController extends Controller
{
    public function __construct(
        protected ExamGradingService $gradingService
    ) {}

    /**
     * Lấy thông tin ma trận câu hỏi có sẵn theo Chương và Mức độ nhận thức
     */
    public function getMatrixInfo(Request $request): JsonResponse
    {
        $subjectId = $request->integer('subject_id', 3); // Mặc định Hóa học hoặc Toán
        $subject = Subject::find($subjectId) ?? Subject::first();

        if (!$subject) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy môn học.'], 404);
        }

        // Lấy danh sách chương của môn học
        $chapters = Chapter::where('subject_id', $subject->id)
            ->orderBy('order_index')
            ->get();

        $chapterData = [];
        $totalByLevel = [1 => 0, 2 => 0, 3 => 0, 4 => 0];

        foreach ($chapters as $chapter) {
            $questions = Question::where('chapter_id', $chapter->id)->get(['id', 'difficulty_level']);
            $levelCounts = [
                1 => $questions->where('difficulty_level', 1)->count(),
                2 => $questions->where('difficulty_level', 2)->count(),
                3 => $questions->where('difficulty_level', 3)->count(),
                4 => $questions->where('difficulty_level', 4)->count(),
            ];

            foreach ($levelCounts as $lvl => $cnt) {
                $totalByLevel[$lvl] += $cnt;
            }

            $chapterData[] = [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'order_index' => $chapter->order_index,
                'total_questions' => $questions->count(),
                'level_counts' => $levelCounts,
            ];
        }

        // Kiểm tra xem có câu hỏi chưa gán chương không
        $unassigned = Question::where('subject_id', $subject->id)->whereNull('chapter_id')->get(['id', 'difficulty_level']);
        if ($unassigned->count() > 0) {
            $levelCounts = [
                1 => $unassigned->where('difficulty_level', 1)->count(),
                2 => $unassigned->where('difficulty_level', 2)->count(),
                3 => $unassigned->where('difficulty_level', 3)->count(),
                4 => $unassigned->where('difficulty_level', 4)->count(),
            ];
            foreach ($levelCounts as $lvl => $cnt) {
                $totalByLevel[$lvl] += $cnt;
            }
            $chapterData[] = [
                'id' => 0,
                'name' => 'Chủ đề tổng hợp / Khác',
                'order_index' => 999,
                'total_questions' => $unassigned->count(),
                'level_counts' => $levelCounts,
            ];
        }

        $allSubjectQuestions = Question::where('subject_id', $subject->id)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'subject' => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                ],
                'chapters' => $chapterData,
                'total_available_questions' => $allSubjectQuestions,
                'total_by_level' => $totalByLevel,
            ],
        ]);
    }

    /**
     * Bắt đầu một phiên Tự Ôn Luyện
     */
    public function start(Request $request): JsonResponse
    {
        $user = $request->user();
        $subjectId = $request->integer('subject_id', 3);
        $subject = Subject::findOrFail($subjectId);

        $chapterIds = $request->input('chapter_ids', []);
        $matrix = $request->input('matrix', []);
        $mode = $request->input('mode', 'interactive'); // 'exam' hoặc 'interactive'
        $durationMinutes = $request->integer('duration_minutes', 0); // 0 = không giới hạn

        // Lọc câu hỏi theo môn và chương đã chọn
        $query = Question::where('subject_id', $subjectId);
        if (!empty($chapterIds) && is_array($chapterIds)) {
            $hasUnassigned = in_array(0, $chapterIds);
            $validChapterIds = array_filter($chapterIds, fn($id) => $id > 0);

            $query->where(function ($q) use ($validChapterIds, $hasUnassigned) {
                if (!empty($validChapterIds)) {
                    $q->whereIn('chapter_id', $validChapterIds);
                }
                if ($hasUnassigned) {
                    $q->orWhereNull('chapter_id');
                }
            });
        }

        $allQuestions = $query->with('options')->get();

        // Bốc câu hỏi theo ma trận nhận thức
        $selectedQuestionIds = [];
        $hasMatrixSelection = false;

        for ($lvl = 1; $lvl <= 4; $lvl++) {
            $reqCount = intval($matrix["level{$lvl}"] ?? 0);
            if ($reqCount > 0) {
                $hasMatrixSelection = true;
                $levelPool = $allQuestions->where('difficulty_level', $lvl)->pluck('id')->all();
                shuffle($levelPool);
                $picked = array_slice($levelPool, 0, $reqCount);
                $selectedQuestionIds = array_merge($selectedQuestionIds, $picked);
            }
        }

        // Nếu người dùng không tick số câu chi tiết, mặc định bốc 10 câu ngẫu nhiên từ các chương đã chọn
        if (!$hasMatrixSelection || empty($selectedQuestionIds)) {
            $allPool = $allQuestions->pluck('id')->all();
            shuffle($allPool);
            $selectedQuestionIds = array_slice($allPool, 0, min(10, count($allPool)));
        }

        if (empty($selectedQuestionIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy câu hỏi phù hợp với các chương và mức độ đã chọn.',
            ], 422);
        }

        // Xáo trộn thứ tự câu hỏi
        shuffle($selectedQuestionIds);

        // Tạo snapshot thứ tự options
        $optionOrderMap = [];
        $questions = Question::with('options')->whereIn('id', $selectedQuestionIds)->get()->keyBy('id');

        foreach ($selectedQuestionIds as $qId) {
            if ($questions->has($qId)) {
                $q = $questions->get($qId);
                $optIds = $q->options->pluck('id')->all();
                shuffle($optIds);
                $optionOrderMap[$qId] = $optIds;
            }
        }

        $session = PracticeSession::create([
            'student_id' => $user->id,
            'subject_id' => $subject->id,
            'title' => "Tự ôn luyện {$subject->name} (" . count($selectedQuestionIds) . " câu)",
            'selected_chapter_ids' => $chapterIds,
            'matrix_config' => $matrix,
            'question_order' => $selectedQuestionIds,
            'option_order' => $optionOrderMap,
            'duration_minutes' => $durationMinutes,
            'mode' => $mode,
            'total_questions' => count($selectedQuestionIds),
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Khởi tạo phiên tự ôn luyện thành công.',
            'data' => $this->formatSessionPayload($session),
        ]);
    }

    /**
     * Lấy chi tiết phòng ôn luyện
     */
    public function show(Request $request, PracticeSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->student_id !== $user->id && !$user->isTeacher() && !$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập phiên ôn luyện này.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatSessionPayload($session, true),
        ]);
    }

    /**
     * Lưu câu trả lời của học sinh (Hỗ trợ chế độ tương tác hiện giải thích ngay)
     */
    public function saveAnswer(Request $request, PracticeSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->student_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền làm bài trên phiên này.'], 403);
        }

        if ($session->status === 'completed') {
            return response()->json(['success' => false, 'message' => 'Phiên ôn luyện này đã kết thúc.'], 422);
        }

        $questionId = $request->integer('question_id');
        $selectedOptionIds = $request->input('selected_option_ids');
        $textAnswer = $request->input('text_answer');

        $question = Question::with('options')->findOrFail($questionId);

        // Tạo mock StudentAnswer để dùng lại hàm evaluateQuestion chuẩn
        $mockAnswer = new StudentAnswer([
            'question_id' => $questionId,
            'selected_option_ids' => $selectedOptionIds,
            'text_answer' => $textAnswer,
        ]);

        $eval = $this->gradingService->evaluateQuestion($question, $mockAnswer, 1.0);
        $isCorrect = $eval['is_correct'];

        $answer = PracticeAnswer::updateOrCreate(
            [
                'practice_session_id' => $session->id,
                'question_id' => $questionId,
            ],
            [
                'selected_option_ids' => $selectedOptionIds,
                'text_answer' => $textAnswer,
                'is_correct' => $isCorrect,
            ]
        );

        $responseData = [
            'saved' => true,
            'is_correct' => $isCorrect,
        ];

        // Nếu ở chế độ tương tác (interactive), trả về luôn giải thích và đáp án chuẩn
        if ($session->mode === 'interactive') {
            $responseData['explanation'] = $question->explanation;
            $responseData['correct_options'] = $question->options->where('is_correct', true)->values();
        }

        return response()->json([
            'success' => true,
            'data' => $responseData,
        ]);
    }

    /**
     * Nộp bài và chấm điểm phiên ôn luyện
     */
    public function submit(Request $request, PracticeSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->student_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền nộp bài này.'], 403);
        }

        if ($session->status === 'completed') {
            return response()->json([
                'success' => true,
                'message' => 'Phiên ôn luyện đã được nộp trước đó.',
                'data' => $this->formatSessionPayload($session, true),
            ]);
        }

        $questionIds = $session->question_order ?? [];
        $questions = Question::with('options')->whereIn('id', $questionIds)->get()->keyBy('id');
        $savedAnswers = PracticeAnswer::where('practice_session_id', $session->id)->get()->keyBy('question_id');

        $totalCorrect = 0;
        $totalIncorrect = 0;
        $totalUnanswered = 0;

        foreach ($questionIds as $qId) {
            if (!$questions->has($qId)) continue;
            $q = $questions->get($qId);
            $ans = $savedAnswers->get($qId);

            if (!$ans || ($ans->selected_option_ids === null && empty(trim($ans->text_answer ?? '')))) {
                $totalUnanswered++;
                PracticeAnswer::updateOrCreate(
                    ['practice_session_id' => $session->id, 'question_id' => $qId],
                    ['is_correct' => false]
                );
                continue;
            }

            $mockAnswer = new StudentAnswer([
                'question_id' => $qId,
                'selected_option_ids' => $ans->selected_option_ids,
                'text_answer' => $ans->text_answer,
            ]);

            $eval = $this->gradingService->evaluateQuestion($q, $mockAnswer, 1.0);
            $ans->update(['is_correct' => $eval['is_correct']]);

            if ($eval['is_correct']) {
                $totalCorrect++;
            } else {
                $totalIncorrect++;
            }
        }

        $totalQuestions = count($questionIds);
        $score = $totalQuestions > 0 ? round(($totalCorrect / $totalQuestions) * 10, 2) : 0.00;

        $session->update([
            'status' => 'completed',
            'score' => $score,
            'total_correct' => $totalCorrect,
            'total_incorrect' => $totalIncorrect,
            'total_unanswered' => $totalUnanswered,
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hoàn thành phiên tự ôn luyện!',
            'data' => $this->formatSessionPayload($session->fresh(), true),
        ]);
    }

    /**
     * Lịch sử tự ôn luyện của học sinh
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $history = PracticeSession::with(['subject'])
            ->where('student_id', $user->id)
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $history->items(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    /**
     * DÀNH CHO GIÁO VIÊN: Xem tổng quan kết quả tự ôn tập của học sinh trong các lớp
     */
    public function teacherOverview(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isTeacher() && !$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập.'], 403);
        }

        $query = PracticeSession::with(['student.enrolledClasses', 'subject'])
            ->where('status', 'completed');

        // Lọc theo lớp học nếu giáo viên chọn
        if ($request->filled('class_id')) {
            $classId = $request->integer('class_id');
            $query->whereHas('student.enrolledClasses', function ($q) use ($classId) {
                $q->where('classes.id', $classId);
            });
        } elseif ($user->isTeacher() && !$user->isSuperAdmin()) {
            // Giới hạn giáo viên chỉ xem học sinh thuộc các lớp mình phụ trách
            $teacherClassIds = DB::table('teacher_classes')
                ->where('teacher_id', $user->id)
                ->pluck('class_id')
                ->all();

            $query->whereHas('student.enrolledClasses', function ($q) use ($teacherClassIds) {
                $q->whereIn('classes.id', $teacherClassIds);
            });
        }

        // Lọc theo môn học
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->integer('subject_id'));
        }

        // Lọc theo học sinh cụ thể
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->integer('student_id'));
        }

        // Thống kê tổng hợp
        $totalSessions = (clone $query)->count();
        $avgScore = (clone $query)->avg('score');
        $uniqueStudentsCount = (clone $query)->distinct('student_id')->count('student_id');

        $sessions = $query->latest('completed_at')->paginate($request->integer('per_page', 20));

        $formattedSessions = collect($sessions->items())->map(function ($s) {
            $firstClass = $s->student?->enrolledClasses?->first();
            return [
                'id' => $s->id,
                'student_id' => $s->student_id,
                'student_name' => $s->student?->full_name ?? $s->student?->username,
                'student_email' => $s->student?->email,
                'class_name' => $firstClass ? $firstClass->name : 'Chưa xếp lớp',
                'subject_name' => $s->subject?->name ?? 'Môn học',
                'title' => $s->title,
                'score' => (float) $s->score,
                'total_questions' => $s->total_questions,
                'total_correct' => $s->total_correct,
                'total_incorrect' => $s->total_incorrect,
                'mode' => $s->mode,
                'completed_at' => $s->completed_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_sessions' => $totalSessions,
                    'average_score' => round($avgScore ?? 0, 2),
                    'active_students_count' => $uniqueStudentsCount,
                ],
                'sessions' => $formattedSessions,
                'meta' => [
                    'current_page' => $sessions->currentPage(),
                    'last_page' => $sessions->lastPage(),
                    'total' => $sessions->total(),
                ],
            ],
        ]);
    }

    /**
     * DÀNH CHO GIÁO VIÊN: Xem chi tiết bài tự ôn luyện của học sinh
     */
    public function teacherSessionDetail(Request $request, PracticeSession $session): JsonResponse
    {
        $user = $request->user();
        if (!$user->isTeacher() && !$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền truy cập.'], 403);
        }

        $session->load(['student.enrolledClasses', 'subject']);
        $payload = $this->formatSessionPayload($session, true);
        $firstClass = $session->student?->enrolledClasses?->first();

        $payload['student'] = [
            'id' => $session->student_id,
            'name' => $session->student?->full_name ?? $session->student?->username,
            'class_name' => $firstClass ? $firstClass->name : 'Chưa xếp lớp',
        ];

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * Định dạng dữ liệu trả về cho phiên ôn luyện
     */
    protected function formatSessionPayload(PracticeSession $session, bool $includeDetails = false): array
    {
        $questionIds = $session->question_order ?? [];
        $optionOrderMap = $session->option_order ?? [];

        $questions = Question::with('options')->whereIn('id', $questionIds)->get()->keyBy('id');
        $savedAnswers = PracticeAnswer::where('practice_session_id', $session->id)->get()->keyBy('question_id');

        $isCompleted = ($session->status === 'completed');
        $isInteractive = ($session->mode === 'interactive');

        $orderedQuestions = [];
        foreach ($questionIds as $qId) {
            if (!$questions->has($qId)) continue;
            $q = $questions->get($qId);
            $ans = $savedAnswers->get($qId);

            $allOptions = $q->options->keyBy('id');
            $optIds = $optionOrderMap[$qId] ?? $allOptions->keys()->toArray();

            $orderedOptions = [];
            foreach ($optIds as $optId) {
                if ($allOptions->has($optId)) {
                    $opt = $allOptions->get($optId);
                    $optData = [
                        'id' => $opt->id,
                        'content' => $opt->content,
                    ];
                    // Nếu đã hoàn thành hoặc interactive (và đã trả lời câu này), cho phép xem is_correct
                    if ($isCompleted || ($isInteractive && $ans !== null)) {
                        $optData['is_correct'] = (bool) $opt->is_correct;
                    }
                    $orderedOptions[] = $optData;
                }
            }

            $qItem = [
                'id' => $q->id,
                'question_type' => $q->question_type,
                'difficulty_level' => $q->difficulty_level,
                'content' => $q->content,
                'options' => $orderedOptions,
                'student_selected_option_ids' => $ans?->selected_option_ids,
                'student_text_answer' => $ans?->text_answer,
                'is_correct' => $ans?->is_correct,
            ];

            if ($isCompleted || ($isInteractive && $ans !== null)) {
                $qItem['explanation'] = $q->explanation;
            }

            $orderedQuestions[] = $qItem;
        }

        return [
            'id' => $session->id,
            'title' => $session->title,
            'subject_id' => $session->subject_id,
            'subject_name' => $session->subject?->name ?? 'Môn học',
            'duration_minutes' => $session->duration_minutes,
            'mode' => $session->mode,
            'status' => $session->status,
            'score' => $session->score,
            'total_questions' => $session->total_questions,
            'total_correct' => $session->total_correct,
            'total_incorrect' => $session->total_incorrect,
            'total_unanswered' => $session->total_unanswered,
            'started_at' => $session->started_at?->toISOString(),
            'completed_at' => $session->completed_at?->toISOString(),
            'questions' => $orderedQuestions,
        ];
    }
}
