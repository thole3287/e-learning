<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_assignment_id')->constrained('exam_assignments')->cascadeOnDelete();
            $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->json('question_order')->nullable()->comment('Snapshot thứ tự câu hỏi đã xáo trộn');
            $table->json('option_order')->nullable()->comment('Snapshot thứ tự phương án của từng câu');
            $table->timestamp('started_at');
            $table->timestamp('expires_at');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->enum('status', ['not_started', 'in_progress', 'submitted', 'auto_submitted', 'graded', 'expired'])->default('in_progress');
            $table->decimal('score', 5, 2)->nullable();
            $table->unsignedInteger('total_correct')->default(0);
            $table->unsignedInteger('total_incorrect')->default(0);
            $table->unsignedInteger('total_unanswered')->default(0);
            $table->timestamps();

            $table->index(['student_id', 'exam_id', 'status'], 'idx_attempts_student');
            $table->index(['status', 'expires_at'], 'idx_attempts_auto_submit');
        });

        Schema::create('student_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->json('selected_option_ids')->nullable();
            $table->text('text_answer')->nullable();
            $table->boolean('is_flagged')->default(false);
            $table->boolean('is_correct')->nullable();
            $table->decimal('earned_points', 5, 2)->default(0.00);
            $table->timestamp('saved_at');
            $table->timestamps();

            $table->unique(['exam_attempt_id', 'question_id'], 'uq_attempt_question');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_answers');
        Schema::dropIfExists('exam_attempts');
    }
};
