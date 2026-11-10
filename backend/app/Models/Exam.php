<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Exam extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'creator_id',
        'subject_id',
        'grade_id',
        'title',
        'code',
        'description',
        'duration_minutes',
        'total_points',
        'pass_points',
        'shuffle_questions',
        'shuffle_options',
        'status',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'total_points' => 'decimal:2',
        'pass_points' => 'decimal:2',
        'shuffle_questions' => 'boolean',
        'shuffle_options' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('order_index');
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'exam_questions', 'exam_id', 'question_id')
            ->withPivot('order_index', 'points')
            ->withTimestamps();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ExamAssignment::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
