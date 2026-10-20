@echo off
chcp 65001 >nul
title 소나무 족구단 GitHub 즉시 푸시
cd /d "%~dp0"

echo ==============================================
echo   소나무 족구단 GitHub 즉시 커밋 & 푸시
echo ==============================================
echo.

set HAS_CHANGE=
for /f "delims=" %%i in ('git status --porcelain 2^>nul') do (
    set HAS_CHANGE=1
)

if not defined HAS_CHANGE (
    echo [안내] 변경된 파일이 없습니다. (현재 최신 상태입니다)
    echo.
    timeout /t 3 >nul
    exit /b
)

echo [1/3] 변경 파일 등록 중 (git add)...
git add .

set NOW_DATE=%date%
set NOW_TIME=%time:~0,5%
set COMMIT_MSG=소나무 시스템 업데이트 (%NOW_DATE% %NOW_TIME%)

if not "%~1"=="" (
    set COMMIT_MSG=%~1
)

echo [2/3] 커밋 생성 중 (%COMMIT_MSG%)...
git commit -m "%COMMIT_MSG%"

echo [3/3] 깃허브로 전송 중 (git push)...
git push origin main

echo.
echo ==============================================
echo   ✅ 성공적으로 깃허브에 푸시되었습니다!
echo ==============================================
echo.
timeout /t 3 >nul
