<?php

namespace App\Services;

use App\Models\ExamAttempt;
use App\Models\Question;
use App\Models\StudentAnswer;
use Illuminate\Support\Facades\DB;
use Exception;

class ExamGradingService
{
    /**
     * Chấm điểm một lượt thi (ExamAttempt)
     */
    public function gradeAttempt(ExamAttempt $attempt): ExamAttempt
    {
        return DB::transaction(function () use ($attempt) {
            // Lock dòng exam_attempts để chống race condition
            $lockedAttempt = ExamAttempt::where('id', $attempt->id)->lockForUpdate()->firstOrFail();

            if (in_array($lockedAttempt->status, ['graded', 'expired']) && $lockedAttempt->graded_at !== null) {
                return $lockedAttempt;
            }

            // Tải chi tiết đề thi và điểm số của từng câu hỏi
            $exam = $lockedAttempt->exam()->with(['examQuestions.question.options'])->firstOrFail();
            $examQuestions = $exam->examQuestions->keyBy('question_id');

            // Tải toàn bộ câu trả lời của học sinh đã lưu
            $studentAnswers = StudentAnswer::where('exam_attempt_id', $lockedAttempt->id)->get()->keyBy('question_id');

            $totalCorrect = 0;
            $totalIncorrect = 0;
            $totalUnanswered = 0;
            $totalEarnedPoints = 0.00;

            foreach ($examQuestions as $questionId => $examQuestion) {
                $question = $examQuestion->question;
                $allocatedPoints = (float) $examQuestion->points;
                $answer = $studentAnswers->get($questionId);

                // Nếu chưa trả lời
                if (!$answer || ($answer->selected_option_ids === null && empty(trim($answer->text_answer ?? '')))) {
                    $totalUnanswered++;
                    if ($answer) {
                        $answer->update([
                            'is_correct' => false,
                            'earned_points' => 0.00,
                        ]);
                    }
                    continue;
                }

                // Tiến hành chấm điểm theo dạng câu hỏi
                $result = $this->evaluateQuestion($question, $answer, $allocatedPoints);

                if ($result['is_correct']) {
                    $totalCorrect++;
                } else {
                    $totalIncorrect++;
                }

                $totalEarnedPoints += $result['earned_points'];

                $answer->update([
                    'is_correct' => $result['is_correct'],
                    'earned_points' => $result['earned_points'],
                ]);
            }

            $lockedAttempt->update([
                'status' => 'graded',
                'score' => round($totalEarnedPoints, 2),
                'total_correct' => $totalCorrect,
                'total_incorrect' => $totalIncorrect,
                'total_unanswered' => $totalUnanswered,
                'graded_at' => now(),
            ]);

            return $lockedAttempt->fresh();
        });
    }

    /**
     * Thuật toán chấm điểm theo dạng câu hỏi
     */
    public function evaluateQuestion(Question $question, StudentAnswer $answer, float $allocatedPoints): array
    {
        $options = $question->options;
        $correctOptions = $options->where('is_correct', true);
        $correctOptionIds = $correctOptions->pluck('id')->toArray();

        switch ($question->question_type) {
            case 'single_choice':
                $selectedIds = (array) ($answer->selected_option_ids ?? []);
                $selectedId = count($selectedIds) > 0 ? (int) $selectedIds[0] : null;
                $isCorrect = ($selectedId !== null && in_array($selectedId, $correctOptionIds));
                return [
                    'is_correct' => $isCorrect,
                    'earned_points' => $isCorrect ? $allocatedPoints : 0.00,
                ];

            case 'true_false':
                // Phần II: Đúng / Sai GDPT 2018
                // Mỗi câu hỏi có các ý (thường là 4 ý a, b, c, d). Học sinh chọn Đúng hoặc Sai cho mỗi ý.
                $totalStatements = $options->count();
                if ($totalStatements === 0) {
                    return ['is_correct' => false, 'earned_points' => 0.00];
                }

                $studentMap = [];
                if (!empty($answer->text_answer)) {
                    $decoded = json_decode($answer->text_answer, true);
                    if (is_array($decoded)) {
                        $studentMap = $decoded;
                    }
                }

                $correctCount = 0;
                $answeredCount = 0;

                foreach ($options as $opt) {
                    $expectedCorrect = (bool) $opt->is_correct;
                    $studentChoice = null;

                    if (array_key_exists($opt->id, $studentMap)) {
                        $studentChoice = (bool) $studentMap[$opt->id];
                    } elseif (array_key_exists((string) $opt->id, $studentMap)) {
                        $studentChoice = (bool) $studentMap[(string) $opt->id];
                    } elseif (!empty($answer->selected_option_ids) && is_array($answer->selected_option_ids)) {
                        // Fallback nếu chỉ lưu selected_option_ids (chọn Đúng)
                        $studentChoice = in_array($opt->id, $answer->selected_option_ids);
                    }

                    if ($studentChoice !== null) {
                        $answeredCount++;
                        if ($studentChoice === $expectedCorrect) {
                            $correctCount++;
                        }
                    }
                }

                // Điểm theo quy chế GDPT 2018 (Chuẩn Bộ GD&ĐT):
                // - Đúng 1 ý: 0.10 điểm (10% điểm câu)
                // - Đúng 2 ý: 0.25 điểm (25% điểm câu)
                // - Đúng 3 ý: 0.50 điểm (50% điểm câu)
                // - Đúng 4 ý: 1.00 điểm (100% điểm câu)
                $fraction = 0.0;
                if ($totalStatements === 4) {
                    if ($correctCount === 1) $fraction = 0.10;
                    elseif ($correctCount === 2) $fraction = 0.25;
                    elseif ($correctCount === 3) $fraction = 0.50;
                    elseif ($correctCount === 4) $fraction = 1.00;
                } else {
                    $fraction = $totalStatements > 0 ? ($correctCount / $totalStatements) : 0.0;
                }

                $earnedPoints = round($fraction * $allocatedPoints, 2);
                $isFullyCorrect = ($totalStatements > 0 && $correctCount === $totalStatements);

                return [
                    'is_correct' => $isFullyCorrect,
                    'earned_points' => $earnedPoints,
                ];

            case 'multiple_choice':
                $selectedIds = array_map('intval', (array) ($answer->selected_option_ids ?? []));
                $allOptionIds = $options->pluck('id')->toArray();
                $incorrectOptionIds = array_diff($allOptionIds, $correctOptionIds);

                $correctSelected = count(array_intersect($selectedIds, $correctOptionIds));
                $incorrectSelected = count(array_intersect($selectedIds, $incorrectOptionIds));

                $totalCorrectCount = count($correctOptionIds);
                $totalIncorrectCount = count($incorrectOptionIds);

                // Tính điểm thành phần (Partial Credit Scoring)
                $positiveFraction = $totalCorrectCount > 0 ? ($correctSelected / $totalCorrectCount) : 0;
                $negativeFraction = $totalIncorrectCount > 0 ? ($incorrectSelected / $totalIncorrectCount) : 0;

                $netFraction = max(0.0, $positiveFraction - $negativeFraction);
                $earnedPoints = round($netFraction * $allocatedPoints, 2);
                $isFullyCorrect = ($correctSelected === $totalCorrectCount && $incorrectSelected === 0);

                return [
                    'is_correct' => $isFullyCorrect,
                    'earned_points' => $earnedPoints,
                ];

            case 'fill_in_blank':
            case 'short_answer':
                $studentText = mb_strtolower(trim($answer->text_answer ?? ''));
                $isCorrect = false;

                foreach ($options as $opt) {
                    $expected = mb_strtolower(trim($opt->content));
                    if ($studentText === $expected) {
                        $isCorrect = true;
                        break;
                    }
                }

                return [
                    'is_correct' => $isCorrect,
                    'earned_points' => $isCorrect ? $allocatedPoints : 0.00,
                ];

            default:
                return [
                    'is_correct' => false,
                    'earned_points' => 0.00,
                ];
        }
    }
}
