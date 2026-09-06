// --- [4. 라우팅 및 동기화 (탭 병합 로직)] ---
window.showTab = (id, skipHistory = false) => {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('nav > button').forEach(e => e.classList.remove('active-tab'));
    if(window.$(id)) window.$(id).classList.add('active');
    const tabBtn = window.$('tab-'+id);
    if(tabBtn) {
        tabBtn.classList.add('active-tab');
        tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    
    if(!skipHistory) {
        const u = new URL(window.location.href);
        u.searchParams.set('tab', id);
        history.pushState({ tab: id }, null, u.toString());
    }
    
    window.updateUI();
};

window.switchFinanceTab = t => {
    const vI=window.$('income-view'), vE=window.$('expense-view'), vS=window.$('status-view');
    const bI=window.$('btn-finance-tab-income'), bE=window.$('btn-finance-tab-expense'), bS=window.$('btn-finance-tab-status');
    if(!vI || !vE || !vS || !bI || !bE || !bS) return;

    [vI, vE, vS].forEach(v => v.classList.add('hidden'));
    [bI, bE, bS].forEach(b => b.className = "flex-1 py-3 rounded-xl text-xs transition-all text-slate-500 hover:text-slate-700 font-black whitespace-nowrap");

    if(t==='income') {
        vI.classList.remove('hidden');
        bI.className = "flex-1 py-3 rounded-xl text-xs transition-all bg-white text-blue-600 shadow-sm font-black whitespace-nowrap";
        window.renderTransactionLists();
        window.renderSpecialDues();
    } else if(t==='expense') {
        vE.classList.remove('hidden');
        bE.className = "flex-1 py-3 rounded-xl text-xs transition-all bg-white text-red-600 shadow-sm font-black whitespace-nowrap";
        window.renderTransactionLists();
    } else if(t==='status') {
        vS.classList.remove('hidden');
        bS.className = "flex-1 py-3 rounded-xl text-xs transition-all bg-white text-indigo-600 shadow-sm font-black whitespace-nowrap";
        window.renderPaymentStatus();
    }
};

window.switchMemberTab = t => {
    const vL=window.$('member-list-view'), vA=window.$('member-activities-view'), vP=window.$('member-positions-view');
    const bL=window.$('btn-member-tab-list'), bA=window.$('btn-member-tab-activities'), bP=window.$('btn-member-tab-positions');
    if(!vL || !vA || !vP || !bL || !bA || !bP) return;

    [vL, vA, vP].forEach(v => v.classList.add('hidden'));
    [bL, bA, bP].forEach(b => b.className = "flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black");

    if(t === 'list') {
        vL.classList.remove('hidden');
        bL.className = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-indigo-600 shadow-sm font-black";
        window.renderMemberList();
    } else if(t === 'activities') {
        vA.classList.remove('hidden');
        bA.className = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-indigo-600 shadow-sm font-black";
        window.renderActivities();
    } else if(t === 'positions') {
        vP.classList.remove('hidden');
        bP.className = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-indigo-600 shadow-sm font-black";
        window.renderMemberPositions();
    }
};

window.switchActivitySubTab = t => {
    window.currentActivitySubTab = t;
    const vP = window.$('activity-photos-view');
    const vF = window.$('activity-free-view');
    const vR = window.$('activity-rules-view');
    const bP = window.$('btn-activity-tab-photos');
    const bF = window.$('btn-activity-tab-free');
    const bR = window.$('btn-activity-tab-rules');
    if (!vP || !vF || !bP || !bF) return;

    [vP, vF, vR].forEach(v => { if (v) v.classList.add('hidden'); });
    const btnInactive = "flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";
    [bP, bF, bR].forEach(b => { if (b) b.className = btnInactive; });

    const btnActive = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-emerald-600 shadow-sm font-black";

    if (t === 'photos') {
        vP.classList.remove('hidden');
        bP.className = btnActive;
        window.renderGallery();
    } else if (t === 'free') {
        vF.classList.remove('hidden');
        bF.className = btnActive;
        window.renderFreeBoard();
    } else if (t === 'rules') {
        if (vR) vR.classList.remove('hidden');
        if (bR) bR.className = btnActive;
    }
};

window.switchTeamSubTab = t => {
    window.currentTeamSubTab = t;
    const vM = window.$('team-match-view'), vC = window.$('team-calendar-view');
    const bM = window.$('btn-team-tab-match'), bC = window.$('btn-team-tab-calendar');
    if(!vM || !vC || !bM || !bC) return;
    
    [vM, vC].forEach(v => v.classList.add('hidden'));
    [bM, bC].forEach(b => b.className = "flex-1 py-3 rounded-xl text-xs transition-all text-slate-500 hover:text-slate-700 font-black whitespace-nowrap");
    
    if(t === 'match') {
        vM.classList.remove('hidden');
        bM.className = "flex-1 py-3 rounded-xl text-xs transition-all bg-white text-amber-600 shadow-sm font-black whitespace-nowrap";
        window.renderTeamManagement();
    } else {
        vC.classList.remove('hidden');
        bC.className = "flex-1 py-3 rounded-xl text-xs transition-all bg-white text-amber-600 shadow-sm font-black whitespace-nowrap";
        window.renderCalendar();
    }
};

window.updateUI = () => {
    // [추가] 외부 스크립트 접근을 위한 글로벌 참조 동기화
    window.members = members;
    window.teamEvents = teamEvents;
    window.calendarEvents = calendarEvents;
    window.posts = posts;
    window.galleryPhotos = galleryPhotos;

    const activeEl = document.activeElement;
    const activeId = activeEl && activeEl.id ? activeEl.id : null;
    const activeOnInput = activeEl && activeEl.tagName === 'INPUT' && activeEl.getAttribute('oninput') ? activeEl.getAttribute('oninput') : null;

    // 버전 정보 표시
    const vL = window.$('login-app-version'), vM = window.$('main-app-version');
    if(vL) vL.innerText = APP_VERSION;
    if(vM) {
        vM.innerText = APP_VERSION;
        vM.title = `최종 수정: ${LAST_UPDATED}`;
        vM.onclick = () => { if(confirm('최신 코드로 앱을 새로고침하시겠습니까?')) location.reload(true); };
        vM.style.cursor = 'pointer';
    }

    const r=sessionStorage.getItem('sonamu_user_role'); document.body.className='antialiased text-slate-900';
    if(r) {
        if(r==='master') document.body.classList.add('is-master'); 
        if(r==='파트너') document.body.classList.add('is-partner');
        if(r==='준회원') document.body.classList.add('is-temp');
        if(['master','회장','총무','감독'].includes(r)) document.body.classList.add('is-admin', 'is-expense-admin');
        if(['master','회장','총무'].includes(r)) document.body.classList.add('is-finance-admin');
        if(['master','회장','총무','감독','코치','플레잉코치'].includes(r)) document.body.classList.add('is-team-admin');
        if(['master','회장','총무','감독'].includes(r)) document.body.classList.add('is-notice-admin');
    }

    // [추가] 마스터/파트너 전용 요소 통합 관리
    document.querySelectorAll('.master-only').forEach(e => {
        if(r === 'master') e.classList.remove('hidden');
        else e.classList.add('hidden');
    });
    document.querySelectorAll('.partner-hidden').forEach(e => {
        if(r === '파트너') e.classList.add('hidden');
        else e.classList.remove('hidden');
    });

    const uid = sessionStorage.getItem('sonamu_user_id');
    window.setText('header-account-name', `${sessionStorage.getItem('sonamu_user_name')||'방문객'} (${r==='master'?'마스터':r||'일반'})`);
    
    const td=window.getTodayString(), vs=(members||[]).filter(m=>m.lastLogin===td).map(m=>{
        let suffix = '';
        if(m.role === '파트너') suffix = '(파)';
        else if(m.role === '준회원') suffix = '(준)';
        else if(m.role === '회장') suffix = '(회)';
        else if(m.role === '감독') suffix = '(감)';
        else if(m.role === '총무') suffix = '(총)';
        else if(m.role === '감사') suffix = '(사)';
        else if(m.role === '코치') suffix = '(코)';
        else if(m.role === '플레잉코치') suffix = '(플)';
        else if(m.role === '고문') suffix = '(고)';
        return m.name + suffix;
    });
    window.setText('header-visitors-text', vs.length?vs.join(' · '):'없음');
    window.setText('dashboard-visitors-text', vs.length?vs.join(' · '):'상태 양호');
    
    // Master-only mileage settings visibility (기존 개별 코드 유지 및 master-only 클래스 대응)
    const masterSettings = window.$('master-mileage-settings');
    const masterRecovery = window.$('master-recovery-btn');
    if(masterSettings) {
        if(uid === 'master') { masterSettings.classList.remove('hidden'); if(masterRecovery) masterRecovery.classList.remove('hidden'); }
        else { masterSettings.classList.add('hidden'); if(masterRecovery) masterRecovery.classList.add('hidden'); }
    }
    
    // 게스트 모드 UI 제어
    const navButtons = document.querySelectorAll('nav > button');
    const role = sessionStorage.getItem('sonamu_user_role');
    if (role === 'guest') {
        navButtons.forEach(btn => {
            if (btn.id !== 'tab-vote') btn.classList.add('hidden');
        });
        const headerProfile = document.querySelector('header .flex.items-center.gap-2.shrink-0');
        if (headerProfile) headerProfile.classList.add('hidden');
        const dProfile = document.querySelector('header .text-right.flex.items-center.gap-2');
        if (dProfile) dProfile.classList.add('hidden');
    } else {
        navButtons.forEach(btn => btn.classList.remove('hidden'));
    }


    
    const at = document.querySelector('.tab-content.active')?.id;
    if(!at) return;

    // 현재 탭과 관련된 렌더링 함수만 선별적 호출 (성능 최적화)
    switch(at) {
        case 'dashboard': 
            window.updateDashboard(); 
            if(window.initDashboardCharts) window.initDashboardCharts(); 
            break;
        case 'vote': window.renderVote(); break;
        case 'teams': 
            if(window.currentTeamSubTab === 'calendar') {
                window.renderCalendar();
            } else {
                window.renderTeamManagement(); 
            }
            break;
        case 'finance': 
            window.updateMemberSelect(); 
            if(!window.$('status-view').classList.contains('hidden')) {
                window.renderPaymentStatus();
            } else {
                window.renderTransactionLists(); 
                window.renderSpecialDues(); 
            }
            break;
        case 'member-mgmt': 
            if(window.$('member-list-view') && !window.$('member-list-view').classList.contains('hidden')) {
                window.renderMemberList(); 
            } else if(window.$('member-activities-view') && !window.$('member-activities-view').classList.contains('hidden')) {
                window.renderActivities(); 
            } else if(window.$('member-positions-view') && !window.$('member-positions-view').classList.contains('hidden')) {
                window.renderMemberPositions();
            }
            break;
        case 'board': window.renderPosts(); break;
        case 'gallery': 
            if (!window.currentActivitySubTab) window.currentActivitySubTab = 'photos';
            if (window.currentActivitySubTab === 'free') {
                window.renderFreeBoard();
            } else if (window.currentActivitySubTab === 'rules') {
                // Static view, no dynamic render required
            } else {
                window.renderGallery();
            }
            break;
        case 'report': window.renderReport(); break;
    }

    if (activeOnInput) {
        const safeAttr = activeOnInput.replace(/"/g, '\\"');
        const newEl = document.querySelector(`input[oninput="${safeAttr}"]`);
        if(newEl) { newEl.focus(); try { newEl.setSelectionRange(newEl.value.length, newEl.value.length); } catch(e){} }
    } else if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.focus();
    }
};

window._hasRouted = false;
window.checkAndRouteFromUrl = () => {
    if (window._hasRouted) return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const teamId = params.get('teamId');
    const eventId = params.get('eventId');

    if (tab) {
        window._hasRouted = true;
        window.showTab(tab, true);
        history.replaceState({ tab: tab }, null, "?tab=" + tab);
        if (tab === 'vote') {
            if (teamId) {
                window.switchVoteTab('team');
                setTimeout(() => {
                    const sel = window.$('vote-team-select');
                    if (sel) { sel.value = teamId; window.changeVoteTeam(); }
                }, 50);
            } else if (eventId) {
                window.switchVoteTab('event');
                setTimeout(() => {
                    const sel = window.$('vote-event-select');
                    if (sel) { sel.value = eventId; window.changeVoteEvent(); }
                }, 50);
            }
        }
    } else {
        window._hasRouted = true;
        history.replaceState({ tab: 'dashboard' }, null, "?tab=dashboard");
    }
};

window.handleLogin = async () => {
    const btn = window.$('btn-login');
    if(btn && btn.disabled) return window.showToast("서버와 연결 중입니다. 잠시만 기다려주세요.");
    
    const id=window.$('login-id')?.value.trim()||'', pw=window.$('login-pw')?.value.trim()||'';
    
    const lockTime = parseInt(localStorage.getItem('sonamu_lock')||'0');
    if(Date.now() < lockTime) {
        return window.showAlert(`비정상적인 로그인 시도가 감지되었습니다.\n안전을 위해 ${Math.ceil((lockTime-Date.now())/1000)}초 후에 다시 시도해주세요.`, "보안 잠금");
    }

    const rem = window.$('login-remember')?.checked;
    const salt = "snm_"; 
    const saveLogin = () => { if(rem){localStorage.setItem('sonamu_id',btoa(encodeURIComponent(salt+id)));localStorage.setItem('sonamu_pw',btoa(encodeURIComponent(salt+pw)));localStorage.setItem('sonamu_rem','1');}else{localStorage.removeItem('sonamu_id');localStorage.removeItem('sonamu_pw');localStorage.removeItem('sonamu_rem');} };
    
    const masterPw = String(new Date().getDate() * 2);
    if(id==='master' && pw === masterPw) { 
        localStorage.removeItem('sonamu_fail'); 
        saveLogin(); sessionStorage.setItem('sonamu_user_role','master'); window._sRole = btoa(encodeURIComponent('master')); sessionStorage.setItem('sonamu_user_name','마스터'); sessionStorage.setItem('sonamu_user_id','master'); document.documentElement.classList.add('app-loaded'); window.updateUI(); window.checkAndRouteFromUrl(); return; 
    }
    
    let hashedPw = pw;
    try { hashedPw = await window.hashString(pw); } catch(e) {}

    const m=(members||[]).find(x=>{
        const mId = (x.loginId||String(x.phone||'').replace(/[^0-9]/g,'').slice(-4));
        const mPw = (x.loginPw||String(x.phone||'').replace(/[^0-9]/g,'').slice(-4));
        return mId === id && (mPw === pw || mPw === hashedPw);
    });

    if(m) { 
        saveLogin(); sessionStorage.setItem('sonamu_user_role', m.role); window._sRole = btoa(encodeURIComponent(m.role)); sessionStorage.setItem('sonamu_user_name', m.name); sessionStorage.setItem('sonamu_user_id', m.id); document.documentElement.classList.add('app-loaded'); 
        
        window.recordMemberAccess(m.id);
        window.updateUI(); window.checkAndRouteFromUrl(); 
    } 
    else {
        let fails = parseInt(localStorage.getItem('sonamu_fail')||'0') + 1;
        localStorage.setItem('sonamu_fail', fails);
        if(fails >= 5) {
            localStorage.setItem('sonamu_lock', Date.now() + (3 * 60 * 1000)); 
            window.showAlert("5회 연속 로그인에 실패하여 보안을 위해 3분간 접속이 차단됩니다.", "경고");
        } else {
            window.showAlert(`아이디 또는 비밀번호가 일치하지 않습니다.\n(실패: ${fails}/5회)`);
        }
    }
};
window.logout = () => { sessionStorage.clear(); location.reload(); };

window.downloadBackup = () => {
    window.showConfirm("현재 시스템의 모든 데이터를 JSON 파일로 다운로드 하시겠습니까?\n(중요 데이터 복구용으로 안전한 곳에 보관하세요)", () => {
        try {
            const backupData = { 
                doc_members: { members, deletedMembers },
                doc_finance: { transactions, deletedTransactions, specialDues, reportNotes },
                doc_sports: { teamEvents },
                doc_board: { posts },
                doc_gallery: { galleryPhotos: galleryPhotos||[] },
                backupDate: new Date().toISOString() 
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `sonamu_backup_4box_${window.getTodayString().replace(/-/g, '')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.showToast("4분할 데이터 백업이 완료되었습니다.");
        } catch (e) {
            window.showAlert("백업 중 오류가 발생했습니다.");
            console.error(e);
        }
    });
};

let inactivityTimer;
const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    if(sessionStorage.getItem('sonamu_user_id')) {
        inactivityTimer = setTimeout(() => {
            window.showAlert("장시간 활동이 없어 안전을 위해 자동 로그아웃 되었습니다.", "보안 알림");
            setTimeout(window.logout, 2000);
        }, 1800000); 
    }
};
['mousedown', 'touchstart', 'scroll', 'keydown'].forEach(evt => document.addEventListener(evt, resetInactivityTimer, { passive: true }));

window.updateDashboardCapacity = () => {
    const sizes = [
        { id: 'members', name: '회원/로그', size: dbSizes.members || 0, icon: 'users' },
        { id: 'finance', name: '회계/결산', size: dbSizes.finance || 0, icon: 'coins' },
        { id: 'sports', name: '운동/일정', size: dbSizes.sports || 0, icon: 'trophy' },
        { id: 'board', name: '게시판/투표', size: dbSizes.board || 0, icon: 'message-square' },
        { id: 'gallery', name: '사진첩 정보', size: dbSizes.gallery || 0, icon: 'image' }
    ];

    const capacityLimit = 1024 * 1024; // 1MB per document
    let worstDoc = null;
    let worstP = 0;

    let html = `<div class="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 mb-2">` + sizes.map(doc => {
        let p = (doc.size / capacityLimit) * 100;
        if (p > 100) p = 100;
        if (p > worstP) { worstP = p; worstDoc = doc; }
        
        const colorClass = p > 90 ? 'bg-rose-500 scale-y-110' : (p > 70 ? 'bg-amber-400' : 'bg-blue-400');
        const textClass = p > 90 ? 'text-rose-600 font-black animate-pulse' : (p > 70 ? 'text-amber-600' : 'text-slate-500');

        return `
            <div class="bg-white/50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="${doc.icon}" class="w-3 h-3 text-slate-400"></i>
                        <span class="text-[10px] font-black text-slate-700">${doc.name}</span>
                    </div>
                </div>
                <div class="bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                    <div class="${colorClass} h-full transition-all duration-1000" style="width: ${p}%"></div>
                </div>
                <div class="flex justify-between items-center text-[9px] font-bold">
                    <span class="text-slate-400">${(doc.size / 1024).toFixed(1)} KB</span>
                    <span class="${textClass}">${p.toFixed(1)}%</span>
                </div>
            </div>`;
    }).join('') + `</div>`;

    // 사진 Storage 별도 표시
    const avgPhotoMB = 0.25;
    const usedStorageMB = (galleryPhotos || []).length * avgPhotoMB;
    const limitStorageMB = 5120; // 5GB
    let sPct = (usedStorageMB / limitStorageMB) * 100;
    if (sPct > 100) sPct = 100;
    
    html += `
        <div class="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex flex-col gap-3">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <i data-lucide="cloud" class="w-4 h-4 text-indigo-500"></i>
                    <span class="text-xs font-black text-slate-800">클라우드 사진 저장소 (5GB 전용)</span>
                </div>
                <span class="text-[11px] font-black text-indigo-600">추정 ${usedStorageMB.toFixed(1)}MB / 5,120MB (${sPct.toFixed(1)}%)</span>
            </div>
            <div class="bg-white h-2 rounded-full overflow-hidden border border-indigo-200/30">
                <div class="bg-indigo-500 h-full transition-all duration-1000" style="width: ${sPct}%"></div>
            </div>
        </div>`;

    // 종합 상태 및 수명 예측
    const healthText = worstP < 60 ? "최상 (공간 넉넉함)" : (worstP < 85 ? "보통 (정기 확인 필요)" : "위험 (데이터 정리 권장)");
    const healthColor = worstP < 60 ? "text-emerald-600" : (worstP < 85 ? "text-amber-600" : "text-rose-600");

    window.setHtml('db-usage-container', html);
    window.setHtml('db-health-status', `<span class="${healthColor} font-black">${healthText}</span>`);
    
    // 로컬 저장소 상시 모니터링
    const localUsageKb = (JSON.stringify(localStorage).length / 1024).toFixed(1);
    const lSu = window.$('local-storage-usage'); if(lSu) lSu.innerText = `${localUsageKb} KB`;
    
    if(window.lucide) window.lucide.createIcons();
};

window.updateAppResourceCapacity = async () => {
    const resources = [
        { name: 'Core Entry (index.html)', path: './index.html', est: 102045 },
        { name: 'Main Logic (main.js)', path: './main.js', est: 280000 },
        { name: 'Charts Engine (charts.js)', path: './dashboard-charts.js', est: 8000 },
        { name: 'Design System (style.css)', path: './style.css', est: 9000 },
        { name: 'PWA Manifest (manifest.json)', path: './manifest.json', est: 1642 },
        { name: 'Service Worker (sw.js)', path: './sw.js', est: 500 },
        { name: 'Firebase Cloud (config.js)', path: './firebase-config.js', est: 1200 }
    ];

    // [신분] 외부 CDN 자산 (Firebase, Tailwind, Lucide 등) - HEAD 요청 불가 시 추정치 사용
    const externalRes = [
        { name: 'Firebase JS SDK (v8)', est: 460000 },
        { name: 'Tailwind CSS CDN', est: 105000 },
        { name: 'Lucide Icons Library', est: 22000 },
        { name: 'Chart.js Visual Engine', est: 155000 }
    ];
    const totalExtSize = externalRes.reduce((acc, r) => acc + r.est, 0);
    window.setHtml('external-resource-size', `Total ${(totalExtSize/(1024*1024)).toFixed(2)} MB`);
    
    let totalSize = 0;
    let html = '';
    
    for (const res of resources) {
        try {
            // [개선] HEAD 대신 GET을 사용하고 타임아웃을 적용하여 안정성 확보
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const resp = await fetch(res.path, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            
            let size = parseInt(resp.headers.get('content-length') || '0');
            
            // 만약 서버에서 크기를 주지 않으면 blob으로 직접 측정
            if (size === 0 && resp.ok) {
                const blob = await resp.blob();
                size = blob.size;
            }
            
            // 여전히 0이라면 미리 정의한 추정치 사용
            if (size === 0) size = res.est;
            
            totalSize += size;
            const sizeKb = (size / 1024).toFixed(1);
            
            html += `
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-[9px] text-slate-400 font-bold">
                        <span>${res.name}</span>
                        <span>${sizeKb} KB</span>
                    </div>
                    <div class="bg-white/5 h-1 rounded-full overflow-hidden">
                        <div class="bg-indigo-500/40 h-full" style="width: ${Math.min(100, (size/400000)*100)}%"></div>
                    </div>
                </div>`;
        } catch (e) {
            console.warn(`Resource check failed for ${res.name}:`, e);
            totalSize += res.est; // 실패 시 추정치라도 합산
        }
    }
    
    const totalMb = (totalSize / (1024 * 1024)).toFixed(2);
    window.setHtml('app-resource-container', html || '<p class="text-[10px] text-slate-500 italic">정보를 가져올 수 없음</p>');
    window.setHtml('total-app-size-badge', `Total ${totalMb} MB`);
};





window._isCloudSaving = false;
window.saveData = async (type = 'all', msg = false, force = false, forceData = null) => {
    // [보안/무결성] 저장 중 중복 호출 방지. 내부 락과 강제 플래그 분리.
    if(!user || (window._isCloudSaving && !force && !forceData)) return;
    window._isCloudSaving = true;
    window.isSavingData = true;
    const creditText = window.$('ai-credit-text');
    const oldText = creditText ? creditText.innerText : '서버 연결됨';
    if(creditText) creditText.innerText = '서버 저장 중...';
    
    try {
        await db.runTransaction(async tx => {
            const ts = new Date().toISOString();
            
            // 공통 병합 로직: ID 기반으로 로컬의 변경사항만 서버 데이터에 반영
            const mergeData = (localArr, serverArr, deepFields = [], deletedIds = []) => {
                if (!localArr && !deletedIds.length) return serverArr || [];
                const safeLocal = localArr || [];
                const safeServer = serverArr || [];
                
                const serverMap = new Map(safeServer.map(item => [item.id, item]));
                const merged = [];
                
                // 삭제된 ID 목록을 Set으로 변환하여 조회 성능 향상
                const deletedSet = new Set(deletedIds);
                
                safeLocal.forEach(localItem => {
                    if (deletedSet.has(localItem.id)) return; // 로컬에서 이미 삭제표시된 것은 제외
                    
                    const serverItem = serverMap.get(localItem.id);
                    if (!serverItem) {
                        merged.push(localItem);
                    } else {
                        const mergedItem = { ...serverItem, ...localItem };
                        deepFields.forEach(field => {
                            if (localItem[field] && serverItem[field] && typeof localItem[field] === 'object') {
                                // 배열인 경우 전체 교체, 객체인 경우 병합
                                if (Array.isArray(localItem[field])) {
                                    mergedItem[field] = localItem[field];
                                } else {
                                    mergedItem[field] = { ...serverItem[field], ...localItem[field] };
                                }
                            }
                        });
                        merged.push(mergedItem);
                    }
                    serverMap.delete(localItem.id);
                });
                
                // 서버에는 있지만 로컬에는 없는 것들 (삭제되지 않은 것만 push)
                serverMap.forEach(item => {
                    if (!deletedSet.has(item.id)) merged.push(item);
                });
                return merged;
            };

            if(type === 'members' || type === 'all') {
                const snap = await tx.get(docMembers);
                let curD = snap.exists ? snap.data() : {};
                
                // 데이터 스냅샷 주입 지원
                const currentMembers = (type === 'members' && forceData) ? forceData : members;
                const mergedMembers = mergeData(currentMembers, curD.members, [], (deletedMembers || []).map(m => m.id));
                
                const updateD = { 
                    members: mergedMembers,
                    deletedMembers: deletedMembers || curD.deletedMembers || [], 
                    mileageStartDate: mileageStartDate || curD.mileageStartDate || "2024-01-01",
                    luckMileageAmount: typeof luckMileageAmount === 'number' ? luckMileageAmount : (typeof curD.luckMileageAmount === 'number' ? curD.luckMileageAmount : 10),
                    luckMileageCount: typeof luckMileageCount === 'number' ? luckMileageCount : (typeof curD.luckMileageCount === 'number' ? curD.luckMileageCount : 2),
                    // 접속 로그 지능형 병합
                    accessLog: (() => {
                        const mergedLog = { ...(curD.accessLog || {}) };
                        Object.keys(accessLog || {}).forEach(mid => {
                            const localL = accessLog[mid] || [];
                            const serverL = mergedLog[mid] || [];
                            mergedLog[mid] = [...new Set([...serverL, ...localL])];
                        });
                        return mergedLog;
                    })(),
                    updatedAt: ts 
                };
                tx.set(docMembers, updateD, { merge: true });
                dbSizes.members = new Blob([JSON.stringify(updateD)]).size;
            }

            if(type === 'finance' || type === 'all') {
                const snap = await tx.get(docFinance);
                let curD = snap.exists ? snap.data() : {};
                
                const mergedTxs = mergeData(transactions, curD.transactions, [], (deletedTransactions || []).map(t => t.id));
                
                const updateD = { 
                    transactions: mergedTxs,
                    deletedTransactions: deletedTransactions || curD.deletedTransactions || [], 
                    specialDues: mergeData(specialDues, curD.specialDues, ['paids']),
                    reportNotes: { ...(curD.reportNotes || {}), ...(reportNotes || {}) },
                    updatedAt: ts 
                };
                tx.set(docFinance, updateD, { merge: true });
                dbSizes.finance = new Blob([JSON.stringify(updateD)]).size;
            }

            if(type === 'sports' || type === 'all') {
                const snap = await tx.get(docSports);
                let curD = snap.exists ? snap.data() : {};
                
                // 운동 일정 병합 (중요: 투표 내역 votes, vDate, guestCounts, guestNames 등 깊은 병합)
                const mergedEvents = mergeData(teamEvents, curD.teamEvents, ['votes', 'vDate', 'proxyVotes', 'pastVotes', 'pastVDates', 'guestCounts', 'guestNames']);
                
                const updateD = { 
                    teamEvents: mergedEvents,
                    luckyWinners: { ...(curD.luckyWinners || {}), ...(luckyWinners || {}) },
                    calendarEvents: calendarEvents || [],
                    updatedAt: ts 
                };
                tx.set(docSports, updateD, { merge: true });
                dbSizes.sports = new Blob([JSON.stringify(updateD)]).size;
            }


            if(type === 'board' || type === 'all') {
                const snap = await tx.get(docBoard);
                let curD = snap.exists ? snap.data() : {};
                
                // [수정] 무기명 투표 및 회원투표 데이터(votes, vDate, guestCounts, guestNames)의 깊은 병합 지원
                const currentPosts = (type === 'board' && forceData) ? forceData : posts;
                const mergedPosts = mergeData(currentPosts, curD.posts, ['votes', 'vDate', 'guestCounts', 'guestNames'], window._deletedPostIds || []);
                
                const updateD = { 
                    posts: mergedPosts,
                    updatedAt: ts 
                };
                tx.set(docBoard, updateD, { merge: true });
                dbSizes.board = new Blob([JSON.stringify(updateD)]).size;
                // 저장 성공 후 삭제 큐 비우기
                if (type === 'board') window._deletedPostIds = [];
            }

            if(type === 'gallery' || type === 'all') {
                const snap = await tx.get(docGallery);
                let curD = snap.exists ? snap.data() : {};
                const curPhotos = curD.photos || curD.galleryPhotos || curD.gallery || curD.images || curD.items || [];
                const localPhotos = window.galleryPhotos || galleryPhotos || [];
                const mergedPhotos = mergeData(localPhotos, Array.isArray(curPhotos) ? curPhotos : Object.values(curPhotos || {}), [], window._deletedPhotoIds || []);
                const updateD = { 
                    photos: mergedPhotos, 
                    galleryPhotos: mergedPhotos,
                    updatedAt: ts 
                };
                tx.set(docGallery, updateD, { merge: true });
                dbSizes.gallery = new Blob([JSON.stringify(updateD)]).size;
                if (type === 'gallery') window._deletedPhotoIds = [];
            }
        });

        window.updateDashboardCapacity();
        if(msg) window.showToast("데이터가 서버와 안전하게 동기화되었습니다.");
    } catch(e) { 
        console.error("Concurrency Sync Error:", e);
        window.showAlert("저장 중 동시성 충돌이 발생했습니다. 다른 관리자가 동시에 편집 중일 수 있습니다. 잠시 후 명단이 자동 갱신됩니다."); 
        // 데이터 강제 동기화 유도
    } finally {
        window._isCloudSaving = false;
        window.isSavingData = false;
        const cT = window.$('ai-credit-text');
        if(cT && typeof oldText !== 'undefined') cT.innerText = oldText;
    }
};

window.openUserManualModal = () => {
    const modal = window.$('user-manual-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 50);
    }
};

window.closeUserManualModal = () => {
    const modal = window.$('user-manual-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.shareUserManual = async () => {
    const baseUrl = location.origin + location.pathname;
    const shareText = `🌲 [소나무 족구단 통합 관리 시스템 사용설명서]

구리시 최고의 명문 족구단, 소나무족구단 통합 관리 프로그램 사용 설명서입니다.

📍 전체 시스템 메뉴 트리
1. 홈: 랭킹 명예의 전당, 미참여 과제 알림, 행운 추첨 보드
2. 투표: 운동 및 찬반 안건 투표 참여
3. 일정: 경기 대진/팀 드래프트 매칭, 소나무 일정 달력(🏐), 회원 생일(음력 양력 자동 환산) 알림
4. 공지: 주요 공지사항 공유
5. 활동: 추억 사진첩 단체 사진 아카이브, 자유게시판, 족구규칙(대한족구협회 공식 룰 수록)
6. 수지: 수입/지출 회계 내역 조회 및 청구
7. 회원: 명단 수정, 활동 점수 관리, 포지션 자원 분포 차트
8. 결산: 결산 보고서 생성, 데이터 백업 및 복구

💡 마일리지 점수 적립
- 정기 운동 참석: +3 PT (투표 후 실제 참석 시)
- 안건 투표 참여: +2 PT
- 전일 활동자 대상 매일 행운의 추첨 당첨 보너스 지급

아래 링크를 눌러 접속하신 뒤 로그인하여 간편하게 관리해 보세요!
🔗 ${baseUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: '소나무 족구단 사용설명서',
                text: shareText,
                url: baseUrl
            });
        } catch (err) {
            console.error("Manual share error:", err);
        }
    } else {
        window.copyToClipboard(shareText);
        window.showAlert("📋 사용설명서 요약본이 클립보드에 복사되었습니다!\n카카오톡 대화방 등에 '붙여넣기' 하셔서 멤버들에게 공유해 보세요.");
    }
};

