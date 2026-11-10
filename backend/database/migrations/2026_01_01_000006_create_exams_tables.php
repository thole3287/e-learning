<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('grade_id')->nullable()->constrained('grades')->nullOnDelete();
            $table->string('title', 255);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('duration_minutes');
            $table->decimal('total_points', 5, 2)->default(10.00);
            $table->decimal('pass_points', 5, 2)->default(5.00);
            $table->boolean('shuffle_questions')->default(true);
            $table->boolean('shuffle_options')->default(true);
            $table->enum('status', ['draft', 'published', 'closed', 'archived'])->default('draft');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->integer('order_index')->default(1);
            $table->decimal('points', 5, 2)->default(1.00);
            $table->timestamps();

            $table->unique(['exam_id', 'question_id'], 'uq_exam_question');
        });

        Schema::create('exam_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->unsignedInteger('max_attempts')->default(1);
            $table->enum('view_score_type', ['immediately', 'after_closed', 'manual'])->default('immediately');
            $table->boolean('show_solutions')->default(false);
            $table->timestamps();

            $table->index(['class_id', 'exam_id', 'start_time', 'end_time'], 'idx_assignments_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_assignments');
        Schema::dropIfExists('exam_questions');
        Schema::dropIfExists('exams');
    }
};
