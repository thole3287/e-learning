<?php

use Illuminate\Support\Facades\Route;

// Trang chủ của Backend API
Route::get('/', function () {
    return response()->json([
        'system' => 'E-Exam Online Examination & LMS Platform',
        'status' => 'API is running successfully',
        'version' => '1.0.0',
        'health' => url('/up'),
        'frontend_url' => 'https://hochoa247.io.vn',
        'message' => 'Backend API server is ready and connected to database.',
    ]);
});
