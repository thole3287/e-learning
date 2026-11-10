<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'class_id',
        'student_id',
        'assigned_by',
        'start_time',
        'end_time',
        'max_attempts',
        'view_score_type',
        'show_solutions',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'max_attempts' => 'integer',
        'show_solutions' => 'boolean',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }

    public function isOpen(): bool
    {
        $now = now();
        return $now->gte($this->start_time) && $now->lte($this->end_time);
    }
}
