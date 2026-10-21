// --- [테마 전용] 테마 상태 영속화 및 다크/라이트 모드 상호작용 ---
window.updateThemeIcons = (isDark) => {
    try {
        const mBtn = document.getElementById('theme-toggle-btn');
        const mIcon = document.getElementById('theme-icon-m');
        if (mBtn) {
            mBtn.innerHTML = `<i id="theme-icon-m" data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 pointer-events-none"></i>`;
        } else if (mIcon) {
            mIcon.outerHTML = `<i id="theme-icon-m" data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 pointer-events-none"></i>`;
        }
        const dIcon = document.getElementById('theme-icon-d');
        if (dIcon) {
            dIcon.outerHTML = `<i id="theme-icon-d" data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 pointer-events-none"></i>`;
        }
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch(e) {
        console.warn('Icon update warning:', e);
    }
};

window.syncTheme = () => {
    try {
        let savedTheme = localStorage.getItem('sonamu_theme') || localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        const isDark = (savedTheme === 'dark');
        document.documentElement.classList.toggle('dark', isDark);
        window.updateThemeIcons(isDark);
    } catch(e) {}
};

window.toggleTheme = (e) => {
    if (e) {
        try {
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        } catch(err) {}
    }
    
    // 1. HTML 태그에 dark 클래스 즉각 반전
    const isDark = document.documentElement.classList.toggle('dark');
    const themeName = isDark ? 'dark' : 'light';
    
    // 2. localStorage에 즉시 영속화
    try {
        localStorage.setItem('sonamu_theme', themeName);
        localStorage.setItem('theme', themeName);
    } catch(err) {
        console.warn('Theme storage warning:', err);
    }
    
    // 3. 아이콘 즉각 갱신
    window.updateThemeIcons(isDark);
    
    // 4. Chart.js 차트 색상 부드러운 리프레시 (활성화되어 있는 경우에만 안전 호출)
    try {
        if (window.dashboardChartInstance && typeof window.renderDashboardCharts === 'function') {
            window.renderDashboardCharts();
        }
    } catch(err) {}
    
    // 5. 토스트 알림 표시
    if (typeof window.showToast === 'function') {
        window.showToast(isDark ? "🌙 다크 모드가 활성화되었습니다." : "☀️ 화이트(라이트) 모드가 활성화되었습니다.");
    }
};

// 스크립트 로드 시 즉시 동기화 실행
window.syncTheme();
