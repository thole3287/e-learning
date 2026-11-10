<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\SchoolClass;
use App\Models\StudentAnswer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportAnalyticsService
{
    /**
     * Thống kê tổng quan cho Dashboard theo Role
     */
    public function getDashboardStats(User $user): array
    {
        if ($user->isSuperAdmin()) {
            return [
                'total_schools' => DB::table('schools')->count(),
                'total_teachers' => User::where('role', 'teacher')->count(),
                'total_students' => User::where('role', 'student')->count(),
                'total_classes' => DB::table('classes')->whereNull('deleted_at')->count(),
                'total_questions' => DB::table('questions')->whereNull('deleted_at')->count(),
                'total_exams' => DB::table('exams')->whereNull('deleted_at')->count(),
                'total_attempts' => DB::table('exam_attempts')->count(),
                'recent_attempts' => ExamAttempt::with(['student', 'exam'])
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(fn($a) => [
                        'id' => $a->id,
                        'student_name' => $a->student->full_name,
                        'exam_title' => $a->exam->title,
                        'score' => (float) $a->score,
                        'status' => $a->status,
                        'submitted_at' => $a->submitted_at?->format('H:i d/m/Y'),
                    ]),
            ];
        }

        if ($user->isTeacher()) {
            $assignedClassIds = DB::table('teacher_classes')
                ->where('teacher_id', $user->id)
                ->pluck('class_id')
                ->unique()
                ->toArray();

            $totalStudents = DB::table('class_students')
                ->whereIn('class_id', $assignedClassIds)
                ->where('status', 'active')
                ->distinct('student_id')
                ->count('student_id');

            $createdExamIds = Exam::where('creator_id', $user->id)->pluck('id')->toArray();

            return [
                'assigned_classes_count' => count($assignedClassIds),
                'total_students' => $totalStudents,
                'created_questions_count' => DB::table('questions')->where('creator_id', $user->id)->whereNull('deleted_at')->count(),
                'created_exams_count' => count($createdExamIds),
                'total_exam_attempts' => DB::table('exam_attempts')->whereIn('exam_id', $createdExamIds)->count(),
                'active_assignments' => DB::table('exam_assignments')
                    ->whereIn('exam_id', $createdExamIds)
                    ->where('start_time', '<=', now())
                    ->where('end_time', '>=', now())
                    ->count(),
            ];
        }

        // Student Dashboard Stats
        $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id')->toArray();
        $assignedExamsCount = DB::table('exam_assignments')
            ->where(function ($q) use ($user, $enrolledClassIds) {
                $q->whereIn('class_id', $enrolledClassIds)
                    ->orWhere('student_id', $user->id);
            })
            ->count();

        $completedAttempts = ExamAttempt::where('student_id', $user->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->get();

        $avgScore = $completedAttempts->count() > 0 ? $completedAttempts->avg('score') : 0.0;

        return [
            'assigned_exams_count' => $assignedExamsCount,
            'completed_attempts_count' => $completedAttempts->count(),
            'average_score' => round($avgScore, 2),
            'recent_results' => $completedAttempts->sortByDesc('id')->take(5)->values()->map(fn($a) => [
                'attempt_id' => $a->id,
                'exam_title' => $a->exam->title,
                'score' => (float) $a->score,
                'total_points' => (float) $a->exam->total_points,
                'submitted_at' => $a->submitted_at?->format('H:i d/m/Y'),
            ]),
        ];
    }

    /**
     * Báo cáo phân tích phổ điểm và chỉ số của một Đề thi
     */
    public function getExamAnalytics(Exam $exam): array
    {
        $attempts = ExamAttempt::where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->get();

        $totalSubmissions = $attempts->count();
        if ($totalSubmissions === 0) {
            return [
                'total_submissions' => 0,
                'average_score' => 0,
                'highest_score' => 0,
                'lowest_score' => 0,
                'pass_rate' => 0,
                'distribution' => [
                    'poor' => 0,     // < 4.0
                    'average' => 0,  // 4.0 - 6.5
                    'good' => 0,     // 6.5 - 8.0
                    'excellent' => 0 // 8.0 - 10.0
                ],
                'item_analysis' => [],
            ];
        }

        $scores = $attempts->pluck('score')->map(fn($s) => (float) $s);
        $avgScore = round($scores->avg(), 2);
        $maxScore = $scores->max();
        $minScore = $scores->min();

        $passedCount = $attempts->where('score', '>=', (float) $exam->pass_points)->count();
        $passRate = round(($passedCount / $totalSubmissions) * 100, 1);

        // Phổ điểm (Distribution bins)
        $poor = $scores->filter(fn($s) => $s < 4.0)->count();
        $average = $scores->filter(fn($s) => $s >= 4.0 && $s < 6.5)->count();
        $good = $scores->filter(fn($s) => $s >= 6.5 && $s < 8.0)->count();
        $excellent = $scores->filter(fn($s) => $s >= 8.0)->count();

        // Item Analysis (Phân tích tỷ lệ sai của từng câu hỏi)
        $attemptIds = $attempts->pluck('id')->toArray();
        $examQuestions = $exam->examQuestions()->with('question')->get();

        $itemAnalysis = [];
        foreach ($examQuestions as $eq) {
            $q = $eq->question;
            $answers = StudentAnswer::whereIn('exam_attempt_id', $attemptIds)
                ->where('question_id', $q->id)
                ->get();

            $totalAnswered = $answers->count();
            $correctCount = $answers->where('is_correct', true)->count();
            $incorrectCount = $totalAnswered - $correctCount;
            $errorRate = $totalAnswered > 0 ? round(($incorrectCount / $totalAnswered) * 100, 1) : 0;

            $itemAnalysis[] = [
                'question_id' => $q->id,
                'order_index' => $eq->order_index,
                'question_type' => $q->question_type,
                'difficulty_level' => $q->difficulty_level,
                'content_preview' => mb_substr(strip_tags($q->content), 0, 80) . '...',
                'total_answers' => $totalAnswered,
                'correct_answers' => $correctCount,
                'incorrect_answers' => $incorrectCount,
                'error_rate' => $errorRate, // % học sinh trả lời sai
            ];
        }

        return [
            'exam_id' => $exam->id,
            'title' => $exam->title,
            'total_submissions' => $totalSubmissions,
            'average_score' => $avgScore,
            'highest_score' => (float) $maxScore,
            'lowest_score' => (float) $minScore,
            'pass_rate' => $passRate,
            'distribution' => [
                'poor' => $poor,
                'average' => $average,
                'good' => $good,
                'excellent' => $excellent,
            ],
            'item_analysis' => $itemAnalysis,
        ];
    }
}
