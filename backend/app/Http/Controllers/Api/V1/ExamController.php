<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Services\ExamMatrixService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    protected ExamMatrixService $matrixService;

    public function __construct(ExamMatrixService $matrixService)
    {
        $this->matrixService = $matrixService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Exam::with(['subject', 'grade', 'creator'])->withCount(['examQuestions', 'assignments', 'attempts']);

        if ($user->isTeacher()) {
            $query->where('creator_id', $user->id);
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', "%{$request->search}%")
                ->orWhere('code', 'like', "%{$request->search}%");
        }

        $exams = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $exams->items(),
            'meta' => [
                'current_page' => $exams->currentPage(),
                'last_page' => $exams->lastPage(),
                'per_page' => $exams->perPage(),
                'total' => $exams->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'grade_id' => 'nullable|exists:grades,id',
            'title' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:exams,code',
            'description' => 'nullable|string',
            'duration_minutes' => 'required|integer|min:5|max:300',
            'total_points' => 'nullable|numeric|min:1',
            'pass_points' => 'nullable|numeric|min:0',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'status' => ['nullable', Rule::in(['draft', 'published', 'closed'])],
            'question_ids' => 'nullable|array',
            'question_ids.*' => 'exists:questions,id',
            'matrix_levels' => 'nullable|array',
        ]);

        $validated['creator_id'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'published';
        $totalPoints = $validated['total_points'] ?? 10.0;

        $questionIds = $validated['question_ids'] ?? [];
        $matrixLevels = $validated['matrix_levels'] ?? null;
        unset($validated['question_ids'], $validated['matrix_levels']);

        $exam = DB::transaction(function () use ($validated, $questionIds, $matrixLevels, $totalPoints) {
            $exam = Exam::create($validated);

            // Gán câu hỏi chọn thủ công nếu có
            if (!empty($questionIds)) {
                $pointsPerQ = round($totalPoints / count($questionIds), 2);
                foreach ($questionIds as $index => $qId) {
                    ExamQuestion::create([
                        'exam_id' => $exam->id,
                        'question_id' => $qId,
                        'order_index' => $index + 1,
                        'points' => $pointsPerQ,
                    ]);
                }
            } elseif (!empty($matrixLevels)) {
                // Tự động bốc câu hỏi theo ma trận độ khó
                $this->matrixService->generateExamByMatrix($exam, [
                    'subject_id' => $exam->subject_id,
                    'levels' => $matrixLevels,
                ]);
            }

            return $exam;
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo đề thi thành công',
            'data' => $exam->load(['subject', 'grade', 'examQuestions']),
        ], 201);
    }

    public function show(Exam $exam): JsonResponse
    {
        $exam->load([
            'subject',
            'grade',
            'creator',
            'examQuestions.question.options',
            'assignments.schoolClass',
        ]);

        return response()->json([
            'success' => true,
            'data' => $exam,
        ]);
    }

    public function update(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $exam->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa đề thi này.'], 403);
        }

        // Không cho phép sửa nếu đã có thí sinh làm bài
        if ($exam->attempts()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Đề thi đã có học sinh làm bài, không thể thay đổi thông tin.'], 422);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'sometimes|integer|min:5|max:300',
            'total_points' => 'sometimes|numeric|min:1',
            'pass_points' => 'sometimes|numeric|min:0',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'status' => ['sometimes', Rule::in(['draft', 'published', 'closed', 'archived'])],
        ]);

        $exam->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật đề thi thành công',
            'data' => $exam,
        ]);
    }

    public function destroy(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $exam->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa đề thi này.'], 403);
        }

        if ($exam->attempts()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Đề thi đã có kết quả thi, không thể xóa.'], 422);
        }

        $exam->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa đề thi thành công',
        ]);
    }

    public function addQuestions(Request $request, Exam $exam): JsonResponse
    {
        if ($exam->attempts()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Đề thi đã có thí sinh làm bài, không thể thêm câu hỏi.'], 422);
        }

        $validated = $request->validate([
            'questions' => 'required|array|min:1',
            'questions.*.question_id' => 'required|exists:questions,id',
            'questions.*.points' => 'nullable|numeric|min:0.1',
        ]);

        DB::transaction(function () use ($exam, $validated) {
            $currentCount = $exam->examQuestions()->count();
            foreach ($validated['questions'] as $item) {
                ExamQuestion::updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'question_id' => $item['question_id'],
                    ],
                    [
                        'order_index' => ++$currentCount,
                        'points' => $item['points'] ?? 1.00,
                    ]
                );
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật danh sách câu hỏi vào đề thi',
            'data' => $exam->load('examQuestions.question'),
        ]);
    }

    public function generateByMatrix(Request $request, Exam $exam): JsonResponse
    {
        if ($exam->attempts()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Đề thi đã có học sinh làm bài, không thể tạo lại theo ma trận.'], 422);
        }

        $validated = $request->validate([
            'subject_id' => 'nullable|exists:subjects,id',
            'chapter_ids' => 'nullable|array',
            'chapter_ids.*' => 'exists:chapters,id',
            'levels' => 'required|array',
            'levels.1' => 'nullable|integer|min:0',
            'levels.2' => 'nullable|integer|min:0',
            'levels.3' => 'nullable|integer|min:0',
            'levels.4' => 'nullable|integer|min:0',
        ]);

        $updatedExam = $this->matrixService->generateExamByMatrix($exam, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã sinh câu hỏi vào đề thi theo ma trận thành công',
            'data' => $updatedExam,
        ]);
    }

    public function publish(Exam $exam): JsonResponse
    {
        if ($exam->examQuestions()->count() === 0) {
            return response()->json(['success' => false, 'message' => 'Đề thi chưa có câu hỏi nào, không thể xuất bản.'], 422);
        }

        $exam->update(['status' => 'published']);

        return response()->json([
            'success' => true,
            'message' => 'Xuất bản đề thi thành công',
            'data' => $exam,
        ]);
    }

    public function assign(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'class_ids' => 'nullable|array',
            'class_ids.*' => 'exists:classes,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:users,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'max_attempts' => 'nullable|integer|min:1|max:10',
            'view_score_type' => ['nullable', Rule::in(['immediately', 'after_closed', 'manual'])],
            'show_solutions' => 'boolean',
        ]);

        $assignedList = [];

        DB::transaction(function () use ($exam, $validated, $request, &$assignedList) {
            // Giao cho các lớp
            if (!empty($validated['class_ids'])) {
                foreach ($validated['class_ids'] as $classId) {
                    $assignment = ExamAssignment::create([
                        'exam_id' => $exam->id,
                        'class_id' => $classId,
                        'student_id' => null,
                        'assigned_by' => $request->user()->id,
                        'start_time' => $validated['start_time'],
                        'end_time' => $validated['end_time'],
                        'max_attempts' => $validated['max_attempts'] ?? 1,
                        'view_score_type' => $validated['view_score_type'] ?? 'immediately',
                        'show_solutions' => $validated['show_solutions'] ?? false,
                    ]);
                    $assignedList[] = $assignment;
                }
            }

            // Giao đích danh cho từng học sinh
            if (!empty($validated['student_ids'])) {
                foreach ($validated['student_ids'] as $studentId) {
                    $assignment = ExamAssignment::create([
                        'exam_id' => $exam->id,
                        'class_id' => null,
                        'student_id' => $studentId,
                        'assigned_by' => $request->user()->id,
                        'start_time' => $validated['start_time'],
                        'end_time' => $validated['end_time'],
                        'max_attempts' => $validated['max_attempts'] ?? 1,
                        'view_score_type' => $validated['view_score_type'] ?? 'immediately',
                        'show_solutions' => $validated['show_solutions'] ?? false,
                    ]);
                    $assignedList[] = $assignment;
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Giao đề thi thành công',
            'data' => $assignedList,
        ]);
    }

    public function quickCreate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'subject_id' => 'required|exists:subjects,id',
            'grade_id' => 'nullable|exists:grades,id',
            'duration_minutes' => 'required|integer|min:5|max:300',
            'total_points' => 'nullable|numeric|min:1',
            'pass_points' => 'nullable|numeric|min:0',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'description' => 'nullable|string',
            'save_to_bank' => 'boolean',
            'chapter_id' => 'nullable|exists:chapters,id',
            'questions' => 'required|array|min:1',
            'questions.*.content' => 'required|string',
            'questions.*.question_type' => 'nullable|string',
            'questions.*.difficulty_level' => 'nullable|integer|between:1,4',
            'questions.*.explanation' => 'nullable|string',
            'questions.*.points' => 'nullable|numeric',
            'questions.*.chapter_id' => 'nullable|exists:chapters,id',
            'questions.*.options' => 'required|array|min:1',
            'questions.*.options.*.content' => 'required|string',
            'questions.*.options.*.is_correct' => 'required|boolean',
            'assign_class_ids' => 'nullable|array',
            'assign_class_ids.*' => 'exists:classes,id',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
        ]);

        $user = $request->user();
        $code = !empty($validated['code']) 
            ? $validated['code'] 
            : 'DE_' . strtoupper(Str::slug($validated['title'], '')) . '_' . date('Ymd_His');

        $totalPoints = $validated['total_points'] ?? 10.0;
        $numQuestions = count($validated['questions']);
        $defaultPointsPerQ = $numQuestions > 0 ? round($totalPoints / $numQuestions, 2) : 1.0;

        $result = DB::transaction(function () use ($validated, $user, $code, $defaultPointsPerQ, $request) {
            // 1. Tạo Exam
            $exam = Exam::create([
                'creator_id' => $user->id,
                'subject_id' => $validated['subject_id'],
                'grade_id' => $validated['grade_id'] ?? null,
                'title' => $validated['title'],
                'code' => $code,
                'description' => $validated['description'] ?? null,
                'duration_minutes' => $validated['duration_minutes'],
                'total_points' => $validated['total_points'] ?? 10.0,
                'pass_points' => $validated['pass_points'] ?? 5.0,
                'shuffle_questions' => $validated['shuffle_questions'] ?? true,
                'shuffle_options' => $validated['shuffle_options'] ?? true,
                'status' => 'published',
            ]);

            // 2. Tạo từng Question & Options, rồi gắn vào ExamQuestion
            $saveToBank = $validated['save_to_bank'] ?? true;
            $globalChapterId = $validated['chapter_id'] ?? null;

            foreach ($validated['questions'] as $index => $qItem) {
                $questionType = $qItem['question_type'] ?? 'single_choice';
                $difficulty = $qItem['difficulty_level'] ?? 1;
                $points = $qItem['points'] ?? $defaultPointsPerQ;
                $chapterId = $qItem['chapter_id'] ?? $globalChapterId;

                $question = Question::create([
                    'creator_id' => $user->id,
                    'subject_id' => $validated['subject_id'],
                    'chapter_id' => $chapterId,
                    'question_type' => $questionType,
                    'difficulty_level' => $difficulty,
                    'content' => $qItem['content'],
                    'explanation' => $qItem['explanation'] ?? null,
                    'default_points' => $points,
                    'is_shared' => $saveToBank,
                    'status' => 'active',
                ]);

                foreach ($qItem['options'] as $optIdx => $opt) {
                    QuestionOption::create([
                        'question_id' => $question->id,
                        'content' => $opt['content'],
                        'is_correct' => (bool)$opt['is_correct'],
                        'order_index' => $optIdx + 1,
                    ]);
                }

                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $question->id,
                    'order_index' => $index + 1,
                    'points' => $points,
                ]);
            }

            // 3. Tự động giao đề cho các lớp nếu có
            if (!empty($validated['assign_class_ids'])) {
                $startTime = $validated['start_time'] ?? now();
                $endTime = $validated['end_time'] ?? now()->addDays(7);

                foreach ($validated['assign_class_ids'] as $classId) {
                    ExamAssignment::create([
                        'exam_id' => $exam->id,
                        'class_id' => $classId,
                        'student_id' => null,
                        'assigned_by' => $user->id,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'max_attempts' => 1,
                        'view_score_type' => 'immediately',
                        'show_solutions' => true,
                    ]);
                }
            }

            return $exam;
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo đề thi từ file thành công và đã đồng bộ vào ngân hàng câu hỏi.',
            'data' => $result->load(['subject', 'grade', 'examQuestions.question.options', 'assignments.schoolClass']),
        ], 201);
    }

    public function getShuffledOffline(Request $request, Exam $exam): JsonResponse
    {
        $numCodes = $request->integer('num_codes', 4);
        $startCode = $request->integer('start_code', 101);
        $shuffleQuestions = $request->boolean('shuffle_questions', true);
        $shuffleOptions = $request->boolean('shuffle_options', true);

        $exam->load(['subject', 'grade', 'examQuestions.question.options']);
        $rawQuestions = $exam->examQuestions->map(function ($eq) {
            return [
                'id' => $eq->question->id,
                'content' => $eq->question->content,
                'question_type' => $eq->question->question_type,
                'difficulty_level' => $eq->question->difficulty_level,
                'explanation' => $eq->question->explanation,
                'points' => $eq->points,
                'options' => $eq->question->options->map(function ($opt) {
                    return [
                        'id' => $opt->id,
                        'content' => $opt->content,
                        'is_correct' => (bool)$opt->is_correct,
                    ];
                })->toArray(),
            ];
        })->toArray();

        // Phân loại các câu hỏi vào 4 phần chuẩn Bộ GD&ĐT
        $categorize = function (array $questions) {
            $part1 = []; // Nhiều phương án lựa chọn (single_choice, multiple_choice)
            $part2 = []; // Đúng/Sai (true_false)
            $part3 = []; // Trả lời ngắn / điền khuyết (short_answer, fill_in_blank)
            $part4 = []; // Tự luận (essay)

            foreach ($questions as $q) {
                $type = $q['question_type'] ?? 'single_choice';
                if ($type === 'true_false') {
                    $part2[] = $q;
                } elseif (in_array($type, ['short_answer', 'fill_in_blank'])) {
                    $part3[] = $q;
                } elseif ($type === 'essay') {
                    $part4[] = $q;
                } else {
                    $part1[] = $q;
                }
            }

            return [
                'part1' => $part1,
                'part2' => $part2,
                'part3' => $part3,
                'part4' => $part4,
            ];
        };

        $categorized = $categorize($rawQuestions);
        $variants = [];
        $optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        $tfLabels = ['a', 'b', 'c', 'd'];

        for ($i = 0; $i < $numCodes; $i++) {
            $codeNum = $startCode + $i;
            $code = $codeNum < 100 ? str_pad($codeNum, 3, '0', STR_PAD_LEFT) : (string)$codeNum;
            
            // Xử lý từng phần
            $shuffledParts = [];
            $globalQNum = 1;
            $answerKey = [];

            // Helper format câu
            $processPart = function ($items, $isTF = false) use (&$globalQNum, &$answerKey, $shuffleQuestions, $shuffleOptions, $optionLabels, $tfLabels) {
                if ($shuffleQuestions) {
                    shuffle($items);
                }

                $processed = [];
                $partQNum = 1;
                foreach ($items as $item) {
                    $opts = $item['options'];
                    if ($shuffleOptions && count($opts) > 1 && !$isTF) {
                        shuffle($opts);
                    }

                    $formattedOpts = [];
                    $correctAnswer = '';
                    $tfAnswers = [];

                    foreach ($opts as $optIdx => $opt) {
                        $label = $isTF ? ($tfLabels[$optIdx] ?? chr(97 + $optIdx)) : ($optionLabels[$optIdx] ?? chr(65 + $optIdx));
                        $formattedOpts[] = [
                            'label' => $label,
                            'content' => $opt['content'],
                            'is_correct' => (bool)$opt['is_correct'],
                        ];

                        if ($isTF) {
                            $tfAnswers[] = $label . ': ' . ($opt['is_correct'] ? 'Đ' : 'S');
                        } elseif ($opt['is_correct']) {
                            $correctAnswer = $label;
                        }
                    }

                    if ($isTF) {
                        $correctAnswer = implode(', ', $tfAnswers);
                    } elseif (empty($correctAnswer) && !empty($opts[0])) {
                        // Trả lời ngắn: lấy nội dung đáp án đúng
                        foreach ($opts as $opt) {
                            if ($opt['is_correct']) {
                                $correctAnswer = $opt['content'];
                                break;
                            }
                        }
                    }

                    $answerKey[$globalQNum] = $correctAnswer;

                    $processed[] = [
                        'question_number' => $partQNum,
                        'global_number' => $globalQNum,
                        'original_id' => $item['id'],
                        'content' => $item['content'],
                        'question_type' => $item['question_type'],
                        'points' => $item['points'],
                        'explanation' => $item['explanation'] ?? '',
                        'options' => $formattedOpts,
                        'correct_answer' => $correctAnswer,
                    ];

                    $globalQNum++;
                    $partQNum++;
                }

                return $processed;
            };

            $shuffledParts['part1'] = [
                'title' => 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. (Thí sinh chọn 01 phương án đúng)',
                'questions' => $processPart($categorized['part1']),
            ];

            $shuffledParts['part2'] = [
                'title' => 'PHẦN II. Câu trắc nghiệm đúng sai. (Thí sinh chọn Đúng hoặc Sai cho mỗi ý a, b, c, d)',
                'questions' => $processPart($categorized['part2'], true),
            ];

            $shuffledParts['part3'] = [
                'title' => 'PHẦN III. Câu trắc nghiệm trả lời ngắn. (Thí sinh điền kết quả vào ô trả lời)',
                'questions' => $processPart($categorized['part3']),
            ];

            if (!empty($categorized['part4'])) {
                $shuffledParts['part4'] = [
                    'title' => 'PHẦN IV. Tự luận.',
                    'questions' => $processPart($categorized['part4']),
                ];
            }

            $variants[] = [
                'code' => $code,
                'parts' => $shuffledParts,
                'answer_key' => $answerKey,
            ];
        }

        // Tạo bảng ma trận đáp án 4 phần theo chuẩn Bộ GD&ĐT
        // 1. Phần 1 Matrix
        $part1Matrix = [];
        $p1Count = count($categorized['part1']);
        for ($qIdx = 1; $qIdx <= $p1Count; $qIdx++) {
            $rowAnswers = [];
            foreach ($variants as $v) {
                $qItem = $v['parts']['part1']['questions'][$qIdx - 1] ?? null;
                $rowAnswers[$v['code']] = $qItem['correct_answer'] ?? '-';
            }
            $part1Matrix[] = [
                'question_number' => $qIdx,
                'answers' => $rowAnswers,
            ];
        }

        // 2. Phần 2 Matrix (Lệnh hỏi a, b, c, d)
        $part2Matrix = [];
        $p2Count = count($categorized['part2']);
        for ($qIdx = 1; $qIdx <= $p2Count; $qIdx++) {
            foreach ($tfLabels as $optIdx => $label) {
                $rowAnswers = [];
                foreach ($variants as $v) {
                    $qItem = $v['parts']['part2']['questions'][$qIdx - 1] ?? null;
                    $opt = $qItem['options'][$optIdx] ?? null;
                    $rowAnswers[$v['code']] = ($opt && $opt['is_correct']) ? 'Đ' : 'S';
                }
                $part2Matrix[] = [
                    'question_number' => $qIdx,
                    'sub_label' => $label,
                    'answers' => $rowAnswers,
                ];
            }
        }

        // 3. Phần 3 Matrix
        $part3Matrix = [];
        $p3Count = count($categorized['part3']);
        for ($qIdx = 1; $qIdx <= $p3Count; $qIdx++) {
            $rowAnswers = [];
            foreach ($variants as $v) {
                $qItem = $v['parts']['part3']['questions'][$qIdx - 1] ?? null;
                $rowAnswers[$v['code']] = $qItem['correct_answer'] ?? '-';
            }
            $part3Matrix[] = [
                'question_number' => $qIdx,
                'answers' => $rowAnswers,
            ];
        }

        // 4. Phần 4 Matrix (Tự luận)
        $part4Matrix = [];
        $p4Count = count($categorized['part4']);
        for ($qIdx = 1; $qIdx <= $p4Count; $qIdx++) {
            $qItem = $categorized['part4'][$qIdx - 1] ?? null;
            $part4Matrix[] = [
                'question_number' => $qIdx,
                'content' => $qItem['explanation'] ?: ($qItem['content'] ?? 'Theo hướng dẫn chấm'),
                'points' => $qItem['points'] ?? 1.0,
            ];
        }

        // Bảng ma trận tổng hợp phẳng cũ (cho backward compatibility)
        $totalQuestionsCount = count($rawQuestions);
        $matrixRows = [];
        foreach ($variants as $v) {
            $matrixRows[] = [
                'code' => $v['code'],
                'answers' => $v['answer_key'],
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'exam_title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'subject_name' => $exam->subject->name ?? 'Môn học',
                'grade_name' => $exam->grade->name ?? '',
                'total_questions' => $totalQuestionsCount,
                'variants' => $variants,
                'answer_matrix' => [
                    'total_questions' => $totalQuestionsCount,
                    'rows' => $matrixRows,
                    'part1' => $part1Matrix,
                    'part2' => $part2Matrix,
                    'part3' => $part3Matrix,
                    'part4' => $part4Matrix,
                ],
            ],
        ]);
    }
}
