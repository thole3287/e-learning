<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('practice_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->json('selected_chapter_ids')->nullable();
            $table->json('matrix_config')->nullable();
            $table->json('question_order')->nullable();
            $table->json('option_order')->nullable();
            $table->unsignedInteger('duration_minutes')->default(0)->comment('0 = không giới hạn');
            $table->enum('mode', ['exam', 'interactive'])->default('interactive')->comment('exam = nộp bài xem điểm, interactive = xem lời giải ngay');
            $table->decimal('score', 5, 2)->nullable();
            $table->unsignedInteger('total_questions')->default(0);
            $table->unsignedInteger('total_correct')->default(0);
            $table->unsignedInteger('total_incorrect')->default(0);
            $table->unsignedInteger('total_unanswered')->default(0);
            $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'subject_id', 'status'], 'idx_practice_student');
        });

        Schema::create('practice_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('practice_session_id')->constrained('practice_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->json('selected_option_ids')->nullable();
            $table->text('text_answer')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->timestamps();

            $table->unique(['practice_session_id', 'question_id'], 'uniq_practice_question');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('practice_answers');
        Schema::dropIfExists('practice_sessions');
    }
};
