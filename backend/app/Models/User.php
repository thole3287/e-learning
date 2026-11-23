<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'school_id',
        'username',
        'email',
        'password',
        'full_name',
        'role',
        'is_guest',
        'code',
        'phone',
        'avatar_url',
        'date_of_birth',
        'gender',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'is_guest',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'is_guest' => 'boolean',
        ];
    }

    public function getIsGuestAttribute(): bool
    {
        if (isset($this->attributes['is_guest'])) {
            return (bool) $this->attributes['is_guest'];
        }
        return str_starts_with($this->username ?? '', 'hs_') && (str_contains($this->email ?? '', '@hochoa247.io.vn') || str_contains($this->email ?? '', 'guest'));
    }

    public function isGuest(): bool
    {
        return $this->is_guest;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isTeacher(): bool
    {
        return $this->role === 'teacher';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function enrolledClasses(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'class_students', 'student_id', 'class_id')
            ->withPivot('enrolled_at', 'status')
            ->withTimestamps();
    }

    public function homeroomClasses(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'homeroom_teacher_id');
    }

    public function teacherClasses(): HasMany
    {
        return $this->hasMany(TeacherClass::class, 'teacher_id');
    }

    public function createdQuestions(): HasMany
    {
        return $this->hasMany(Question::class, 'creator_id');
    }

    public function createdExams(): HasMany
    {
        return $this->hasMany(Exam::class, 'creator_id');
    }

    public function examAttempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class, 'student_id');
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(LoginHistory::class, 'user_id');
    }
}
