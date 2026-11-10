<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\Question;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamMatrixService
{
    /**
     * Tự động chọn câu hỏi từ ngân hàng vào đề thi theo ma trận tỷ lệ độ khó Bloom
     *
     * @param Exam $exam
     * @param array $matrix Cấu hình: [
     *    'subject_id' => 1,
     *    'chapter_ids' => [1, 2],
     *    'levels' => [
     *        1 => 4, // 4 câu nhận biết
     *        2 => 3, // 3 câu thông hiểu
     *        3 => 2, // 2 câu vận dụng
     *        4 => 1  // 1 câu vận dụng cao
     *    ]
     * ]
     */
    public function generateExamByMatrix(Exam $exam, array $matrix): Exam
    {
        return DB::transaction(function () use ($exam, $matrix) {
            $subjectId = $matrix['subject_id'] ?? $exam->subject_id;
            $chapterIds = $matrix['chapter_ids'] ?? [];
            $levels = $matrix['levels'] ?? [];

            $selectedQuestionIds = [];

            foreach ($levels as $level => $count) {
                if ($count <= 0) {
                    continue;
                }

                $query = Question::where('subject_id', $subjectId)
                    ->where('difficulty_level', $level)
                    ->where('status', 'active');

                if (!empty($chapterIds)) {
                    $query->whereIn('chapter_id', $chapterIds);
                }

                $questions = $query->inRandomOrder()->limit($count)->pluck('id')->toArray();

                if (count($questions) < $count) {
                    throw ValidationException::withMessages([
                        'matrix' => ["Ngân hàng câu hỏi không đủ số lượng cho mức độ nhận thức {$level} (yêu cầu {$count}, có sẵn " . count($questions) . ")."],
                    ]);
                }

                $selectedQuestionIds = array_merge($selectedQuestionIds, $questions);
            }

            // Xóa các câu hỏi cũ trong đề thi (nếu có)
            ExamQuestion::where('exam_id', $exam->id)->delete();

            $totalQuestions = count($selectedQuestionIds);
            if ($totalQuestions === 0) {
                throw ValidationException::withMessages([
                    'matrix' => ['Chưa có câu hỏi nào được chọn từ ma trận.'],
                ]);
            }

            $pointPerQuestion = round((float) $exam->total_points / $totalQuestions, 2);

            foreach ($selectedQuestionIds as $index => $qId) {
                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $qId,
                    'order_index' => $index + 1,
                    'points' => $pointPerQuestion,
                ]);
            }

            return $exam->fresh(['examQuestions.question']);
        });
    }
}
