<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolClass extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'classes';

    protected $fillable = [
        'school_id',
        'academic_year_id',
        'grade_id',
        'homeroom_teacher_id',
        'name',
        'code',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function homeroomTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'homeroom_teacher_id');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_students', 'class_id', 'student_id')
            ->withPivot('enrolled_at', 'status')
            ->withTimestamps();
    }

    public function teacherClasses(): HasMany
    {
        return $this->hasMany(TeacherClass::class, 'class_id');
    }

    public function examAssignments(): HasMany
    {
        return $this->hasMany(ExamAssignment::class, 'class_id');
    }
}
