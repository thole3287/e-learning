<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('teacher_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['teacher_id', 'class_id', 'subject_id'], 'uq_teacher_class_sub');
        });

        Schema::create('chapters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('grade_id')->nullable()->constrained('grades')->nullOnDelete();
            $table->string('name', 255);
            $table->integer('order_index')->default(1);
            $table->timestamps();
        });

        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chapter_id')->constrained('chapters')->cascadeOnDelete();
            $table->string('name', 255);
            $table->integer('order_index')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('chapters');
        Schema::dropIfExists('teacher_classes');
        Schema::dropIfExists('subjects');
    }
};
