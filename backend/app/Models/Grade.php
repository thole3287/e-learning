<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'level',
    ];

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class);
    }
}
