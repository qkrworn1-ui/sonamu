@echo off
chcp 65001 >nul
title [소나무] 깃허브 실시간 자동 커밋 & 푸시 감시기
cd /d "%~dp0"

echo ======================================================
echo    소나무 족구단 실시간 자동 커밋 & 푸시 서비스 가동
echo    (코드 수정이 감지되면 자동으로 깃허브에 업로드됩니다)
echo    * 이 창을 띄워두거나 최소화해 두시면 계속 작동합니다.
echo    * 중단하려면 이 창을 닫아주세요.
echo ======================================================
echo.

:LOOP
set HAS_CHANGE=
for /f "delims=" %%i in ('git status --porcelain 2^>nul') do (
    set HAS_CHANGE=1
)

if defined HAS_CHANGE (
    echo.
    echo ------------------------------------------------------
    echo [%TIME:~0,8%] 파일 수정 감지! 깃허브 자동 푸시 진행...
    git add .
    set NOW_DATE=%date%
    set NOW_TIME=%time:~0,5%
    git commit -m "소나무 시스템 자동 커밋 (%NOW_DATE% %NOW_TIME%)"
    git push origin main
    echo [%TIME:~0,8%] ✅ 깃허브 푸시 완료! 다음 수정을 감시 중...
    echo ------------------------------------------------------
)

timeout /t 10 /nobreak >nul
goto LOOP
