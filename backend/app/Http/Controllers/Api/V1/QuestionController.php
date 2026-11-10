<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Question::with(['subject', 'chapter', 'lesson', 'options', 'creator']);

        // Phân quyền câu hỏi: Giáo viên xem câu hỏi của mình hoặc câu hỏi chia sẻ chung
        if ($user->isTeacher()) {
            $query->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                    ->orWhere('is_shared', true);
            });
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('chapter_id')) {
            $query->where('chapter_id', $request->chapter_id);
        }

        if ($request->filled('difficulty_level')) {
            $query->where('difficulty_level', $request->difficulty_level);
        }

        if ($request->filled('question_type')) {
            $query->where('question_type', $request->question_type);
        }

        if ($request->filled('search')) {
            $query->where('content', 'like', "%{$request->search}%");
        }

        $questions = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $questions->items(),
            'meta' => [
                'current_page' => $questions->currentPage(),
                'last_page' => $questions->lastPage(),
                'per_page' => $questions->perPage(),
                'total' => $questions->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'chapter_id' => 'nullable|exists:chapters,id',
            'lesson_id' => 'nullable|exists:lessons,id',
            'question_type' => ['required', Rule::in(['single_choice', 'multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'])],
            'difficulty_level' => 'required|integer|between:1,4',
            'content' => 'required|string',
            'explanation' => 'nullable|string',
            'default_points' => 'nullable|numeric|min:0.1',
            'is_shared' => 'boolean',
            'options' => 'required|array|min:1',
            'options.*.content' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
        ]);

        $question = DB::transaction(function () use ($validated, $request) {
            $question = Question::create([
                'creator_id' => $request->user()->id,
                'subject_id' => $validated['subject_id'],
                'chapter_id' => $validated['chapter_id'] ?? null,
                'lesson_id' => $validated['lesson_id'] ?? null,
                'question_type' => $validated['question_type'],
                'difficulty_level' => $validated['difficulty_level'],
                'content' => $validated['content'],
                'explanation' => $validated['explanation'] ?? null,
                'default_points' => $validated['default_points'] ?? 1.00,
                'is_shared' => $validated['is_shared'] ?? false,
                'status' => 'active',
            ]);

            foreach ($validated['options'] as $index => $optionData) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'content' => $optionData['content'],
                    'is_correct' => $optionData['is_correct'],
                    'order_index' => $index + 1,
                ]);
            }

            return $question->load(['options', 'subject', 'chapter']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo câu hỏi mới thành công',
            'data' => $question,
        ], 201);
    }

    public function show(Question $question): JsonResponse
    {
        $question->load(['subject', 'chapter', 'lesson', 'options', 'creator']);

        return response()->json([
            'success' => true,
            'data' => $question,
        ]);
    }

    public function update(Request $request, Question $question): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $question->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền sửa câu hỏi này.'], 403);
        }

        $validated = $request->validate([
            'subject_id' => 'sometimes|exists:subjects,id',
            'chapter_id' => 'nullable|exists:chapters,id',
            'lesson_id' => 'nullable|exists:lessons,id',
            'difficulty_level' => 'sometimes|integer|between:1,4',
            'content' => 'sometimes|string',
            'explanation' => 'nullable|string',
            'default_points' => 'nullable|numeric|min:0.1',
            'is_shared' => 'boolean',
            'options' => 'sometimes|array|min:1',
            'options.*.content' => 'required_with:options|string',
            'options.*.is_correct' => 'required_with:options|boolean',
        ]);

        DB::transaction(function () use ($question, $validated) {
            $question->update($validated);

            if (isset($validated['options'])) {
                $question->options()->delete();
                foreach ($validated['options'] as $index => $optionData) {
                    QuestionOption::create([
                        'question_id' => $question->id,
                        'content' => $optionData['content'],
                        'is_correct' => $optionData['is_correct'],
                        'order_index' => $index + 1,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật câu hỏi thành công',
            'data' => $question->load('options'),
        ]);
    }

    public function destroy(Request $request, Question $question): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $question->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa câu hỏi này.'], 403);
        }

        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa câu hỏi thành công',
        ]);
    }

    public function duplicate(Question $question, Request $request): JsonResponse
    {
        $newQuestion = DB::transaction(function () use ($question, $request) {
            $clone = $question->replicate();
            $clone->creator_id = $request->user()->id;
            $clone->content = $clone->content . ' (Bản sao)';
            $clone->save();

            foreach ($question->options as $opt) {
                $optClone = $opt->replicate();
                $optClone->question_id = $clone->id;
                $optClone->save();
            }

            return $clone->load('options');
        });

        return response()->json([
            'success' => true,
            'message' => 'Nhân bản câu hỏi thành công',
            'data' => $newQuestion,
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'chapter_id' => 'nullable|exists:chapters,id',
            'questions' => 'required|array|min:1',
            'questions.*.content' => 'required|string',
            'questions.*.question_type' => ['nullable', Rule::in(['single_choice', 'multiple_choice', 'true_false', 'fill_in_blank'])],
            'questions.*.difficulty_level' => 'nullable|integer|between:1,4',
            'questions.*.explanation' => 'nullable|string',
            'questions.*.options' => 'required|array|min:1',
            'questions.*.options.*.content' => 'required|string',
            'questions.*.options.*.is_correct' => 'required|boolean',
        ]);

        $createdQuestions = [];

        DB::transaction(function () use ($validated, $request, &$createdQuestions) {
            foreach ($validated['questions'] as $qData) {
                $question = Question::create([
                    'creator_id' => $request->user()->id,
                    'subject_id' => $validated['subject_id'],
                    'chapter_id' => $validated['chapter_id'] ?? null,
                    'question_type' => $qData['question_type'] ?? 'single_choice',
                    'difficulty_level' => $qData['difficulty_level'] ?? 1,
                    'content' => $qData['content'],
                    'explanation' => $qData['explanation'] ?? null,
                    'default_points' => 1.00,
                    'is_shared' => false,
                    'status' => 'active',
                ]);

                foreach ($qData['options'] as $index => $opt) {
                    QuestionOption::create([
                        'question_id' => $question->id,
                        'content' => $opt['content'],
                        'is_correct' => (bool)$opt['is_correct'],
                        'order_index' => $index + 1,
                    ]);
                }

                $createdQuestions[] = $question;
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã import thành công ' . count($createdQuestions) . ' câu hỏi vào ngân hàng đề.',
            'count' => count($createdQuestions),
        ], 201);
    }
}
