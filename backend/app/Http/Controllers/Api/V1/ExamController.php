<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamAssignment;
use App\Models\ExamQuestion;
use App\Services\ExamMatrixService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
}
