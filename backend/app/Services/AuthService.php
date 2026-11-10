<?php

namespace App\Services;

use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $login, string $password, Request $request): array
    {
        // Cho phép đăng nhập bằng username, email hoặc mã học sinh/giáo viên
        $user = User::where('email', $login)
            ->orWhere('username', $login)
            ->orWhere('code', $login)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            if ($user) {
                LoginHistory::create([
                    'user_id' => $user->id,
                    'ip_address' => $request->ip() ?? '127.0.0.1',
                    'user_agent' => $request->userAgent(),
                    'status' => 'failed',
                    'login_at' => now(),
                ]);
            }

            throw ValidationException::withMessages([
                'login' => ['Thông tin đăng nhập hoặc mật khẩu không chính xác.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'login' => ['Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.'],
            ]);
        }

        // Ghi lại lịch sử đăng nhập thành công
        LoginHistory::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip() ?? '127.0.0.1',
            'user_agent' => $request->userAgent(),
            'status' => 'success',
            'login_at' => now(),
        ]);

        // Tạo Personal Access Token của Sanctum
        $token = $user->createToken('auth_token', [$user->role])->plainTextToken;

        return [
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'role' => $user->role,
                'code' => $user->code,
                'avatar_url' => $user->avatar_url,
                'school_id' => $user->school_id,
            ],
            'token' => $token,
            'token_type' => 'Bearer',
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không đúng.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($newPassword),
        ]);

        // Thu hồi toàn bộ token cũ để buộc đăng nhập lại
        $user->tokens()->delete();
    }
}
