<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('chapter_id')->nullable()->constrained('chapters')->nullOnDelete();
            $table->foreignId('lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->enum('question_type', ['single_choice', 'multiple_choice', 'true_false', 'fill_in_blank', 'short_answer']);
            $table->unsignedTinyInteger('difficulty_level')->default(1)->comment('1: Nhan biet, 2: Thong hieu, 3: Van dung, 4: Van dung cao');
            $table->longText('content');
            $table->longText('explanation')->nullable();
            $table->decimal('default_points', 5, 2)->default(1.00);
            $table->boolean('is_shared')->default(false);
            $table->enum('status', ['active', 'draft', 'archived'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subject_id', 'difficulty_level', 'question_type'], 'idx_questions_filter');
            $table->index('creator_id', 'idx_questions_creator');
        });

        Schema::create('question_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->text('content');
            $table->boolean('is_correct')->default(false);
            $table->integer('order_index')->default(1);
            $table->timestamps();

            $table->index(['question_id', 'is_correct'], 'idx_options_question');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_options');
        Schema::dropIfExists('questions');
    }
};
