<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Services\ReportAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    protected ReportAnalyticsService $analyticsService;

    public function __construct(ReportAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    public function dashboard(Request $request): JsonResponse
    {
        $stats = $this->analyticsService->getDashboardStats($request->user());

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    public function examAnalytics(Request $request, Exam $exam): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && $exam->creator_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem thống kê đề thi này.'], 403);
        }

        $analytics = $this->analyticsService->getExamAnalytics($exam);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }
}
