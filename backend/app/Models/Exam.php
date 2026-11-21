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

    protected $appends = ['settings'];

    public function getDescriptionAttribute($value): ?string
    {
        if (empty($value)) {
            return null;
        }
        if (is_string($value) && str_starts_with(trim($value), '{')) {
            $decoded = json_decode($value, true);
            if (is_array($decoded) && (isset($decoded['_settings']) || isset($decoded['_text_description']))) {
                return !empty($decoded['_text_description']) ? (string) $decoded['_text_description'] : null;
            }
        }
        return $value;
    }

    public function setDescriptionAttribute($value): void
    {
        $raw = $this->attributes['description'] ?? null;
        $current = [];
        if (!empty($raw) && is_string($raw) && str_starts_with(trim($raw), '{')) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && isset($decoded['_settings'])) {
                $current = $decoded;
                $current['_text_description'] = $value;
                $this->attributes['description'] = json_encode($current, JSON_UNESCAPED_UNICODE);
                return;
            }
        }
        $this->attributes['description'] = $value;
    }

    public function getSettingsAttribute(): array
    {
        $raw = $this->attributes['description'] ?? null;
        if (empty($raw)) {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (is_array($decoded) && isset($decoded['_settings'])) {
            return (array) $decoded['_settings'];
        }
        return [];
    }

    public function setSettingsAttribute($val): void
    {
        $raw = $this->attributes['description'] ?? null;
        $current = [];
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $current = $decoded;
            } else {
                $current['_text_description'] = $raw;
            }
        }
        $current['_settings'] = (array) $val;
        $this->attributes['description'] = json_encode($current, JSON_UNESCAPED_UNICODE);
    }

    public function getCleanDescriptionAttribute(): string
    {
        return $this->getDescriptionAttribute($this->attributes['description'] ?? null) ?? '';
    }

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
