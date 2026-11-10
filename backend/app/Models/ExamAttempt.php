<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_assignment_id',
        'exam_id',
        'student_id',
        'attempt_number',
        'question_order',
        'option_order',
        'started_at',
        'expires_at',
        'submitted_at',
        'graded_at',
        'status',
        'score',
        'total_correct',
        'total_incorrect',
        'total_unanswered',
    ];

    protected $casts = [
        'question_order' => 'array',
        'option_order' => 'array',
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'graded_at' => 'datetime',
        'score' => 'decimal:2',
        'attempt_number' => 'integer',
        'total_correct' => 'integer',
        'total_incorrect' => 'integer',
        'total_unanswered' => 'integer',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ExamAssignment::class, 'exam_assignment_id');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(StudentAnswer::class);
    }

    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    public function isExpired(): bool
    {
        return now()->gt($this->expires_at);
    }
}
