<?php

namespace App\Console\Commands;

use App\Models\ExamAttempt;
use App\Services\ExamGradingService;
use Illuminate\Console\Command;

class CheckExpiredExamAttemptsCommand extends Command
{
    protected $signature = 'exams:check-expired-attempts';
    protected $description = 'Quét và tự động nộp bài cho các lượt thi trắc nghiệm đã quá thời gian làm bài';

    public function handle(ExamGradingService $gradingService): int
    {
        $expiredAttempts = ExamAttempt::where('status', 'in_progress')
            ->where('expires_at', '<', now())
            ->get();

        $count = $expiredAttempts->count();
        if ($count === 0) {
            $this->info('Không có lượt thi nào quá hạn.');
            return self::SUCCESS;
        }

        $this->info("Phát hiện {$count} lượt thi quá hạn. Đang tiến hành tự động nộp bài và chấm điểm...");

        foreach ($expiredAttempts as $attempt) {
            $attempt->update([
                'status' => 'auto_submitted',
                'submitted_at' => $attempt->expires_at,
            ]);

            $gradingService->gradeAttempt($attempt);
            $this->line("-> Đã thu bài thành công cho Thí sinh ID #{$attempt->student_id} (Lượt thi #{$attempt->id})");
        }

        $this->info('Hoàn tất quá trình tự động thu bài!');
        return self::SUCCESS;
    }
}
