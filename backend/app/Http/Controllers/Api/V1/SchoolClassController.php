<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeacherClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SchoolClassController extends Controller
{
    public function getGrades(): JsonResponse
    {
        $grades = Grade::orderBy('level', 'asc')->get();
        return response()->json([
            'success' => true,
            'data' => $grades,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = SchoolClass::with(['grade', 'academicYear', 'homeroomTeacher'])->withCount('students');

        if ($user->isTeacher()) {
            // Giáo viên xem các lớp được phân công dạy hoặc chủ nhiệm hoặc do chính mình tạo
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

        $perPage = $request->integer('per_page', 50);
        $classes = $query->latest('id')->paginate($perPage);

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
        $user = $request->user();

        $validated = $request->validate([
            'school_id' => 'nullable|exists:schools,id',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'grade_id' => 'nullable|exists:grades,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
        ]);

        $schoolId = $validated['school_id'] 
            ?? $user->school_id 
            ?? School::first()?->id 
            ?? 1;

        $academicYearId = $validated['academic_year_id'] 
            ?? AcademicYear::where('is_current', true)->first()?->id 
            ?? AcademicYear::first()?->id 
            ?? 1;

        $gradeId = $validated['grade_id'] 
            ?? Grade::first()?->id 
            ?? 1;

        $homeroomTeacherId = $validated['homeroom_teacher_id'] 
            ?? ($user->isTeacher() ? $user->id : null);

        $code = !empty($validated['code']) 
            ? $validated['code'] 
            : strtoupper(Str::slug($validated['name'], '')) . '_' . date('Y') . '_' . rand(100, 999);

        $class = DB::transaction(function () use ($schoolId, $academicYearId, $gradeId, $homeroomTeacherId, $validated, $code, $user) {
            $newClass = SchoolClass::create([
                'school_id' => $schoolId,
                'academic_year_id' => $academicYearId,
                'grade_id' => $gradeId,
                'homeroom_teacher_id' => $homeroomTeacherId,
                'name' => $validated['name'],
                'code' => $code,
            ]);

            // Nếu giáo viên tạo, tự động gán vào TeacherClass
            if ($user->isTeacher()) {
                $defaultSubjectId = Subject::first()?->id;
                if ($defaultSubjectId) {
                    TeacherClass::firstOrCreate([
                        'teacher_id' => $user->id,
                        'class_id' => $newClass->id,
                        'subject_id' => $defaultSubjectId,
                    ]);
                }
            }

            return $newClass;
        });

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

    public function quickAddStudents(Request $request, SchoolClass $class): JsonResponse
    {
        $validated = $request->validate([
            'raw_text' => 'nullable|string',
            'students' => 'nullable|array',
            'students.*.full_name' => 'required_with:students|string',
            'default_password' => 'nullable|string|min:6',
        ]);

        $defaultPassword = $validated['default_password'] ?? 'Student@123456';
        $names = [];

        if (!empty($validated['students'])) {
            foreach ($validated['students'] as $item) {
                if (!empty(trim($item['full_name']))) {
                    $names[] = trim($item['full_name']);
                }
            }
        } elseif (!empty($validated['raw_text'])) {
            $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $validated['raw_text']));
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if (empty($trimmed)) continue;
                // Loại bỏ số thứ tự ở đầu dòng nếu có (ví dụ: "1. Nguyễn Văn A", "02 - Lê Thị B")
                $cleaned = preg_replace('/^\s*\d+[\.\-\)\/]\s*/u', '', $trimmed);
                if (!empty($cleaned)) {
                    $names[] = $cleaned;
                }
            }
        }

        if (empty($names)) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tên học sinh nào để thêm vào lớp.',
            ], 422);
        }

        $createdStudents = [];

        DB::transaction(function () use ($names, $class, $defaultPassword, &$createdStudents) {
            foreach ($names as $index => $name) {
                $slug = Str::slug($name, '');
                if (empty($slug)) $slug = 'hocsinh';
                
                // Sinh username duy nhất
                $baseUsername = strtolower($slug);
                $username = $baseUsername;
                $counter = 1;
                while (User::where('username', $username)->exists()) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                // Sinh mã học sinh
                $code = 'HS' . date('y') . '_' . rand(1000, 9999);

                $student = User::create([
                    'school_id' => $class->school_id,
                    'username' => $username,
                    'email' => $username . '@elearning.local',
                    'password' => $defaultPassword,
                    'full_name' => $name,
                    'role' => 'student',
                    'code' => $code,
                    'status' => 'active',
                ]);

                $class->students()->syncWithoutDetaching([
                    $student->id => [
                        'enrolled_at' => now(),
                        'status' => 'active',
                    ],
                ]);

                $createdStudents[] = [
                    'id' => $student->id,
                    'full_name' => $student->full_name,
                    'username' => $username,
                    'password' => $defaultPassword,
                    'code' => $code,
                ];
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã thêm thành công ' . count($createdStudents) . ' học sinh vào lớp ' . $class->name,
            'data' => $createdStudents,
        ]);
    }

    public function destroy(Request $request, SchoolClass $class): JsonResponse
    {
        $user = $request->user();
        if ($user->isTeacher() && $class->homeroom_teacher_id !== $user->id) {
            $isAssigned = TeacherClass::where('teacher_id', $user->id)->where('class_id', $class->id)->exists();
            if (!$isAssigned) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa lớp học này.'], 403);
            }
        }

        // Kiểm tra xem lớp đã có bài làm bài thi chưa
        $hasAttempts = DB::table('exam_assignments')
            ->join('exam_attempts', 'exam_assignments.id', '=', 'exam_attempts.assignment_id')
            ->where('exam_assignments.class_id', $class->id)
            ->exists();

        if ($hasAttempts) {
            return response()->json(['success' => false, 'message' => 'Lớp học đã có học sinh làm bài thi, không thể xóa.'], 422);
        }

        $class->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa lớp học thành công',
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
