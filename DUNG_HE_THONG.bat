@echo off
chcp 65001 >nul
title Dừng Hệ Thống E-Exam (Local)

echo =====================================================================
echo    ĐANG DỪNG CÁC DỊCH VỤ CỦA HỆ THỐNG E-EXAM...
echo =====================================================================
echo.

taskkill /F /IM php.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo.
echo Đã tắt các tiến trình Backend (PHP) và Frontend (Vite / Node).
echo.
echo Lưu ý: MySQL vẫn được giữ chạy ngầm để đảm bảo dữ liệu toàn vẹn.
echo Nếu muốn tắt MySQL, bạn có thể bấm nút "Stop" trên giao diện Laragon.
echo =====================================================================
echo.
pause