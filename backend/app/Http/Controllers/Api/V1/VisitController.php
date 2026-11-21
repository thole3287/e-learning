<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\VisitTrackerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    protected VisitTrackerService $visitTracker;

    public function __construct(VisitTrackerService $visitTracker)
    {
        $this->visitTracker = $visitTracker;
    }

    /**
     * Ghi nhận lượt truy cập (Public)
     */
    public function record(Request $request): JsonResponse
    {
        $stats = $this->visitTracker->recordVisit($request);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Lấy thông tin thống kê lượt truy cập (Public)
     */
    public function stats(): JsonResponse
    {
        $stats = $this->visitTracker->getStats();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Đặt lại mốc số lượt truy cập (Admin)
     */
    public function updateBaseline(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện chức năng này.'], 403);
        }

        $request->validate(['total' => 'required|integer|min:0']);
        $stats = $this->visitTracker->setBaseline($request->integer('total'));

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật mốc lượt truy cập thành công.',
            'data' => $stats,
        ]);
    }
}
