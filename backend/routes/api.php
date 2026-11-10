<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\ExamTakingController;
use App\Http\Controllers\Api\V1\PracticeController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SchoolClassController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes V1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. Authentication (Public)
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected Routes (Yêu cầu Bearer Token Sanctum)
    Route::middleware('auth:sanctum')->group(function () {

        // Auth & Profile
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

        // Dashboard & Analytics
        Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
        Route::get('/exams/{exam}/analytics', [ReportController::class, 'examAnalytics']);

        // Users Management
        Route::apiResource('users', UserController::class);

        // Classes & School Structure
        Route::get('/classes', [SchoolClassController::class, 'index']);
        Route::post('/classes', [SchoolClassController::class, 'store']);
        Route::get('/classes/{class}', [SchoolClassController::class, 'show']);
        Route::put('/classes/{class}', [SchoolClassController::class, 'update']);
        Route::post('/classes/{class}/students', [SchoolClassController::class, 'addStudents']);
        Route::delete('/classes/{class}/students/{student}', [SchoolClassController::class, 'removeStudent']);
        Route::post('/classes/{class}/assign-teacher', [SchoolClassController::class, 'assignTeacher']);

        // Subjects & Curriculum
        Route::get('/subjects', [SubjectController::class, 'index']);
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::get('/subjects/{subject}', [SubjectController::class, 'show']);
        Route::get('/subjects/{subject}/chapters', [SubjectController::class, 'getChapters']);
        Route::post('/chapters', [SubjectController::class, 'storeChapter']);
        Route::post('/lessons', [SubjectController::class, 'storeLesson']);

        // Question Bank
        Route::post('/questions/import', [QuestionController::class, 'import']);
        Route::post('/questions/bulk', [QuestionController::class, 'import']);
        Route::apiResource('questions', QuestionController::class);
        Route::post('/questions/{question}/duplicate', [QuestionController::class, 'duplicate']);

        // Exam Management
        Route::apiResource('exams', ExamController::class);
        Route::post('/exams/{exam}/questions', [ExamController::class, 'addQuestions']);
        Route::post('/exams/{exam}/generate-matrix', [ExamController::class, 'generateByMatrix']);
        Route::post('/exams/{exam}/publish', [ExamController::class, 'publish']);
        Route::post('/exams/{exam}/assign', [ExamController::class, 'assign']);

        // Exam Taking Engine (Thí sinh & Phòng thi trực tuyến)
        Route::get('/student/exams', [ExamTakingController::class, 'getStudentExams']);
        Route::post('/assignments/{assignment}/start', [ExamTakingController::class, 'startExam']);
        Route::get('/attempts/{attempt}', [ExamTakingController::class, 'getAttempt']);
        Route::post('/attempts/{attempt}/answers', [ExamTakingController::class, 'saveAnswer']);
        Route::post('/attempts/{attempt}/submit', [ExamTakingController::class, 'submitExam']);
        Route::get('/attempts/{attempt}/result', [ExamTakingController::class, 'getResult']);

        // Self-Practice Engine (Tự Ôn Luyện Cá Nhân Theo Chương & Mức Độ)
        Route::get('/practice/matrix-info', [PracticeController::class, 'getMatrixInfo']);
        Route::post('/practice/start', [PracticeController::class, 'start']);
        Route::get('/practice/history', [PracticeController::class, 'history']);
        Route::get('/practice/sessions/{session}', [PracticeController::class, 'show']);
        Route::post('/practice/sessions/{session}/save', [PracticeController::class, 'saveAnswer']);
        Route::post('/practice/sessions/{session}/submit', [PracticeController::class, 'submit']);

        // Teacher: View Students' Self-Practice Results
        Route::get('/practice/teacher/overview', [PracticeController::class, 'teacherOverview']);
        Route::get('/practice/teacher/sessions/{session}', [PracticeController::class, 'teacherSessionDetail']);
    });
});
