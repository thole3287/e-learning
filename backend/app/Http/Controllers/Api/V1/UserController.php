<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('school');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => 'nullable|exists:schools,id',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:6',
            'full_name' => 'required|string|max:100',
            'role' => ['required', Rule::in(['super_admin', 'teacher', 'student'])],
            'code' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => 'nullable|date',
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo người dùng mới thành công',
            'data' => $user,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['school', 'enrolledClasses', 'homeroomClasses']);

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => 'nullable|exists:schools,id',
            'email' => ['sometimes', 'email', 'max:191', Rule::unique('users')->ignore($user->id)],
            'full_name' => 'sometimes|string|max:100',
            'role' => ['sometimes', Rule::in(['super_admin', 'teacher', 'student'])],
            'code' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => 'nullable|date',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'blocked'])],
            'password' => 'nullable|string|min:6',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin thành công',
            'data' => $user,
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa người dùng thành công',
        ]);
    }
}
