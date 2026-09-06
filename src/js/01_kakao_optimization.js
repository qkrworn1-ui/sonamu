// --- [0. 환경별 최적화 - 카카오톡 강제 전환] ---
(function() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('kakaotalk')) {
        const currentUrl = window.location.href;
        if (ua.includes('android')) {
            // 안드로이드: 인텐트 스키마를 통해 크롬 브라우저 강제 호출
            location.href = 'intent://' + currentUrl.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
        }
    }
})();
