if(window.top !== window.self) window.top.location = window.location;
        window.escapeHtml = text => String(text||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
        window.getTeamPts = v => { if(!v || v==='pending'||v==='미정') return 0; let p=2; if(v==='attend'||v==='참석'||v==='late'||v==='늦참') p+=3; return p; };
        window.getBoardPts = v => { const vArray = Array.isArray(v) ? v : (v ? [v] : []); const baseVArray = vArray.map(val => String(val).replace('_p', '')); if (baseVArray.length > 0 && !baseVArray.includes('미정')) return 2; return 0; };
        
        // --- [테마 초기화] 다크모드 설정 ---
        (function() {
            const savedTheme = localStorage.getItem('sonamu_theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            }
        })();

        // --- [보안 추가] 우클릭, 개발자도구 단축키 차단 및 콘솔 로그 무효화 ---
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) e.preventDefault();
        });
        // [수정] 디버깅 및 실시간 동기화 확인을 위해 콘솔 로그 무효화 로직 제거
        // if (typeof console !== "undefined") { console.log = function(){}; console.warn = function(){}; console.info = function(){}; }
        
        window.onerror = function(m, u, l, c, e) { console.error("Unhandled Error:", m, e); return false; };
        window.onunhandledrejection = function(e) { e.preventDefault(); return true; };
        function formatPhoneInput(el) { let v=el.value.replace(/[^0-9]/g,''), r=''; if(v.length<4) r=v; else if(v.length<8) r=v.substr(0,3)+'-'+v.substr(3); else r=v.substr(0,3)+'-'+v.substr(3,4)+'-'+v.substr(7,4); el.value=r; }
        try { if(window.sessionStorage && window.sessionStorage.getItem('sonamu_user_role')) { document.documentElement.classList.add('app-loaded'); window._sRole = btoa(encodeURIComponent(window.sessionStorage.getItem('sonamu_user_role'))); } } catch(e) {}
        
        setInterval(() => {
            try {
                if(window._sRole && window.sessionStorage) {
                    const currentRole = window.sessionStorage.getItem('sonamu_user_role');
                    if(currentRole && window._sRole !== btoa(encodeURIComponent(currentRole))) window.logout();
                }
            } catch(e) {}
        }, 1500);