<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_attempt_id',
        'question_id',
        'selected_option_ids',
        'text_answer',
        'is_flagged',
        'is_correct',
        'earned_points',
        'saved_at',
    ];

    protected $casts = [
        'selected_option_ids' => 'array',
        'is_flagged' => 'boolean',
        'is_correct' => 'boolean',
        'earned_points' => 'decimal:2',
        'saved_at' => 'datetime',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
