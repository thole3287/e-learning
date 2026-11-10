@echo off
chcp 65001 >nul
title Khởi Động Hệ Thống Thi Trắc Nghiệm Trực Tuyến E-Exam (Local)

cd /d "%~dp0"

echo =====================================================================
echo    ĐANG KHỞI ĐỘNG HỆ THỐNG THI TRẮC NGHIỆM TRỰC TUYẾN (E-EXAM)
echo =====================================================================
echo.

:: 1. Kiểm tra và bật MySQL 8.4
echo [1/4] Đang kiểm tra MySQL Database (Port 3306)...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo       - MySQL đang chạy sẵn sàng.
) else (
    echo       - Đang khởi động MySQL...
    start "MySQL Database Server" /MIN "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe" --defaults-file="C:\laragon\bin\mysql\mysql-8.4.3-winx64\my.ini" --console
    ping -n 4 127.0.0.1 >nul
)

:: 2. Kiểm tra và bật Redis (Port 6379)
echo [2/4] Đang kiểm tra Redis Cache (Port 6379)...
tasklist /FI "IMAGENAME eq redis-server.exe" 2>NUL | find /I /N "redis-server.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo       - Redis đang chạy sẵn sàng.
) else (
    echo       - Đang khởi động Redis...
    start "Redis Cache Server" /MIN "C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-server.exe" "C:\laragon\bin\redis\redis-x64-5.0.14.1\redis.windows.conf"
    ping -n 2 127.0.0.1 >nul
)

:: 3. Khởi động Backend Laravel API
echo [3/4] Đang khởi động Backend Laravel API (Port 8000)...
start "E-Exam Backend API (Port 8000)" cmd /k "title E-Exam Backend API (Port 8000) && cd /d "%~dp0backend" && set "PATH=C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64;%%PATH%%" && echo Dang chay Laravel API tai http://127.0.0.1:8000 ... && php artisan serve --port=8000"

:: 4. Khởi động Frontend Vite
echo [4/4] Đang khởi động Frontend Vite Server (Port 5173)...
start "E-Exam Frontend (Port 5173)" cmd /k "title E-Exam Frontend (Port 5173) && cd /d "%~dp0frontend" && echo Dang chay Frontend tai http://localhost:5173 ... && npm run dev"

:: Chờ 3 giây để các tiến trình khởi tạo
ping -n 4 127.0.0.1 >nul

echo.
echo =====================================================================
echo    KHỞI ĐỘNG HOÀN TẤT! HỆ THỐNG ĐÃ SẴN SÀNG TRÊN TRÌNH DUYỆT:
echo =====================================================================
echo.
echo  * Frontend: http://localhost:5173
echo  * Backend : http://127.0.0.1:8000
echo.
echo  * Tài khoản đăng nhập mẫu:
echo    - Giáo viên : teacher_math / Teacher@123456
echo    - Học sinh  : student1     / Student@123456
echo    - Quản trị  : admin        / Admin@123456
echo.
echo  (Đang tự động mở trình duyệt tới http://localhost:5173 ...)
echo =====================================================================
echo.

start http://localhost:5173

pause