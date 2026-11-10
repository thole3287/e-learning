<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('name', 50);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });

        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->unsignedTinyInteger('level');
            $table->timestamps();
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('grade_id')->constrained('grades')->cascadeOnDelete();
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 100);
            $table->string('code', 50);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['code', 'academic_year_id'], 'uq_class_code_year');
        });

        Schema::create('class_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->date('enrolled_at');
            $table->enum('status', ['active', 'transferred', 'dropped'])->default('active');
            $table->timestamps();

            $table->unique(['class_id', 'student_id'], 'uq_class_student');
        });

        Schema::create('login_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->enum('status', ['success', 'failed'])->default('success');
            $table->timestamp('login_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_histories');
        Schema::dropIfExists('class_students');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('grades');
        Schema::dropIfExists('academic_years');
    }
};
