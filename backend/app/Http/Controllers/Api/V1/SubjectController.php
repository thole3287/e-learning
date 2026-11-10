<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Grade;
use App\Models\Lesson;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(): JsonResponse
    {
        $subjects = Subject::withCount(['questions', 'exams'])->get();

        return response()->json([
            'success' => true,
            'data' => $subjects,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:subjects,code',
            'description' => 'nullable|string',
        ]);

        $subject = Subject::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo môn học thành công',
            'data' => $subject,
        ], 201);
    }

    public function show(Subject $subject): JsonResponse
    {
        $subject->load(['chapters.lessons']);

        return response()->json([
            'success' => true,
            'data' => $subject,
        ]);
    }

    public function getChapters(Subject $subject, Request $request): JsonResponse
    {
        $query = $subject->chapters()->with('lessons');

        if ($request->filled('grade_id')) {
            $query->where('grade_id', $request->grade_id);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function storeChapter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'grade_id' => 'nullable|exists:grades,id',
            'name' => 'required|string|max:255',
            'order_index' => 'nullable|integer',
        ]);

        $chapter = Chapter::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo chương học thành công',
            'data' => $chapter,
        ], 201);
    }

    public function storeLesson(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'chapter_id' => 'required|exists:chapters,id',
            'name' => 'required|string|max:255',
            'order_index' => 'nullable|integer',
        ]);

        $lesson = Lesson::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo bài học thành công',
            'data' => $lesson,
        ], 201);
    }
}
