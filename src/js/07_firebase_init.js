// --- [테마 전용] 다크모드 상호작용 ---
window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('sonamu_theme', isDark ? 'dark' : 'light');
    const dIcon = window.$('theme-icon-d'), mIcon = window.$('theme-icon-m');
    if (dIcon) dIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (mIcon) mIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) window.lucide.createIcons();
    if (typeof window.renderMemberList === 'function') window.renderMemberList();
    if (typeof window.renderPositions === 'function') window.renderPositions();
    if (typeof window.updateUI === 'function') window.updateUI();
    window.showToast(isDark ? "다크 모드가 활성화되었습니다." : "라이트 모드가 활성화되었습니다.");
};
