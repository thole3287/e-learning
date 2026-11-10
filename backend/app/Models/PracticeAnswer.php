<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'practice_session_id',
        'question_id',
        'selected_option_ids',
        'text_answer',
        'is_correct',
    ];

    protected $casts = [
        'selected_option_ids' => 'array',
        'is_correct' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(PracticeSession::class, 'practice_session_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class, 'question_id');
    }
}
