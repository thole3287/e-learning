<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'creator_id',
        'subject_id',
        'chapter_id',
        'lesson_id',
        'question_type',
        'difficulty_level',
        'content',
        'explanation',
        'default_points',
        'is_shared',
        'status',
    ];

    protected $casts = [
        'difficulty_level' => 'integer',
        'default_points' => 'decimal:2',
        'is_shared' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('order_index');
    }

    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class);
    }
}
