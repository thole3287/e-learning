<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\TeacherClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = SchoolClass::with(['grade', 'academicYear', 'homeroomTeacher'])->withCount('students');

        if ($user->isTeacher()) {
            // Giáo viên chỉ xem các lớp được phân công dạy hoặc chủ nhiệm
            $assignedClassIds = TeacherClass::where('teacher_id', $user->id)->pluck('class_id')->toArray();
            $query->where(function ($q) use ($user, $assignedClassIds) {
                $q->whereIn('id', $assignedClassIds)
                    ->orWhere('homeroom_teacher_id', $user->id);
            });
        }

        if ($request->filled('grade_id')) {
            $query->where('grade_id', $request->grade_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('code', 'like', "%{$request->search}%");
        }

        $classes = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $classes->items(),
            'meta' => [
                'current_page' => $classes->currentPage(),
                'last_page' => $classes->lastPage(),
                'per_page' => $classes->perPage(),
                'total' => $classes->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => 'required|exists:schools,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'grade_id' => 'required|exists:grades,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50',
        ]);

        $class = SchoolClass::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo lớp học thành công',
            'data' => $class->load(['grade', 'academicYear', 'homeroomTeacher']),
        ], 201);
    }

    public function show(SchoolClass $class): JsonResponse
    {
        $class->load([
            'grade',
            'academicYear',
            'homeroomTeacher',
            'students',
            'teacherClasses.teacher',
            'teacherClasses.subject',
        ]);

        return response()->json([
            'success' => true,
            'data' => $class,
        ]);
    }

    public function update(Request $request, SchoolClass $class): JsonResponse
    {
        $validated = $request->validate([
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'name' => 'sometimes|string|max:100',
            'code' => 'sometimes|string|max:50',
        ]);

        $class->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin lớp học thành công',
            'data' => $class->load(['grade', 'academicYear', 'homeroomTeacher']),
        ]);
    }

    public function addStudents(Request $request, SchoolClass $class): JsonResponse
    {
        $validated = $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:users,id',
        ]);

        foreach ($validated['student_ids'] as $studentId) {
            $class->students()->syncWithoutDetaching([
                $studentId => [
                    'enrolled_at' => now(),
                    'status' => 'active',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã thêm học sinh vào lớp học thành công',
        ]);
    }

    public function removeStudent(SchoolClass $class, User $student): JsonResponse
    {
        $class->students()->detach($student->id);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa học sinh khỏi lớp học',
        ]);
    }

    public function assignTeacher(Request $request, SchoolClass $class): JsonResponse
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
        ]);

        $teacherClass = TeacherClass::updateOrCreate(
            [
                'teacher_id' => $validated['teacher_id'],
                'class_id' => $class->id,
                'subject_id' => $validated['subject_id'],
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Phân công giáo viên bộ môn thành công',
            'data' => $teacherClass->load(['teacher', 'subject']),
        ]);
    }
}
