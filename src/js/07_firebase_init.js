// --- [테마 전용] 테마 상태 영속화 및 다크/라이트 모드 상호작용 ---
window.syncTheme = () => {
    try {
        const savedTheme = localStorage.getItem('sonamu_theme') || localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        }
        const isDark = document.documentElement.classList.contains('dark');
        const dIcon = window.$('theme-icon-d'), mIcon = window.$('theme-icon-m');
        if (dIcon) dIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        if (mIcon) mIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        if (window.lucide) window.lucide.createIcons();
    } catch(e) {}
};

window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    try {
        localStorage.setItem('sonamu_theme', theme);
        localStorage.setItem('theme', theme);
    } catch(e) {}
    window.syncTheme();
    if (typeof window.renderMemberList === 'function') window.renderMemberList();
    if (typeof window.renderPositions === 'function') window.renderPositions();
    if (typeof window.updateUI === 'function') window.updateUI();
    window.showToast(isDark ? "다크 모드가 활성화되었습니다." : "라이트 모드가 활성화되었습니다.");
};

// 스크립트 로드 시 즉시 동기화 실행
window.syncTheme();
