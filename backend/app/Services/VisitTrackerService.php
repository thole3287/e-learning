<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VisitTrackerService
{
    /**
     * Ghi nhận 1 lượt truy cập và tính toán thống kê
     */
    public function recordVisit(Request $request): array
    {
        $today = now()->format('Y-m-d');
        $yesterday = now()->subDay()->format('Y-m-d');
        $thisMonth = now()->format('Y-m');

        // Lấy tất cả cài đặt chỉ với 1 câu query duy nhất thay vì 3-5 câu
        $settingsMap = SystemSetting::whereIn('key', [
            'stats_active_sessions',
            'stats_visits_daily',
            'stats_total_visits'
        ])->pluck('value', 'key');

        // 1. Quản lý sessions online (trong vòng 10 phút gần nhất)
        $ip = $request->ip() ?? '127.0.0.1';
        $ua = $request->header('User-Agent') ?? 'unknown';
        $clientSessionId = $request->input('session_id');
        $sessionKey = $clientSessionId ?: md5($ip . '|' . substr($ua, 0, 50));

        $activeSessionsJson = $settingsMap['stats_active_sessions'] ?? '[]';
        $activeSessions = json_decode($activeSessionsJson, true) ?: [];

        $nowTs = now()->timestamp;
        $tenMinutesAgo = $nowTs - 600;

        // Lọc bỏ session cũ quá 10 phút
        $activeSessions = array_filter($activeSessions, fn($ts) => $ts >= $tenMinutesAgo);

        // Kiểm tra xem session này đã được tính lượt xem trong 10 phút qua chưa (tránh spam refresh)
        $isNewVisit = !isset($activeSessions[$sessionKey]);
        $activeSessions[$sessionKey] = $nowTs;

        // Lưu lại active sessions
        SystemSetting::set('stats_active_sessions', json_encode($activeSessions), 'Active user sessions in last 10 mins');

        // 2. Cập nhật lượt truy cập ngày và tổng
        $dailyJson = $settingsMap['stats_visits_daily'] ?? '{}';
        $daily = json_decode($dailyJson, true) ?: [];

        $totalVisits = (int) ($settingsMap['stats_total_visits'] ?? 0);

        if ($isNewVisit) {
            $totalVisits += 1;
            $daily[$today] = ($daily[$today] ?? 0) + 1;

            // Giới hạn chỉ giữ tối đa 60 ngày gần nhất
            if (count($daily) > 60) {
                ksort($daily);
                $daily = array_slice($daily, -60, null, true);
            }

            SystemSetting::set('stats_total_visits', (string) $totalVisits, 'Total website visits');
            SystemSetting::set('stats_visits_daily', json_encode($daily), 'Daily website visits count');
            Cache::forget('visit_tracker_stats');
        }

        // 3. Tính toán số liệu thống kê
        $todayVisits = $daily[$today] ?? 1;
        $yesterdayVisits = $daily[$yesterday] ?? 0;

        $monthVisits = 0;
        foreach ($daily as $date => $count) {
            if (str_starts_with($date, $thisMonth)) {
                $monthVisits += (int) $count;
            }
        }

        $onlineCount = max(1, count($activeSessions));

        return [
            'total_visits' => $totalVisits,
            'today_visits' => $todayVisits,
            'yesterday_visits' => $yesterdayVisits,
            'this_month_visits' => max($todayVisits, $monthVisits),
            'online_visitors' => $onlineCount,
        ];
    }

    /**
     * Lấy thống kê hiện tại (không tăng lượt xem - cache 30s giảm tải DB)
     */
    public function getStats(): array
    {
        return Cache::remember('visit_tracker_stats', 30, function () {
            $today = now()->format('Y-m-d');
            $yesterday = now()->subDay()->format('Y-m-d');
            $thisMonth = now()->format('Y-m');

            $settingsMap = SystemSetting::whereIn('key', [
                'stats_active_sessions',
                'stats_visits_daily',
                'stats_total_visits'
            ])->pluck('value', 'key');

            $totalVisits = (int) ($settingsMap['stats_total_visits'] ?? 0);
            $daily = json_decode($settingsMap['stats_visits_daily'] ?? '{}', true) ?: [];

            $activeSessions = json_decode($settingsMap['stats_active_sessions'] ?? '[]', true) ?: [];
            $tenMinutesAgo = now()->timestamp - 600;
            $activeSessions = array_filter($activeSessions, fn($ts) => $ts >= $tenMinutesAgo);

            $todayVisits = $daily[$today] ?? 0;
            $yesterdayVisits = $daily[$yesterday] ?? 0;

            $monthVisits = 0;
            foreach ($daily as $date => $count) {
                if (str_starts_with($date, $thisMonth)) {
                    $monthVisits += (int) $count;
                }
            }

            return [
                'total_visits' => $totalVisits,
                'today_visits' => $todayVisits,
                'yesterday_visits' => $yesterdayVisits,
                'this_month_visits' => max($todayVisits, $monthVisits),
                'online_visitors' => max(1, count($activeSessions)),
            ];
        });
    }

    /**
     * Tùy chỉnh / Đặt lại con số cơ sở (Dành cho Quản trị viên)
     */
    public function setBaseline(int $total): array
    {
        SystemSetting::set('stats_total_visits', (string) $total, 'Total website visits baseline');
        return $this->getStats();
    }
}
