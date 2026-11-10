<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PracticeSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'subject_id',
        'title',
        'selected_chapter_ids',
        'matrix_config',
        'question_order',
        'option_order',
        'duration_minutes',
        'mode',
        'score',
        'total_questions',
        'total_correct',
        'total_incorrect',
        'total_unanswered',
        'status',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'selected_chapter_ids' => 'array',
        'matrix_config' => 'array',
        'question_order' => 'array',
        'option_order' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'score' => 'float',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(PracticeAnswer::class, 'practice_session_id');
    }
}
