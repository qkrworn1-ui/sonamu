// --- [5. 탭: 대시보드] ---
window.updateDashboardBirthdays = () => {
    const el = window.$('dashboard-birthdays');
    const list = window.$('birthday-list');
    if(!el || !list) return;
    
    const today = new Date();
    const cy = today.getFullYear();
    const cm = today.getMonth() + 1; // 1-12
    const cd = today.getDate();
    
    // 생일자 추출
    const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
    let bdays = (members || []).filter(m => m.birth && !excludeRoles.includes(m.role)).map(m => {
        const parts = m.birth.split('-');
        const bMonth = parseInt(parts[1]);
        const bDay = parseInt(parts[2]);
        
        let targetSolarMonth, targetSolarDay;
        
        if (m.birthType === 'lunar' && typeof KoreanLunarCalendar !== 'undefined') {
            try {
                const calendar = new KoreanLunarCalendar();
                // 올해 연도 기준으로 음력 생일이 양력 며칠인지 계산
                calendar.setLunarDate(cy, bMonth, bDay, false);
                const sol = calendar.getSolarCalendar();
                targetSolarMonth = sol.month;
                targetSolarDay = sol.day;
            } catch (e) {
                console.warn("Lunar Calc Error for:", m.name, e);
                targetSolarMonth = bMonth; targetSolarDay = bDay;
            }
        } else {
            if (m.birthType === 'lunar') console.warn("KoreanLunarCalendar library missing for lunar birth:", m.name);
            targetSolarMonth = bMonth;
            targetSolarDay = bDay;
        }
        
        return { ...m, sMonth: targetSolarMonth, sDay: targetSolarDay };
    }).filter(m => m.sMonth === cm).sort((a,b) => a.sDay - b.sDay);

    if (bdays.length === 0) {
        el.classList.add('hidden');
        return;
    }

    el.classList.remove('hidden');
    list.innerHTML = bdays.map(m => {
        const isToday = m.sDay === cd;
        const typeLabel = m.birthType === 'lunar' ? '<span class="text-[8px] bg-amber-100/50 text-amber-700 px-1 rounded-sm border border-amber-200">음</span>' : '';
        const dateStr = `${m.sMonth}.${m.sDay}`;
        
        const cardClass = isToday 
            ? 'bg-gradient-to-br from-rose-50 to-white border-rose-300 ring-2 ring-rose-100 shadow-rose-100' 
            : 'bg-white border-slate-100 hover:border-rose-200 transition-all shadow-sm';
            
        return `
            <div class="flex items-center gap-3 px-4 py-3 rounded-[1.25rem] border ${cardClass}">
                <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-black ${isToday ? 'text-rose-700' : 'text-slate-800'}">${window.escapeHtml(m.name)}</span>
                        ${typeLabel}
                    </div>
                    <span class="text-[10px] font-black ${isToday ? 'text-rose-400' : 'text-slate-400'} uppercase tracking-tight">${dateStr} BIRTHDAY</span>
                </div>
                ${isToday ? `
                    <div class="relative flex items-center justify-center">
                        <div class="absolute w-8 h-8 bg-rose-200 rounded-full animate-ping opacity-20"></div>
                        <i data-lucide="cake" class="w-5 h-5 text-rose-500 relative z-10"></i>
                    </div>
                ` : '<i data-lucide="party-popper" class="w-4 h-4 text-slate-200 transition-colors group-hover:text-rose-300"></i>'}
            </div>`;
    }).join('');
    if(window.lucide) window.lucide.createIcons();
};

window.updateDashboardNotices = () => {
    const list = window.$('dashboard-notices');
    if(!list) return;

    // 공지사항(isEvent, isAnon 아님) 중 최신 3개만 필터링
    const notices = (posts || [])
        .filter(p => !p.isEvent && !p.isAnon)
        .sort((a,b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 3);

    if (notices.length === 0) {
        list.innerHTML = '<div class="text-slate-400 text-xs font-bold py-10 text-center bg-slate-50/50 rounded-[1.5rem] border-2 border-dashed border-slate-100 italic">현재 등록된 공지사항이 없습니다.</div>';
        return;
    }

    list.innerHTML = notices.map(p => {
        return `
            <div class="p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group news-fade-in" onclick="window.showTab('board');">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-sm shadow-indigo-500/50"></span>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${p.date}</span>
                    </div>
                    <div class="bg-slate-50 p-1.5 rounded-xl group-hover:bg-indigo-50 transition-colors shadow-inner">
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
                    </div>
                </div>
                <div class="text-base font-black text-slate-800 leading-snug mb-1.5 group-hover:text-indigo-600 transition-colors">${window.escapeHtml(p.title)}</div>
                <div class="text-[11px] text-slate-400 font-bold line-clamp-1 leading-relaxed opacity-80">${window.escapeHtml(p.content || '').substring(0, 60)}</div>
            </div>`;
    }).join('');
    if(window.lucide) window.lucide.createIcons();
};

window.updateDashboardUpcomingEvents = () => {
    const list = window.$('dashboard-upcoming-events');
    if(!list) return;

    const td = window.getTodayString();
    let events = [];

    // 1. 일반 운동/일정 (teamEvents)
    (teamEvents || []).forEach(e => {
        const nextDate = window.getNextRecurringDate(e);
        if (nextDate && nextDate >= td) {
            events.push({
                type: 'workout',
                date: nextDate,
                title: e.title,
                location: e.location || '소나무 운동장',
                time: e.time,
                id: e.id,
                raw: e
            });
        }
    });

    // 2. 특별 행사/투표 (posts with isEvent)
    (posts || []).forEach(p => {
        if (p.isEvent) {
            const eDate = (p.eventDate || p.date || "").substring(0, 10);
            if (eDate >= td) {
                events.push({
                    type: 'event',
                    date: eDate,
                    title: p.title,
                    location: p.eventLocation || '공지사항 참조',
                    id: p.id,
                    raw: p
                });
            }
        }
    });

    // 중복 제거 및 날짜순 정렬
    const uniqueEvents = [];
    const seen = new Set();
    events.sort((a,b) => a.date.localeCompare(b.date)).forEach(e => {
        const key = e.date + e.title;
        if (!seen.has(key)) {
            uniqueEvents.push(e);
            seen.add(key);
        }
    });

    const displayEvents = uniqueEvents.slice(0, 3);

    if (displayEvents.length === 0) {
        list.innerHTML = '<div class="text-slate-400 text-xs font-bold py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-100 uppercase tracking-tighter italic">예정된 일정이 없습니다.</div>';
        return;
    }

    list.innerHTML = displayEvents.map(e => {
        const isToday = e.date === td;
        const typeBadge = e.type === 'workout' 
            ? '<span class="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">정기운동</span>'
            : '<span class="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">회원투표/행사</span>';
            
        return `
            <div class="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group news-fade-in cursor-pointer" onclick="window.showTab('${e.type === 'workout' ? 'vote' : 'board'}');">
                <div class="flex flex-col items-center justify-center min-w-[50px] py-1 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-800 transition-colors">
                    <span class="text-[9px] font-black ${isToday ? 'text-rose-500' : 'text-slate-400'} group-hover:text-slate-400 uppercase">${e.date.split('-')[1]}월</span>
                    <span class="text-xl font-black ${isToday ? 'text-rose-600' : 'text-slate-800'} group-hover:text-white">${e.date.split('-')[2]}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        ${typeBadge}
                        ${isToday ? '<span class="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-500/50">D-Day</span>' : ''}
                    </div>
                    <div class="text-sm font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">${window.escapeHtml(e.title)}</div>
                    <div class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        <span class="truncate">${window.escapeHtml(e.location)}${e.time ? ' @'+window.escapeHtml(e.time) : ''}</span>
                    </div>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all border border-transparent group-hover:border-blue-100">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
            </div>`;
    }).join('');
    if(window.lucide) window.lucide.createIcons();
};

window.updateDashboard = () => {
    window.updateDashboardCapacity();
    window.updateDashboardMileageInfo();
    window.updateDashboardBirthdays(); 
    window.updateDashboardNotices();
    window.updateDashboardUpcomingEvents();
    const today = new Date(), cy = today.getFullYear(), cm = today.getMonth() + 1, cd = today.getDate(), td = window.getTodayString();
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    window.setText('news-current-date', today.toLocaleDateString('ko-KR', dateOptions));
    window.setText('main-app-version-news', APP_VERSION);
    const mainAppVer = window.$('main-app-version'); if(mainAppVer) mainAppVer.innerText = APP_VERSION;

    const role = sessionStorage.getItem('sonamu_user_role');
    const luckBtnContainer = window.$('admin-luck-setting-btn-container');
    if (luckBtnContainer) {
        if (['회장', '감독', '총무', 'master'].includes(role)) {
            luckBtnContainer.classList.remove('hidden');
            // 입력 필드 초기화 (모달용)
            window.setVal('input-luck-mileage', typeof luckMileageAmount === 'number' ? luckMileageAmount : 10);
            window.setVal('input-luck-count', typeof luckMileageCount === 'number' ? luckMileageCount : 2);
            window.setVal('input-mileage-start-date', mileageStartDate || "2024-01-01");
        } else luckBtnContainer.classList.add('hidden');
    }

    const luckDiv = window.$('dashboard-luck-winners');
    if (luckDiv) {
        const winners = luckyWinners ? luckyWinners[td] : null;
        if (winners && winners.length > 0) {
            luckDiv.classList.remove('hidden');
            luckDiv.innerHTML = `<div class="news-card border-2 border-amber-500 bg-amber-50/30 news-fade-in"><div class="news-label text-amber-600 border-amber-600">Special Extra</div><div class="flex flex-col md:flex-row items-center justify-between gap-4"><div class="flex items-center gap-3"><i data-lucide="award" class="w-8 h-8 text-amber-600"></i><div><h4 class="text-lg font-black text-slate-800">축! 행운 마일리지 당첨</h4><p class="text-[10px] font-bold text-amber-700 uppercase">Daily Draw Result</p></div></div><div class="flex flex-wrap gap-2 justify-center">${winners.map(w => `<span class="bg-white border-2 border-amber-400 px-4 py-1.5 rounded-sm font-black text-slate-800 shadow-sm text-sm">${w}</span>`).join('')}</div><div class="text-right text-[11px] font-black text-slate-700">각 <span class="text-amber-600">${typeof luckMileageAmount === 'number' ? luckMileageAmount : 10} PT</span> 적립 완료</div></div><div class="mt-3 pt-2 border-t border-amber-200 text-[9px] text-amber-600/70 font-bold flex items-center gap-1"><i data-lucide="info" class="w-2.5 h-2.5"></i> 선정 기준: 전일 운동 투표 또는 각종 투표 참여자 중 랜덤 선정 (정규회원 이상)</div></div>`;
        } else luckDiv.classList.add('hidden');
    }
    
    const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
    window.setText('summary-members', (members||[]).filter(m=>!excludeRoles.includes(m.role)).length+'명');
    const curYM=td.substring(0,7), ct=(transactions||[]).filter(t=>t.date && String(t.date).startsWith(curYM));
    window.setText('summary-income', ct.filter(t=>t.category==='income').reduce((s,t)=>s+(Number(t.amount)||0),0).toLocaleString()+'원');
    window.setText('summary-expense', ct.filter(t=>t.category==='expense').reduce((s,t)=>s+(Number(t.amount)||0),0).toLocaleString()+'원');
    const totalInc = (transactions||[]).filter(t=>t.category==='income').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const totalExp = (transactions||[]).filter(t=>t.category==='expense').reduce((s,t)=>s+(Number(t.amount)||0),0);
    window.setText('summary-balance', (totalInc - totalExp).toLocaleString()+'원');

    let pendingVotes = [];
    const teamPosts = [...(teamEvents||[])].map(e=>({...e, dDate:window.getNextRecurringDate(e)})).sort((a,b)=>String(a.dDate||a.date).localeCompare(String(b.dDate||b.date)));
    
    // [수정] 모든 일정을 다 보여주는 대신, 가장 가까운 하나의 일정만 체크하여 표시합니다.
    const vTeam = teamPosts.find(e => (e.dDate || e.date) >= td);
    if(vTeam) {
        let needsVoteTeam = false;
        const uidTeam = sessionStorage.getItem('sonamu_user_id');
        if (uidTeam && uidTeam !== 'master') {
            const v = vTeam.votes && vTeam.votes[uidTeam];
            const vd = vTeam.vDate && vTeam.vDate[uidTeam];
            
            if (!v || v === 'pending' || v === '미정') {
                needsVoteTeam = true;
            } else if (vd && vd !== vTeam.dDate) {
                needsVoteTeam = true;
            }
        }
        
        if (needsVoteTeam) {
            pendingVotes.push(`<div class="bg-white border-2 border-rose-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3 hover:border-rose-400 transition-all cursor-pointer pending-card-alert" onclick="window.showTab('vote'); window.switchVoteTab('team'); setTimeout(()=>{window.setVal('vote-team-select','${vTeam.id}'); window.changeVoteTeam();},10);"><div class="flex justify-between items-start"><span class="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase">Pending: Workout</span><span class="text-[10px] font-bold text-slate-400">${vTeam.dDate||vTeam.date}</span></div><div class="text-base font-black text-slate-800 leading-tight">${vTeam.title}</div><div class="grid grid-cols-3 gap-2 mt-1"><button onclick="event.stopPropagation(); window.castVoteTeam('attend', '${vTeam.id}', '${vTeam.dDate}');" class="bg-blue-600 text-white py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform"><i data-lucide="check" class="w-3 h-3 inline mr-1"></i> 참석</button><button onclick="event.stopPropagation(); window.castVoteTeam('absent', '${vTeam.id}', '${vTeam.dDate}');" class="bg-rose-500 text-white py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform"><i data-lucide="x" class="w-3 h-3 inline mr-1"></i> 불참</button><button onclick="event.stopPropagation(); window.castVoteTeam('late', '${vTeam.id}', '${vTeam.dDate}');" class="bg-amber-500 text-white py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform"><i data-lucide="clock" class="w-3 h-3 inline mr-1"></i> 늦참</button></div></div>`);
        }
    }

    const activeEvents = [...(posts||[])].filter(p=>p.isEvent && (p.endDate ? p.endDate >= td : (p.date >= td || p.isEvent))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    // [보완] 게시물 날짜가 오늘보다 이전이고 종료일도 지정되지 않았다면 대시보드에서는 제외 (일반 공지는 공지 섹션에서만 노출)
    const displayEvents = activeEvents.filter(p => (p.endDate ? p.endDate >= td : p.date >= td));
    if(displayEvents[0] && role !== '파트너') {
        const vEvt = displayEvents[0];
        let needsVoteEvt = false;
        const uidEvt = sessionStorage.getItem('sonamu_user_id');
        if (uidEvt && uidEvt !== 'master') {
            const v = vEvt.votes && vEvt.votes[uidEvt];
            const vArray = Array.isArray(v) ? v : (v ? [v] : []);
            if (vArray.length === 0 || (vArray.length === 1 && vArray[0] === '미정')) needsVoteEvt = true;
        }
        if (needsVoteEvt) {
            const opts = vEvt.eventOptions || ['참석', '불참', '미정'];
            // 복수 선택이 아닐 때만 대시보드 직접 투표 버튼 노출 (사용성 고려)
            const showButtons = !vEvt.allowMultiple && opts.length <= 4;
            
            let actionHtml = '';
            if (showButtons) {
                const colors = ['bg-emerald-600', 'bg-rose-500', 'bg-slate-600', 'bg-amber-500'];
                const filteredOpts = opts.filter(o => o !== '미정');
                actionHtml = `<div class="grid grid-cols-${Math.min(filteredOpts.length, 3)} gap-2 mt-1">` + 
                    filteredOpts.map((opt, i) => `
                        <button onclick="event.stopPropagation(); window.castVoteEvent('${window.escapeHtml(opt)}', '${vEvt.id}');" 
                                class="${colors[i % colors.length]} text-white py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform">
                            ${opt}
                        </button>`).join('') + `</div>`;
            } else {
                actionHtml = `<div class="bg-emerald-50 text-emerald-600 py-2.5 rounded-xl text-xs font-black text-center shadow-sm active:scale-95 transition-transform"><i data-lucide="send" class="w-3.5 h-3.5 inline mr-1"></i> 설문 참여하기</div>`;
            }

            pendingVotes.push(`
                <div class="bg-white border-2 border-emerald-100 p-4 rounded-2xl shadow-sm flex flex-col gap-3 hover:border-emerald-300 transition-all cursor-pointer pending-card-alert" 
                     onclick="window.showTab('vote'); window.switchVoteTab('event'); setTimeout(()=>{window.setVal('vote-event-select','${vEvt.id}'); window.changeVoteEvent();},10);">
                    <div class="flex justify-between items-start">
                        <span class="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">Pending: Survey</span>
                        <span class="text-[10px] font-bold text-slate-400">${vEvt.eventDate || vEvt.date}</span>
                    </div>
                    <div class="text-base font-black text-slate-800 leading-tight">${vEvt.title}</div>
                    ${actionHtml}
                </div>`);
        }
    }

    // 3. 무기명 투표 (Ballot)
    const activeAnons = [...(posts||[])].filter(p=>p.isAnon && (p.endDate ? p.endDate >= td : p.date >= td)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(activeAnons[0] && role !== '파트너') {
        const vAnon = activeAnons[0];
        let needsVoteAnon = false;
        const uidAnon = sessionStorage.getItem('sonamu_user_id');
        if (uidAnon && uidAnon !== 'master') {
            const v = vAnon.votes && vAnon.votes[uidAnon];
            if (!v || v === '미정') needsVoteAnon = true;
        }
        if (needsVoteAnon) {
            const opts = (vAnon.anonOptions || ['찬성', '반대', '미정']).filter(o => o !== '미정');
            const buttons = opts.map(opt => `
                <button onclick="event.stopPropagation(); window.castVoteAnon('${window.escapeHtml(opt)}', '${vAnon.id}');" 
                        class="bg-purple-500 text-white py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform hover:bg-purple-600">
                    <i data-lucide="lock" class="w-2.5 h-2.5 inline mr-1 opacity-70"></i> ${opt}
                </button>
            `).join('');

            pendingVotes.push(`
                <div class="bg-white border-2 border-purple-100 p-4 rounded-2xl shadow-sm flex flex-col gap-3 hover:border-purple-300 transition-all cursor-pointer pending-card-alert" 
                     onclick="window.showTab('vote'); window.switchVoteTab('anon'); setTimeout(()=>{window.setVal('vote-anon-select','${vAnon.id}'); window.changeVoteAnon();},10);">
                    <div class="flex justify-between items-start">
                        <span class="text-[9px] font-black bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase">Pending: Ballot</span>
                        <span class="text-[10px] font-bold text-slate-400">${vAnon.date}</span>
                    </div>
                    <div class="text-base font-black text-slate-800 leading-tight">${vAnon.title}</div>
                    <div class="grid grid-cols-${Math.min(opts.length, 3)} gap-2 mt-1">
                        ${buttons}
                    </div>
                </div>`);
        }
    }
    // 2. 미참여 알림함 렌더링
    const pTaskDiv = window.$('pending-vote-task-container'), pListDiv = window.$('pending-vote-list'), pCountSpan = window.$('pending-vote-count');
    if (pendingVotes.length > 0) {
        if (pTaskDiv && pListDiv) { pTaskDiv.classList.remove('hidden'); pListDiv.innerHTML = pendingVotes.join(''); if (pCountSpan) pCountSpan.innerText = `${pendingVotes.length}건`; }
    } else if (pTaskDiv) pTaskDiv.classList.add('hidden');
    window.$('hero-vote-container')?.classList.add('hidden');

    // Gallery
    try {
        const photos = window.galleryPhotos || galleryPhotos || [];
        const rg = [...photos].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).slice(0, 12);
        const totalStorageBytes = photos.reduce((sum, p) => sum + (p.size || 314572.8), 0);
        const totalStorageMb = (totalStorageBytes / (1024 * 1024)).toFixed(1);
        const totalDbBytes = (dbSizes.members||0) + (dbSizes.finance||0) + (dbSizes.sports||0) + (dbSizes.board||0) + (dbSizes.gallery||0);
        const totalDbKb = (totalDbBytes / 1024).toFixed(1);

        window.setHtml('dashboard-gallery-stats', `클라우드 ${totalStorageMb}MB / 1,024MB (${photos.length}장) <span class="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded ml-2">DB: ${totalDbKb}KB</span>`);
        
        let itemsHtml = rg.map(p=>{
            const photoUrl = p.url || p.src || p.photoUrl || p.image || p.imageUrl || '';
            const photoId = p.id || ('photo_' + (p.timestamp || Math.random().toString(36).substring(2)));
            return `<div class="gallery-preview-item" onclick="window.showTab('gallery'); setTimeout(()=>window.openImageViewer('${photoId}'), 10);"><img src="${photoUrl}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20fill%3D%22%23f1f5f9%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23f8fafc%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2216%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E';"></div>`;
        }).join('');
        window.setHtml('dashboard-gallery-preview', itemsHtml ? (itemsHtml + itemsHtml) : '<div class="col-span-3 text-center py-6 text-slate-400 border-2 border-dashed rounded-xl text-[11px] font-black bg-slate-50/50">등록된 추억이 없습니다.</div>');
    } catch (err) {
        console.error("Gallery Preview Rendering Error:", err);
    }
    
    // [고도화] 소나무 랭킹 계산 및 공유 순위 (Podium & Slider)
    try {
        const memberScores = [];
        // [수정] 활동내역 탭과 동일한 기본 정렬 조건(역할/이름순)을 사용하기 위해 getSortedMembers를 통해 필터링합니다.
        const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
        const eligibleM = window.getSortedMembers(members).filter(m => !excludeRoles.includes(m.role));

        eligibleM.forEach(m => {
            // [수정] 실시간 계산 엔진(Source of Truth)을 사용하여 대시보드 점수 정확도 보장
            memberScores.push({ id: m.id, name: m.name, score: window.getMemberCalculatedScore(m, teamEvents, posts) });
        });

        // 점수 순 정렬 (공동 순위 그룹화)
        const sortedScores = memberScores.sort((a,b) => b.score - a.score);
        const rankBuckets = [];
        sortedScores.forEach(m => {
            let bucket = rankBuckets.find(b => b.score === m.score);
            if (!bucket) {
                bucket = { score: m.score, members: [] };
                rankBuckets.push(bucket);
            }
            bucket.members.push(m);
        });

        const now = Date.now();
        if (rankCache.timestamp < (now - 5000)) { // 5초 캐시
            let rankHtml = '<div class="rank-marquee-container"><div class="rank-marquee-content">';
            let itemsHtml = '';
            rankBuckets.forEach((bucket, bIdx) => {
                const rankNum = bIdx + 1;
                const medal = rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : ''));
                
                bucket.members.forEach(m => {
                    itemsHtml += `
                        <div class="rank-compact-item group/rank">
                            <span class="rank-text">${medal || rankNum + '위'}</span>
                            <span class="name-text dark:text-slate-200">${window.escapeHtml(m.name)}</span>
                            <span class="score-text text-blue-400 group-hover/rank:text-blue-300 transition-colors">${m.score.toLocaleString()}pt</span>
                        </div>
                    `;
                });
            });
            // [수정] 끊김 없는 흐름(Infinite Loop)을 위해 리스트를 두 번 반복하여 렌더링합니다.
            rankHtml += itemsHtml + itemsHtml;
            rankHtml += '</div></div>';
            rankCache = { data: rankHtml, timestamp: now };
        }
        window.setHtml('dashboard-podium', rankCache.data);

        // [추가] 개인별 순위 팁 로직 (Shared Rank 기반)
        const myUid = sessionStorage.getItem('sonamu_user_id');
        const myName = sessionStorage.getItem('sonamu_user_name');
        const tipEl = window.$('dashboard-rank-tip');
        if (tipEl && myUid && myName) {
            const myData = sortedScores.find(r => r.name === myName);
            if (myData) {
                // 나보다 높은 점수의 바로 위 버킷 찾기
                const myBucketIdx = rankBuckets.findIndex(b => b.score === myData.score);
                if (myBucketIdx > 0) {
                    const betterBucket = rankBuckets[myBucketIdx - 1];
                    const gap = betterBucket.score - myData.score;
                    const representative = betterBucket.members[0].name;
                    const extra = betterBucket.members.length > 1 ? ` 외 ${betterBucket.members.length-1}명` : '';
                    tipEl.innerHTML = `<i data-lucide="zap" class="w-3 h-3 inline mr-1 text-yellow-400"></i> ${representative}${extra} 그룹까지 <b>${gap}점</b> 남음!`;
                    tipEl.classList.remove('hidden');
                } else if (myBucketIdx === 0) {
                    tipEl.innerHTML = `<i data-lucide="crown" class="w-3 h-3 inline mr-1 text-yellow-400"></i> 현재 실시간 1위! 자리를 지키세요!`;
                    tipEl.classList.remove('hidden');
                } else {
                    tipEl.classList.add('hidden');
                }
            } else {
                tipEl.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error("Honors Rendering Error:", err);
    }

    if(window.lucide) window.lucide.createIcons();
};

window.switchVoteTab = t => {
    const vT=window.$('vote-team-view'), vE=window.$('vote-event-view'), vA=window.$('vote-anon-view');
    const bT=window.$('btn-vote-tab-team'), bE=window.$('btn-vote-tab-event'), bA=window.$('btn-vote-tab-anon');
    
    if(!vT || !vE || !vA || !bT || !bE || !bA) return;
    
    vT.classList.add('hidden'); vE.classList.add('hidden'); vA.classList.add('hidden');
    bT.className="flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";
    bE.className="partner-hidden flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";
    bA.className="partner-hidden flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";

    if(t==='team') {
        vT.classList.remove('hidden');
        bT.className="flex-1 py-3 rounded-xl text-sm transition-all bg-white text-blue-600 shadow-sm font-black";
        window.renderVoteTeam();
    } else if (t==='event') {
        vE.classList.remove('hidden');
        bE.className="partner-hidden flex-1 py-3 rounded-xl text-sm transition-all bg-white text-green-600 shadow-sm font-black";
        window.renderVoteEvent();
    } else {
        vA.classList.remove('hidden');
        bA.className="partner-hidden flex-1 py-3 rounded-xl text-sm transition-all bg-white text-rose-600 shadow-sm font-black";
        window.renderVoteAnon();
    }
};

window.renderVote = () => { 
    const vE = window.$('vote-event-view');
    const vA = window.$('vote-anon-view');
    const bE = window.$('btn-vote-tab-event');
    const bA = window.$('btn-vote-tab-anon');
    const isPartner = sessionStorage.getItem('sonamu_user_role') === '파트너';
    
    if (isPartner) {
        if (bE) bE.classList.add('hidden');
        if (bA) bA.classList.add('hidden');
    }

    let t = 'team';
    if (vE && !vE.classList.contains('hidden')) t = 'event';
    if (vA && !vA.classList.contains('hidden')) t = 'anon';
    window.switchVoteTab(t); 
};

window.renderVoteTeam = () => {
    const today = window.getTodayString();
    const l = (teamEvents||[])
        .filter(e => !e.isFinished)
        .map(e=>({...e, dDate:window.getNextRecurringDate(e), rL:window.getRepeatLabel(e)}))
        .filter(e => (e.dDate || e.date) >= today)
        .sort((a,b)=>String(a.dDate||a.date).localeCompare(String(b.dDate||b.date)));
    if(!l.length) {
        window.setHtml('vote-team-select','<option value="">운동 일정 없음</option>');
        window.setHtml('vote-team-action-container','');
        window.setHtml('vote-team-status-container','<div class="col-span-full py-6 text-center text-slate-600 font-black">경기관리에서 일정을 생성해주세요.</div>');
        const kbtn = window.$('btn-kakao-share-team'); if(kbtn) { kbtn.classList.add('hidden'); kbtn.classList.remove('flex'); }
        return;
    }
    window.setHtml('vote-team-select', l.map(e=> {
        const curLoc = (e.locationOverride && e.locationOverride[e.dDate || e.date]) ? e.locationOverride[e.dDate || e.date] : e.location;
        const curTime = (e.timeOverride && e.timeOverride[e.dDate || e.date]) ? e.timeOverride[e.dDate || e.date] : e.time;
        return `<option value="${e.id}">${e.isPinned?'📌 ':''}${e.dDate||e.date} | ${e.title}${curLoc ? ' ('+curLoc+')' : ''}${curTime ? ' @'+curTime : ''} ${e.rL}</option>`;
    }).join(''));
    if(!currentVoteTeamId || !l.some(e=>e.id===currentVoteTeamId)) { const td=window.getTodayString(), tEvt=l.find(e=>(e.dDate||e.date)===td); currentVoteTeamId = tEvt?tEvt.id:(l.find(e=>(e.dDate||e.date)>=td)?.id||l[0].id); }
    window.setVal('vote-team-select', currentVoteTeamId);
    
    const e = l.find(x=>x.id===currentVoteTeamId); if(!e) return; if(!e.votes) e.votes={};
    
    const kbtn = window.$('btn-kakao-share-team');
    if(kbtn) { if(window.isVotingAdmin()) { kbtn.classList.remove('hidden'); kbtn.classList.add('flex'); } else { kbtn.classList.add('hidden'); kbtn.classList.remove('flex'); } }

    const uid = sessionStorage.getItem('sonamu_user_id'), isA = window.isVotingAdmin();
    const targetDate = e.dDate || window.getNextRecurringDate(e);
    
    // 장소/시간 변경 컨테이너 표시 (관리자 전용)
    const editContainer = window.$('vote-team-edit-container');
    if (editContainer) {
        if (isA) {
            const curLoc = (e.locationOverride && e.locationOverride[targetDate]) ? e.locationOverride[targetDate] : (e.location || '');
            const curTime = (e.timeOverride && e.timeOverride[targetDate]) ? e.timeOverride[targetDate] : (e.time || '');
            editContainer.classList.remove('hidden');
            window.setVal('vote-team-edit-location', curLoc);
            window.setVal('vote-team-edit-time', curTime);
        } else {
            editContainer.classList.add('hidden');
        }
    }
    
    const btnAddExt = window.$('btn-add-external-team');
    if (btnAddExt) {
        if (isA) { btnAddExt.classList.remove('hidden'); btnAddExt.classList.add('flex'); }
        else { btnAddExt.classList.remove('flex'); btnAddExt.classList.add('hidden'); }
    }

    let myV = e.votes[uid]||null;
    if (e.vDate && e.vDate[uid] && e.vDate[uid] !== targetDate) myV = null;

    let att=[], lat=[], abs=[], pen=[], nov=[];
    let attCnt=0, latCnt=0, absCnt=0, penCnt=0, novCnt=0;
    const posPriority = { '공격수': 1, '세터': 2, '좌수비': 3, '우수비': 4, '미정': 5 };

    const allM = [...window.getSortedMembers()];
    if (e.guestNames) {
        Object.keys(e.guestNames).forEach(gid => {
            if (!allM.find(x => x.id === gid)) {
                const isExt = gid.startsWith('ext_team_') || String(e.guestNames[gid]).includes('[외부팀]');
                allM.push({ id: gid, name: e.guestNames[gid], role: isExt ? '외부팀' : '초청선수', isGuest: true });
            }
        });
    }
    allM.forEach(m => {
        if (!m || !m.name) return;
        let v = e.votes[m.id];
        const vDate = (e.vDate && e.vDate[m.id]) ? e.vDate[m.id] : (e.dDate || e.date);
        if (vDate !== targetDate) v = null;
        
        const isExt = String(m.id).startsWith('ext_team_') || String(m.name).includes('[외부팀]');
        const isGuest = m.isGuest || m.role === '초청선수' || isExt;

        // 초청선수/외부팀이면서 이번 회차에 참석/늦참이 아니면(불참, 미정, 과거 투표) 리스트에서 완전히 제외
        if (isGuest && (v !== 'attend' && v !== 'late')) return;
        
        const gCnt = (e.guestCounts && e.guestCounts[m.id]) ? (parseInt(e.guestCounts[m.id]) || 1) : 1;
        
        let gText = '';
        if (isExt) {
            gText = ` <span class="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-700/50 ml-1 font-black">총 ${gCnt}명</span>`;
        } else if (gCnt > 1) {
            gText = ` <span class="text-[10px] text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-1 rounded-md border border-emerald-200 dark:border-emerald-700/50 ml-1">외 ${gCnt - 1}명</span>`;
        }

        const guestBadge = isExt 
            ? `<span class="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">외부팀</span>`
            : (m.role === '초청선수' ? `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">초청선수</span>` : '');

        // 관리자용 외부팀/초청선수 삭제 버튼
        const delBtn = (isA && isGuest) ? `
            <button onclick="window.removeExternalTeamFromVote('${e.id}', '${m.id}')" class="text-rose-500 hover:text-rose-700 p-1 ml-1 btn-touch" title="삭제">
                <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
            </button>
        ` : '';

        // 관리자용 인원수 조절 셀렉트 (외부팀 또는 초청선수)
        const countSel = (isA && isGuest) ? `
            <select class="text-[9px] bg-slate-100 border border-slate-200 rounded px-1 py-0.5 ml-1 outline-none font-bold text-slate-700" onchange="window.updateVoteTeamGuestCount('${e.id}', '${m.id}', this.value)">
                ${Array.from({length: 30}, (_, i) => `<option value="${i+1}" ${gCnt === (i+1) ? 'selected' : ''}>${i+1}명</option>`).join('')}
            </select>
        ` : '';

        const sel = (isA && m.id !== uid) ? `<select class="text-[9px] bg-slate-100 rounded px-1 ml-1 outline-none font-bold" onchange="window.castVoteForTeam('${m.id}',this.value)"><option value="" ${!v ? 'selected' : ''}>미정</option><option value="attend" ${v === 'attend' ? 'selected' : ''}>참석</option><option value="late" ${v === 'late' ? 'selected' : ''}>늦참</option><option value="absent" ${v === 'absent' ? 'selected' : ''}>불참</option><option value="pending" ${v === 'pending' ? 'selected' : ''}>미정</option></select>` : '';
        const proxyVal = e.proxyVotes ? e.proxyVotes[m.id] : null;
        const proxyLabel = (proxyVal && typeof proxyVal === 'string') ? `대리(${proxyVal})` : '대리';
        const proxyBadge = (proxyVal && v && v !== 'pending') ? `<span class="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 px-1 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50 ml-1 font-black">${proxyLabel}</span>` : '';
        
        let dispName = m.name;
        if (isGuest && e.guestNames && e.guestNames[m.id]) {
            dispName = e.guestNames[m.id];
        }
        if (isExt) {
            dispName = dispName.replace('[외부팀]', '').trim();
        }
        
        let posBadge = '';
        if (!isExt && (v === 'attend' || v === 'late') && m.position) {
            const pos = m.position.trim();
            const themes = {
                '공격수': 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50',
                '세터': 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50',
                '좌수비': 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50',
                '우수비': 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50',
                '미정': 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/50'
            };
            const emojis = {
                '공격수': '🔥',
                '세터': '⚡',
                '좌수비': '🛡️',
                '우수비': '⚔️',
                '미정': '❓'
            };
            const cls = themes[pos] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/50';
            const emoji = emojis[pos] || '';
            posBadge = `<span class="text-[9px] border px-1 ml-1 rounded font-black ${cls}">${emoji}${pos}</span>`;
        }
        
        const str = `<div class="flex justify-between items-center w-full text-black dark:text-slate-100 py-0.5"><span class="font-black flex items-center flex-wrap">${guestBadge}<span class="text-black dark:text-slate-100 font-black">${window.escapeHtml(dispName)}</span>${gText}${m.role === '파트너' ? '<span class="text-[9px] text-slate-800 dark:text-slate-400 border border-slate-400 dark:border-slate-700 px-1 ml-1 rounded font-black">파트너</span>' : ''}${posBadge}${proxyBadge}</span><span class="flex items-center shrink-0">${countSel}${sel}${delBtn}</span></div>`;
        
        if (v === 'attend') {
            const pos = m.position ? m.position.trim() : '';
            const pOrder = isExt ? 0 : (posPriority[pos] || 99);
            att.push({ html: str, pOrder, name: dispName });
            attCnt += gCnt;
        }
        else if (v === 'late') {
            const pos = m.position ? m.position.trim() : '';
            const pOrder = isExt ? 0 : (posPriority[pos] || 99);
            lat.push({ html: str, pOrder, name: dispName });
            latCnt += gCnt;
        }
        else if (v === 'absent') { abs.push(str); absCnt += gCnt; }
        else if (v === 'pending') { pen.push(str); penCnt += gCnt; }
        else { nov.push(str); novCnt += gCnt; }
    });

    att.sort((a, b) => {
        if (a.pOrder !== b.pOrder) return a.pOrder - b.pOrder;
        return a.name.localeCompare(b.name, 'ko');
    });
    const attList = att.map(x => x.html);

    lat.sort((a, b) => {
        if (a.pOrder !== b.pOrder) return a.pOrder - b.pOrder;
        return a.name.localeCompare(b.name, 'ko');
    });
    const latList = lat.map(x => x.html);
    
    if(uid === 'master') {
        window.setHtml('vote-team-action-container', '<div class="col-span-full py-4 text-center text-slate-600 font-black bg-slate-100 rounded-xl border border-slate-300 mb-6">마스터 계정은 투표할 수 없습니다.</div>');
    } else {
        const btnBase = "py-4 md:py-5 rounded-2xl font-black transition-all duration-200 flex items-center justify-center gap-2.5 border-2 w-full text-base sm:text-lg btn-touch";
        const checkIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
        const crossIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        const qIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="3"></circle><path stroke-width="3" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3"></line></svg>`;
        const clockIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2.5"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6l4 2"></path></svg>`;
        
        const btnAttend = `<button onclick="window.castVoteTeam('attend', '${e.id}', '${e.dDate}')" class="${btnBase} ${myV==='attend' ? 'bg-blue-600 border-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] transform scale-[1.02]' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}">${myV==='attend' ? checkIcon : '<div class="w-5 h-5 rounded-full border-[2.5px] border-blue-300 shrink-0"></div>'}<span>참석</span></button>`;
        const btnLate = `<button onclick="window.castVoteTeam('late', '${e.id}', '${e.dDate}')" class="${btnBase} ${myV==='late' ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.4)] transform scale-[1.02]' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}">${myV==='late' ? clockIcon : '<div class="w-5 h-5 rounded-full border-[2.5px] border-indigo-300 shrink-0"></div>'}<span>늦참</span></button>`;
        const btnAbsent = `<button onclick="window.castVoteTeam('absent', '${e.id}', '${e.dDate}')" class="${btnBase} ${myV==='absent' ? 'bg-red-500 border-red-500 text-white shadow-[0_4px_15px_rgba(239,68,68,0.4)] transform scale-[1.02]' : 'bg-white border-red-200 text-red-500 hover:bg-red-50'}">${myV==='absent' ? crossIcon : '<div class="w-5 h-5 rounded-full border-[2.5px] border-red-300 shrink-0"></div>'}<span>불참</span></button>`;
        const btnPending = `<button onclick="window.castVoteTeam('pending', '${e.id}', '${e.dDate}')" class="${btnBase} ${myV==='pending' ? 'bg-amber-500 border-amber-500 text-white shadow-[0_4px_15px_rgba(245,158,11,0.4)] transform scale-[1.02]' : 'bg-white border-amber-200 text-amber-500 hover:bg-amber-50'}">${myV==='pending' ? qIcon : '<div class="w-5 h-5 rounded-full border-[2.5px] border-amber-300 shrink-0"></div>'}<span>미정</span></button>`;
        
        window.setHtml('vote-team-action-container', `<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3">${btnAttend}${btnLate}${btnAbsent}${btnPending}</div>`);
    }
    const c = (col, n, arr, cnt) => {
        const isAttendOrLate = n.includes('참석') || n.includes('늦참');
        const badgeText = isAttendOrLate ? `총 ${cnt}명 (${arr.length}건)` : `${cnt}명`;
        return `<div class="bg-${col}-50/50 dark:bg-${col}-900/20 p-4 rounded-xl border border-${col}-200 dark:border-${col}-800/30"><div class="text-${col}-900 dark:text-${col}-300 text-xs font-black mb-2 flex justify-between border-b border-${col}-300 dark:border-${col}-700/50 pb-2"><span>${n}</span><span class="bg-${col}-200 dark:bg-${col}-800/50 px-2 py-0.5 rounded-full font-black">${badgeText}</span></div><div class="text-sm font-black flex flex-col gap-1.5">${arr.length > 0 ? arr.join('') : '<span class="text-[10px] text-slate-600 font-bold">없음</span>'}</div></div>`;
    };
    
    let statusHtml = c('blue', '참석', attList, attCnt) + c('indigo', '늦참', latList, latCnt) + c('red', '불참', abs, absCnt) + c('amber', '미정/미투표', [...pen, ...nov], penCnt + novCnt);
    window.setHtml('vote-team-status-container', statusHtml);
};

window.shareKakaoVoteTeam = async () => {
    if(!currentVoteTeamId) return window.showAlert("선택된 일정이 없습니다.");
    const e = (teamEvents||[]).find(x => x.id === currentVoteTeamId);
    if(!e) return window.showAlert("선택된 일정이 없습니다.");
    
    const targetDate = window.getNextRecurringDate(e);
    let att = [], lat = [], abs = [], pen = [];
    let attCount = 0, latCount = 0;
    const allM = [...window.getSortedMembers()];
    if (e.guestNames) {
        Object.keys(e.guestNames).forEach(gid => {
            if (!allM.find(x => x.id === gid)) {
                const isExt = gid.startsWith('ext_team_') || String(e.guestNames[gid]).includes('[외부팀]');
                allM.push({ id: gid, name: e.guestNames[gid], role: isExt ? '외부팀' : '초청선수', isGuest: true });
            }
        });
    }
    allM.forEach(m => {
        if (!m || !m.name) return;
        let v = e.votes && e.votes[m.id];
        const vDate = (e.vDate && e.vDate[m.id]) ? e.vDate[m.id] : e.date;
        if (vDate !== targetDate) v = null;
        
        const isExt = String(m.id).startsWith('ext_team_') || String(m.name).includes('[외부팀]');
        const isGuest = m.isGuest || m.role === '초청선수' || isExt;
        
        // 초청선수/외부팀은 이번 회차(targetDate)에 참석 또는 늦참으로 투표한 경우에만 포함! (불참/미투표/과거데이터는 제외)
        if (isGuest && (v !== 'attend' && v !== 'late')) return;
        if (m.role === '파트너') return;
        
        const gCnt = (e.guestCounts && e.guestCounts[m.id]) ? (parseInt(e.guestCounts[m.id]) || 1) : 1;
        let cleanName = m.name;
        if (isGuest && e.guestNames && e.guestNames[m.id]) {
            cleanName = e.guestNames[m.id];
        }
        
        let dispName = cleanName;
        if (isExt) {
            dispName = `[외부팀] ${cleanName.replace('[외부팀]', '').trim()} (총 ${gCnt}명)`;
        } else if (gCnt > 1) {
            dispName = `${cleanName} (외 ${gCnt - 1}명)`;
        }
        
        if(v === 'attend') { att.push(dispName); attCount += gCnt; }
        else if(v === 'late') { lat.push(dispName); latCount += gCnt; }
        else if(v === 'absent') abs.push(dispName);
        else if(v === 'pending' || !v) pen.push(dispName);
    });

    const curLoc = (e.locationOverride && e.locationOverride[targetDate]) ? e.locationOverride[targetDate] : (e.location || '');
    const curTime = (e.timeOverride && e.timeOverride[targetDate]) ? e.timeOverride[targetDate] : (e.time || '');

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?tab=vote&teamId=${e.id}`;
    
    let resultItems = [`✅ 참석(총 ${attCount}명): ${att.length ? att.join(', ') : '없음'}`];
    if(lat.length) resultItems.push(`⏰ 늦참(총 ${latCount}명): ${lat.join(', ')}`);
    if(abs.length) resultItems.push(`❌ 불참(${abs.length}명): ${abs.join(', ')}`);
    if(pen.length) resultItems.push(`❓ 미정/미투표(${pen.length}명): ${pen.join(', ')}`);

    const shareText = `🏐 [소나무 족구참석 투표결과]\n\n📌 일정: ${targetDate}${curTime ? ' ' + curTime : ''}\n🏟️ 장소: ${curLoc || e.title}\n\n${resultItems.join('\n')}\n\n👇 상세 현황 확인 및 투표하기\n${shareUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({ title: '소나무 족구단 투표 현황', text: shareText, url: shareUrl });
        } catch (err) {}
    } else {
        window.copyToClipboard(shareText);
        window.showAlert("투표 결과와 링크가 복사되었습니다!\n카카오톡 등에 '붙여넣기' 해주세요.");
    }
};

window.openExternalTeamModal = () => {
    if (!currentVoteTeamId) return window.showAlert("선택된 운동 일정이 없습니다.");
    window.setVal('input-ext-team-name', '');
    window.setVal('input-ext-team-count', '4');
    window.setVal('select-ext-team-status', 'attend');
    const modal = window.$('external-team-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
        window.$('input-ext-team-name')?.focus();
    }
};

window.closeExternalTeamModal = () => {
    const modal = window.$('external-team-modal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

window.submitExternalTeam = async () => {
    const teamId = (typeof currentVoteTeamId !== 'undefined' && currentVoteTeamId) ? currentVoteTeamId : (window.$('vote-team-select') ? window.$('vote-team-select').value : null);
    if (!teamId) return window.showAlert("선택된 운동 일정이 없습니다. 일정을 먼저 선택해주세요.");
    
    const nameEl = window.$('input-ext-team-name');
    const teamName = nameEl ? nameEl.value.trim() : '';
    const countEl = window.$('input-ext-team-count');
    const count = countEl ? (parseInt(countEl.value) || 4) : 4;
    const statusEl = window.$('select-ext-team-status');
    const status = statusEl ? statusEl.value : 'attend';

    if (!teamName) {
        window.showAlert("외부팀 이름을 입력해주세요.");
        if (nameEl) nameEl.focus();
        return;
    }
    if (count < 1) {
        window.showAlert("참석 인원수는 1명 이상이어야 합니다.");
        return;
    }

    await window.addExternalTeamToVote(teamId, teamName, count, status);
    window.closeExternalTeamModal();
};

window.addExternalTeamToVote = async (teamId, teamName, count, status = 'attend') => {
    if (window.isSavingData) return;
    window.isSavingData = true;
    try {
        const extId = 'ext_team_' + Date.now();
        const fullName = '[외부팀] ' + teamName;
        const targetDate = window.getNextRecurringDate((teamEvents||[]).find(x=>x.id===teamId) || {});

        await db.runTransaction(async tx => {
            const docS = await tx.get(docSports);
            if (!docS.exists) throw "DB Error";
            const sD = docS.data();
            const evts = sD.teamEvents || [];
            const targetE = evts.find(x => x.id === teamId);
            if (!targetE) throw "일정을 찾을 수 없습니다.";

            if (!targetE.votes) targetE.votes = {};
            if (!targetE.vDate) targetE.vDate = {};
            if (!targetE.guestNames) targetE.guestNames = {};
            if (!targetE.guestCounts) targetE.guestCounts = {};

            targetE.guestNames[extId] = fullName;
            targetE.guestCounts[extId] = count;
            targetE.votes[extId] = status;
            targetE.vDate[extId] = targetDate || targetE.date;

            tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });
        });

        const localE = (teamEvents||[]).find(x => x.id === teamId);
        if (localE) {
            if (!localE.votes) localE.votes = {};
            if (!localE.vDate) localE.vDate = {};
            if (!localE.guestNames) localE.guestNames = {};
            if (!localE.guestCounts) localE.guestCounts = {};
            localE.guestNames[extId] = fullName;
            localE.guestCounts[extId] = count;
            localE.votes[extId] = status;
            localE.vDate[extId] = targetDate || localE.date;
        }

        window.showToast(`[외부팀] ${teamName} (${count}명) 등록 완료!`);
        window.renderVoteTeam();
    } catch (err) {
        console.error("Add external team error:", err);
        window.showAlert(typeof err === 'string' ? err : "외부팀 등록 중 오류가 발생했습니다.");
    } finally {
        window.isSavingData = false;
    }
};

window.updateVoteTeamGuestCount = async (teamId, guestId, count) => {
    const num = parseInt(count) || 1;
    if (window.isSavingData) return;
    window.isSavingData = true;
    try {
        await db.runTransaction(async tx => {
            const docS = await tx.get(docSports);
            if (!docS.exists) throw "DB Error";
            const sD = docS.data();
            const evts = sD.teamEvents || [];
            const targetE = evts.find(x => x.id === teamId);
            if (!targetE) throw "일정을 찾을 수 없습니다.";

            if (!targetE.guestCounts) targetE.guestCounts = {};
            targetE.guestCounts[guestId] = num;

            tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });
        });

        const localE = (teamEvents||[]).find(x => x.id === teamId);
        if (localE) {
            if (!localE.guestCounts) localE.guestCounts = {};
            localE.guestCounts[guestId] = num;
        }

        window.showToast(`인원수가 ${num}명으로 변경되었습니다.`);
        window.renderVoteTeam();
    } catch (err) {
        console.error("Update guest count error:", err);
        window.showAlert("인원수 변경 중 오류가 발생했습니다.");
    } finally {
        window.isSavingData = false;
    }
};

window.removeExternalTeamFromVote = async (teamId, guestId) => {
    window.showConfirm("해당 외부팀/초청선수를 투표 목록에서 삭제하시겠습니까?", async () => {
        if (window.isSavingData) return;
        window.isSavingData = true;
        try {
            await db.runTransaction(async tx => {
                const docS = await tx.get(docSports);
                if (!docS.exists) throw "DB Error";
                const sD = docS.data();
                const evts = sD.teamEvents || [];
                const targetE = evts.find(x => x.id === teamId);
                if (!targetE) throw "일정을 찾을 수 없습니다.";

                if (targetE.guestNames) delete targetE.guestNames[guestId];
                if (targetE.guestCounts) delete targetE.guestCounts[guestId];
                if (targetE.votes) delete targetE.votes[guestId];
                if (targetE.vDate) delete targetE.vDate[guestId];

                tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });
            });

            const localE = (teamEvents||[]).find(x => x.id === teamId);
            if (localE) {
                if (localE.guestNames) delete localE.guestNames[guestId];
                if (localE.guestCounts) delete localE.guestCounts[guestId];
                if (localE.votes) delete localE.votes[guestId];
                if (localE.vDate) delete localE.vDate[guestId];
            }

            window.showToast("삭제되었습니다.");
            window.renderVoteTeam();
        } catch (err) {
            console.error("Remove external team error:", err);
            window.showAlert("삭제 처리 중 오류가 발생했습니다.");
        } finally {
            window.isSavingData = false;
        }
    });
};
window.changeVoteTeam = () => { currentVoteTeamId=window.$('vote-team-select').value; window.renderVoteTeam(); };

// [추가] 운동투표 탭에서 일정 장소/시간 바로 수정하기
window.saveVoteTeamEdit = async () => {
    if (!currentVoteTeamId) return;
    if (!window.isVotingAdmin()) return window.showAlert("수정 권한이 없습니다.");
    
    const loc = window.getVal('vote-team-edit-location').trim();
    const time = window.getVal('vote-team-edit-time').trim();
    
    if (window.isSavingData) return; window.isSavingData = true;
    try {
        await db.runTransaction(async tx => {
            const docS = await tx.get(docSports);
            if (!docS.exists) throw "DB Error";
            const d = docS.data();
            const evts = d.teamEvents || [];
            const targetE = evts.find(x => x.id === currentVoteTeamId);
            if (!targetE) throw "일정을 찾을 수 없습니다.";
            
            const targetDate = window.getNextRecurringDate(targetE);
            if (!targetE.locationOverride) targetE.locationOverride = {};
            if (!targetE.timeOverride) targetE.timeOverride = {};
            
            targetE.locationOverride[targetDate] = loc;
            targetE.timeOverride[targetDate] = time;
            
            tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });
            window.teamEvents = evts;
        });
        window.showToast("해당 날짜의 장소와 시간이 성공적으로 변경되었습니다.");
        window.renderVoteTeam(); // 화면 갱신
    } catch (err) {
        console.error(err);
        window.showAlert(typeof err === 'string' ? err : "수정 중 오류가 발생했습니다.");
    } finally {
        window.isSavingData = false;
    }
};

window.castVoteTeam = async (t, eid, vDate) => { 
    if(window.isSavingData) return; window.isSavingData = true; 
    const uid = sessionStorage.getItem('sonamu_user_id');
    if(uid === 'master') { window.isSavingData = false; return window.showAlert("마스터 계정은 투표할 수 없습니다."); } 
    
    if (eid) window.currentVoteTeamId = eid;
    const targetId = eid || (typeof currentVoteTeamId !== 'undefined' ? currentVoteTeamId : null);
    if(!targetId) { window.isSavingData = false; return; }

    let updatedEvts = null;
    try {
        await db.runTransaction(async (tx) => {
            const docS = await tx.get(docSports); if (!docS.exists) return;
            const docM = await tx.get(docMembers); if (!docM.exists) return;
            const docB = await tx.get(docBoard); if (!docB.exists) return;
            const sD = docS.data(); const evts = sD.teamEvents || [];
            const targetE = evts.find(x => x.id === targetId);
            if(targetE) {
                if(!targetE.votes) targetE.votes={}; 
                if(!targetE.vDate) targetE.vDate={};
                targetE.votes[uid] = t; 
                targetE.vDate[uid] = (vDate && vDate !== 'undefined') ? vDate : window.getNextRecurringDate(targetE);
                if(targetE.proxyVotes) delete targetE.proxyVotes[uid];

                // [마일리지 누락 수정] 종료된 복사본이라면 부모의 pastVotes에도 투표 내역 동기화
                if (targetE.isFinished && targetE.originalId) {
                    const parent = evts.find(p => p.id === targetE.originalId);
                    if (parent && parent.pastVotes && parent.pastVotes[targetE.date]) {
                        parent.pastVotes[targetE.date][uid] = t;
                        if (!parent.pastVDates) parent.pastVDates = {};
                        if (!parent.pastVDates[targetE.date]) parent.pastVDates[targetE.date] = {};
                        parent.pastVDates[targetE.date][uid] = targetE.vDate[uid];
                    }
                }
                tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });
                updatedEvts = evts;

                const mD = docM.data(); const membersList = mD.members || [];
                const targetM = membersList.find(x => x.id === uid);
                if(targetM) {
                    const bD = docB.data();
                    targetM.score = window.getMemberCalculatedScore(targetM, evts, bD.posts || []);
                    tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
                }
            }
        });
        if (updatedEvts) window.teamEvents = updatedEvts;
        if (typeof window.loadData === 'function') await window.loadData();
        window.showToast("투표 완료");
        window.updateDashboard();
        if (typeof window.renderActivities === 'function') window.renderActivities();
        if (typeof window.renderVote === 'function') window.renderVote();
    } catch(e) { console.error("Vote Error:", e); window.showAlert("오류 발생. 다시 시도해주세요."); }
    window.isSavingData = false; 
};

window.castVoteForTeam = async (u, t, eid) => { 
    if(!window.isVotingAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true; 
    
    const targetId = eid || (typeof currentVoteTeamId !== 'undefined' ? currentVoteTeamId : null);
    if(!targetId) { window.isSavingData = false; return; }

    try {
        await db.runTransaction(async (tx) => {
            const docS = await tx.get(docSports); if (!docS.exists) return;
            const docM = await tx.get(docMembers); if (!docM.exists) return;
            const docB = await tx.get(docBoard); if (!docB.exists) return;
            const sD = docS.data(); const evts = sD.teamEvents || [];
            const targetE = evts.find(x => x.id === targetId);
            if(targetE) {
                if(!targetE.votes) targetE.votes={};
                if(!targetE.vDate) targetE.vDate={};
                if(!targetE.proxyVotes) targetE.proxyVotes={};

                if(!t) { delete targetE.votes[u]; delete targetE.vDate[u]; delete targetE.proxyVotes[u]; } 
                else { 
                    targetE.votes[u] = t; 
                    targetE.vDate[u] = window.getNextRecurringDate(targetE); 
                    if(t === 'pending') { delete targetE.proxyVotes[u]; } else { targetE.proxyVotes[u] = sessionStorage.getItem('sonamu_user_name') || '관리자'; }
                }

                // [마일리지 누락 수정] 종료된 복사본이라면 부모의 pastVotes에도 투표 내역 동기화
                if (targetE.isFinished && targetE.originalId) {
                    const parent = evts.find(p => p.id === targetE.originalId);
                    if (parent && parent.pastVotes && parent.pastVotes[targetE.date]) {
                        if (!t) {
                            delete parent.pastVotes[targetE.date][u];
                            if (parent.pastVDates && parent.pastVDates[targetE.date]) {
                                delete parent.pastVDates[targetE.date][u];
                            }
                        } else {
                            parent.pastVotes[targetE.date][u] = t;
                            if (!parent.pastVDates) parent.pastVDates = {};
                            if (!parent.pastVDates[targetE.date]) parent.pastVDates[targetE.date] = {};
                            parent.pastVDates[targetE.date][u] = targetE.vDate[u];
                        }
                    }
                }
                tx.update(docSports, { teamEvents: evts, updatedAt: new Date().toISOString() });

                const mD = docM.data(); const membersList = mD.members || [];
                const targetM = membersList.find(x => x.id === u);
                if(targetM) {
                    const bD = docB.data();
                    targetM.score = window.getMemberCalculatedScore(targetM, evts, bD.posts || []);
                    tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
                }
            }
        });
        window.showToast("대리 투표 완료");
        window.updateDashboard();
        window.renderActivities();
    } catch(e) { console.error("Admin Vote Error:", e); }
    window.isSavingData = false; 
};

window.renderVoteEvent = () => {
    const td = window.getTodayString();
    const l = (posts||[]).filter(p=>p.isEvent).sort((a,b)=>String(a.eventDate||a.date).localeCompare(String(b.eventDate||b.date)));
    if(!l.length) {
        window.setHtml('vote-event-select','<option value="">회원 투표 없음</option>');
        window.setHtml('vote-event-action-container','');
        window.setHtml('vote-event-status-container','<div class="col-span-full py-6 text-center text-slate-600 font-black">공지게시판에서 회원 투표를 생성해주세요.</div>');
        const kbtn = window.$('btn-kakao-share-event'); if(kbtn) { kbtn.classList.add('hidden'); kbtn.classList.remove('flex'); }
        const abtn = window.$('btn-add-event-guest'); if(abtn) { abtn.classList.add('hidden'); abtn.classList.remove('flex'); }
        return;
    }
    
    const endedPosts = l.filter(e => e.endDate ? e.endDate < td : (e.eventDate || e.date) < td);
    const activePosts = l.filter(e => !l.find(x => x.id === e.id && (x.endDate ? x.endDate < td : (x.eventDate || x.date) < td)) || e.id === currentVotePostId);

    window.setHtml('vote-event-select', activePosts.map(e=> {
        const isEnded = e.endDate && e.endDate < td;
        return `<option value="${e.id}">${isEnded ? '[종료] ' : ''}${e.eventDate||e.date} | ${window.escapeHtml(e.title)}</option>`;
    }).join(''));
    
    // [UI] 종료된 투표 리스트 렌더링
    window.setHtml('ended-vote-count', endedPosts.length);
    const endedListHtml = endedPosts.length ? [...endedPosts].reverse().slice(0, 15).map(e => `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group" onclick="currentVotePostId='${e.id}'; window.renderVoteEvent(); window.$('vote-event-view').scrollIntoView({behavior:'smooth', block:'start'});">
            <div class="flex flex-col gap-0.5">
                <span class="text-xs font-black text-slate-700 group-hover:text-indigo-700 transition-colors">${window.escapeHtml(e.title)}</span>
                <span class="text-[9px] text-slate-400 font-bold">${e.eventDate||e.date} 마감</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg text-slate-500 font-bold">${Object.keys(e.votes||{}).length}명 투표</span>
                <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400"></i>
            </div>
        </div>
    `).join('') : '<div class="text-center py-6 text-slate-400 text-xs font-bold">이미 종료된 투표가 없습니다.</div>';
    window.setHtml('ended-vote-list-container', endedListHtml);

    if(!currentVotePostId || !l.some(e=>e.id===currentVotePostId)) { 
        const tEvt = activePosts.find(e=>(e.eventDate||e.date)>=td); 
        currentVotePostId = tEvt?tEvt.id:(activePosts.length ? activePosts[0].id : null); 
    }
    window.setVal('vote-event-select', currentVotePostId);
    
    const e = l.find(x=>x.id===currentVotePostId); if(!e) return; 
    if(!e.votes) e.votes={};
    if(!e.guestCounts) e.guestCounts={};
    if(!e.guestNames) e.guestNames={};
    
    const kbtn = window.$('btn-kakao-share-event');
    const abtn = window.$('btn-add-event-guest');
    if(kbtn) { if(window.isVotingAdmin()) { kbtn.classList.remove('hidden'); kbtn.classList.add('flex'); } else { kbtn.classList.add('hidden'); kbtn.classList.remove('flex'); } }
    if(abtn) { if(window.isVotingAdmin()) { abtn.classList.remove('hidden'); abtn.classList.add('flex'); } else { abtn.classList.add('hidden'); abtn.classList.remove('flex'); } }

    const uid = sessionStorage.getItem('sonamu_user_id'), isA = window.isVotingAdmin();
    const opts = e.eventOptions || ['참석', '불참', '미정'];
    const isEnded = e.endDate && e.endDate < td;
    
    let btnHtml = '';
    if (isEnded) {
        btnHtml = `<div class="col-span-full py-3.5 text-center text-slate-500 font-black bg-slate-100 rounded-2xl border border-slate-300 flex items-center justify-center gap-2">
            <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
            <span>마감 기한이 지난 투표입니다. ${isA ? '<span class="text-indigo-600 ml-1 font-black">(관리자 수정 가능)</span>' : ''}</span>
        </div>`;
    } else if(uid === 'master') {
        btnHtml = '<div class="col-span-full py-4 text-center text-slate-400 font-black bg-slate-50 rounded-xl border border-slate-200">마스터 계정은 투표할 수 없습니다.</div>';
    } else {
        const myV = e.votes[uid] || [];
        const myVArray = Array.isArray(myV) ? myV : (myV ? [myV] : []);
        const myCount = (e.guestCounts && e.guestCounts[uid]) ? (parseInt(e.guestCounts[uid]) || 1) : 1;
        const hasVoted = myVArray.length > 0;

        const styles = [
            { sel: 'bg-green-500 border-green-500 text-white shadow-[0_4px_15px_rgba(34,197,94,0.4)] transform scale-[1.02]', unsel: 'bg-white border-green-200 text-green-600 hover:bg-green-50', cir: 'border-green-300' },
            { sel: 'bg-blue-500 border-blue-500 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] transform scale-[1.02]', unsel: 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50', cir: 'border-blue-300' },
            { sel: 'bg-amber-500 border-amber-500 text-white shadow-[0_4px_15px_rgba(245,158,11,0.4)] transform scale-[1.02]', unsel: 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50', cir: 'border-amber-300' },
            { sel: 'bg-purple-500 border-purple-500 text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)] transform scale-[1.02]', unsel: 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50', cir: 'border-purple-300' },
            { sel: 'bg-rose-500 border-rose-500 text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] transform scale-[1.02]', unsel: 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50', cir: 'border-rose-300' }
        ];
        const btnBase = "py-4 md:py-5 rounded-2xl font-black transition-all duration-200 flex items-center justify-center gap-2.5 border-2 w-full text-base sm:text-lg btn-touch whitespace-normal break-words";
        const checkIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
        
        const optionButtons = opts.map((opt, idx) => {
            const isSel = myVArray.includes(opt);
            const st = styles[idx % styles.length];
            const iconHtml = isSel ? checkIcon : `<div class="w-5 h-5 rounded-full border-[2.5px] ${st.cir} shrink-0"></div>`;
            return `<button onclick="window.castVoteEvent('${window.escapeHtml(opt)}')" class="${btnBase} ${isSel ? st.sel : st.unsel}">${iconHtml}<span class="text-left leading-tight">${window.escapeHtml(opt)}</span></button>`;
        }).join('');

        // [NEW] 본인 포함 참석 인원 설정 UI (가족동반)
        const countControl = hasVoted ? `
            <div class="col-span-full bg-slate-50/80 border border-slate-200 p-4 rounded-2xl mt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div class="flex items-center gap-2">
                    <div class="p-2 rounded-xl bg-emerald-100 text-emerald-600"><i data-lucide="users" class="w-4 h-4"></i></div>
                    <div>
                        <div class="text-xs font-black text-slate-800">참석 인원수 설정 (가족/동반자 포함)</div>
                        <div class="text-[10px] font-bold text-slate-400">${myCount > 1 ? `본인 1명 + 동반 가족 ${myCount - 1}명` : '본인 1명 참석'}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.updateMyEventGuestCount(-1)" class="w-9 h-9 rounded-xl bg-white border border-slate-300 font-black text-slate-700 btn-touch flex items-center justify-center hover:bg-slate-100 text-base shadow-sm">-</button>
                    <span class="text-sm font-black text-emerald-700 bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 min-w-[90px] text-center shadow-inner">총 ${myCount}명 ${myCount > 1 ? `<span class="text-[10px] text-emerald-500 font-bold block">(외 ${myCount-1}명)</span>` : ''}</span>
                    <button onclick="window.updateMyEventGuestCount(1)" class="w-9 h-9 rounded-xl bg-white border border-slate-300 font-black text-slate-700 btn-touch flex items-center justify-center hover:bg-slate-100 text-base shadow-sm">+</button>
                </div>
            </div>
        ` : '';

        btnHtml = `<div class="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-${Math.min(opts.length, 4)} gap-3 md:gap-4 mb-3">${optionButtons}</div>${countControl}`;
    }
    window.setHtml('vote-event-action-container', btnHtml);
    
    const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
    const targetMembers = window.getSortedMembers().filter(m=>!excludeRoles.includes(m.role));
    
    const allAttendees = [...targetMembers];
    if (e.guestNames) {
        Object.keys(e.guestNames).forEach(gid => {
            if (!allAttendees.find(x => x.id === gid)) {
                allAttendees.push({ id: gid, name: e.guestNames[gid], role: '비회원', isGuest: true });
            }
        });
    }

    const voteGroups = {};
    const voteCounts = {};
    opts.forEach(opt => { voteGroups[opt] = []; voteCounts[opt] = 0; });
    let noVotes = [];
    let noVoteCount = 0;
    
    allAttendees.forEach(m => {
        const v = e.votes[m.id];
        const vArray = Array.isArray(v) ? v : (v ? [v] : []);
        const baseVArray = vArray.map(val => String(val).replace('_p', ''));
        const gCnt = (e.guestCounts && e.guestCounts[m.id]) ? (parseInt(e.guestCounts[m.id]) || 1) : 1;
        const gText = gCnt > 1 ? `<span class="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 ml-1 font-black">외 ${gCnt - 1}명</span>` : '';
        const guestBadge = m.isGuest ? `<span class="text-[9px] bg-purple-100 text-purple-700 border border-purple-200 px-1 py-0.5 rounded ml-1 font-black">비회원</span>` : '';
        
        // 관리자용 인원수 조절 셀렉트 (지난 투표에서도 관리자는 수정 가능)
        const countSel = isA ? `
            <select class="text-[9px] bg-slate-100 border border-slate-200 rounded px-1 py-0.5 ml-1 outline-none font-bold text-slate-700" onchange="window.updateVoteEventGuestCount('${currentVotePostId}', '${m.id}', this.value)" title="참석 총 인원수 변경">
                ${[1,2,3,4,5,6,7,8,9,10,12,15,20].map(num => `<option value="${num}" ${gCnt === num ? 'selected' : ''}>${num}명</option>`).join('')}
            </select>
        ` : '';

        // 관리자용 비회원 삭제 버튼
        const delBtn = (isA && m.isGuest) ? `
            <button onclick="window.removeGuestFromVoteEvent('${currentVotePostId}', '${m.id}')" class="text-rose-500 hover:text-rose-700 p-1 ml-1 btn-touch" title="비회원 삭제">
                <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
            </button>
        ` : '';

        // 관리자용 투표 변경 셀렉트 (지난 투표에서도 관리자는 수정 가능)
        const optSel = (isA && (m.id !== uid || isEnded || m.isGuest)) ? `
            <select class="text-[9px] bg-slate-100 border border-slate-200 rounded px-1 py-0.5 ml-1 outline-none font-bold text-slate-700" onchange="window.castVoteForEvent('${m.id}',this.value); this.value='';">
                <option value="">대리/수정</option>
                <option value="CLEAR">초기화(비우기)</option>
                ${opts.map(o=>`<option value="${window.escapeHtml(o)}">${baseVArray.includes(o)?'✓ ':''}${window.escapeHtml(o)}</option>`).join('')}
            </select>
        ` : '';

        const str = `<div class="flex justify-between items-center w-full py-0.5">
            <span class="flex items-center flex-wrap"><span class="text-black dark:text-slate-100 font-black">${window.escapeHtml(m.name)}</span>${guestBadge}${gText}</span>
            <span class="flex items-center shrink-0">${countSel}${optSel}${delBtn}</span>
        </div>`;

        let voted = false;
        baseVArray.forEach(val => {
            if (opts.includes(val)) {
                voteGroups[val].push(str);
                voteCounts[val] += gCnt;
                voted = true;
            }
        });
        if (!voted) {
            if (!m.isGuest) {
                if (opts.includes('미정')) {
                    voteGroups['미정'].push(str);
                    voteCounts['미정'] += gCnt;
                } else {
                    noVotes.push(str);
                    noVoteCount += gCnt;
                }
            }
        }
    });

    const c = (col, n, arr, cnt) => {
        const isAttend = n.includes('참석');
        const badgeText = isAttend ? `총 ${cnt}명 (${arr.length}건)` : `${cnt}명`;
        return `<div class="bg-${col}-50 dark:bg-${col}-900/20 p-4 rounded-xl border border-${col}-100 dark:border-${col}-800/30"><div class="text-${col}-700 dark:text-${col}-300 text-xs font-black mb-2 flex justify-between border-b border-${col}-200 dark:border-${col}-800 pb-2"><span>${n}</span><span class="bg-${col}-200 dark:bg-${col}-800 px-2 py-0.5 rounded-full font-black">${badgeText}</span></div><div class="text-sm font-black flex flex-col gap-1.5">${arr.length ? arr.join('') : '<span class="text-[10px] text-slate-600 font-bold">없음</span>'}</div></div>`;
    };
    let statHtml = '';
    const colorClasses = ['green', 'blue', 'amber', 'purple', 'rose', 'cyan'];
    
    // [NEW] 종료된 투표를 위한 통계 요약 대시보드 (총 투표 참여수는 회원 기준)
    if(isEnded) {
        const totalMemberVoters = targetMembers.filter(m => e.votes && e.votes[m.id]).length;
        statHtml += `<div class="col-span-full bg-slate-900 p-6 rounded-[2rem] border border-slate-700 shadow-xl mb-6 flex flex-col gap-5">
            <div class="flex justify-between items-center border-b border-slate-700 pb-3">
                <h4 class="text-white text-sm font-black flex items-center gap-1.5"><i data-lucide="bar-chart-2" class="text-indigo-400"></i> 최종 투표 결과 요약</h4>
                <span class="text-xs text-amber-400 font-black">총 투표 참여 ${totalMemberVoters}명 <span class="text-slate-400 text-[10px]">(정규회원 기준)</span></span>
            </div>
            <div class="space-y-4">`;
        opts.forEach((opt, idx) => {
            const count = voteCounts[opt] || 0;
            const isAttend = opt === '참석';
            const colorHex = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#f43f5e', '#06b6d4'];
            const pct = totalMemberVoters ? Math.round((voteGroups[opt].length / totalMemberVoters) * 100) : 0;
            statHtml += `
                <div class="flex flex-col gap-1.5">
                    <div class="flex justify-between text-[11px] font-black">
                        <span class="text-slate-300">${opt}</span>
                        <span class="text-white">${isAttend ? `총 ${count}명 (참석인원 합계)` : `${count}명`} <span class="text-slate-400 text-[10px]">(${voteGroups[opt].length}건 투표, ${pct}%)</span></span>
                    </div>
                    <div class="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div class="h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(255,255,255,0.1)]" style="width:${pct}%; background-color:${colorHex[idx % colorHex.length]}"></div>
                    </div>
                </div>
            `;
        });
        statHtml += `</div></div>`;
    }

    opts.forEach((opt, idx) => {
        const color = colorClasses[idx % colorClasses.length];
        const dispName = opt === '미정' ? '미정/미참여' : opt;
        statHtml += c(color, dispName, voteGroups[opt], voteCounts[opt] || 0);
    });
    if (noVotes.length > 0) statHtml += c('slate', '미참여', noVotes, noVoteCount);
    window.setHtml('vote-event-status-container', statHtml);
    if(window.lucide) window.lucide.createIcons();
};

window.shareKakaoVoteEvent = async () => {
    if(!currentVotePostId) return window.showAlert("선택된 투표가 없습니다.");
    const p = (posts||[]).find(x => x.id === currentVotePostId); if(!p) return window.showAlert("선택된 투표가 없습니다.");
    
    let voteTally = {}; 
    let voteCountTally = {};
    const opts = p.eventOptions || ['참석', '불참', '미정'];
    opts.forEach(opt => { voteTally[opt] = []; voteCountTally[opt] = 0; });
    
    const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
    const targetMembers = window.getSortedMembers().filter(m=>!excludeRoles.includes(m.role));
    const allAttendees = [...targetMembers];
    if (p.guestNames) {
        Object.keys(p.guestNames).forEach(gid => {
            if (!allAttendees.find(x => x.id === gid)) {
                allAttendees.push({ id: gid, name: p.guestNames[gid], role: '비회원', isGuest: true });
            }
        });
    }

    allAttendees.forEach(m => {
        const v = p.votes && p.votes[m.id];
        const vArray = Array.isArray(v) ? v : (v ? [v] : []);
        const baseVArray = vArray.map(val => String(val).replace('_p', ''));
        const gCnt = (p.guestCounts && p.guestCounts[m.id]) ? (parseInt(p.guestCounts[m.id]) || 1) : 1;
        const gText = gCnt > 1 ? ` (외 ${gCnt - 1}명)` : '';
        const dispName = m.name + gText;
        
        let voted = false;
        baseVArray.forEach(val => { 
            if(voteTally[val]) { 
                voteTally[val].push(dispName); 
                voteCountTally[val] += gCnt;
                voted = true; 
            }
        });
        if (!voted && !m.isGuest && opts.includes('미정')) {
            voteTally['미정'].push(dispName);
            voteCountTally['미정'] += gCnt;
        }
    });

    const totalMemberVoters = targetMembers.filter(m => p.votes && p.votes[m.id]).length;
    const isEnded = p.endDate && p.endDate < window.getTodayString();
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?tab=vote&eventId=${p.id}`;
    
    let resultItems = opts.map(opt => {
        const isAttend = opt === '참석';
        const label = isAttend ? `🔹 ${opt}(총 ${voteCountTally[opt]}명)` : `🔹 ${opt === '미정' ? '미정/미참여' : opt}(${voteTally[opt].length}명)`;
        return `${label}: ${voteTally[opt].join(', ') || '없음'}`;
    });
    
    const shareText = `📋 [소나무 회원투표 ${isEnded ? '결과' : '현황'}]\n\n제목: ${p.title}\n일정: ${p.eventDate || p.date}\n총 투표참여: ${totalMemberVoters}명 (회원 기준)\n\n${resultItems.join('\n')}\n\n👇 ${isEnded ? '상세 결과 보기' : '투표 참여 및 현황 보기'}\n${shareUrl}`;

    if (navigator.share) {
        try { await navigator.share({ title: `소나무 회원투표 ${isEnded ? '결과' : '공유'}`, text: shareText, url: shareUrl }); } catch (err) {}
    } else {
        window.copyToClipboard(shareText);
        window.showAlert("결과가 복사되었습니다!\n카카오톡 등에 '붙여넣기' 해주세요.");
    }
};

window.shareKakaoVoteAnon = async () => {
    if(!currentVoteAnonId) return window.showAlert("선택된 투표가 없습니다.");
    const p = (posts||[]).find(x => x.id === currentVoteAnonId); if(!p) return window.showAlert("선택된 투표가 없습니다.");
    const opts = p.anonOptions || ['찬성', '반대']; const totalVotes = Object.keys(p.votes||{}).length;
    let resultItems = opts.map(opt => {
        const count = Object.values(p.votes||{}).filter(v=>v===opt).length;
        const pct = totalVotes ? Math.round((count/totalVotes)*100) : 0;
        return `🔒 ${opt}: ${count}명 (${pct}%)`;
    });
    const baseUrl = window.location.origin + window.location.pathname;
    const isEnded = p.endDate && p.endDate < window.getTodayString();
    const shareUrl = `${baseUrl}?tab=vote&eventId=${p.id}`;
    const shareText = `🔒 [소나무 무기명투표 ${isEnded ? '결과' : '공유'}]\n\n제목: ${p.title}\n참여: 총 ${totalVotes}명\n\n${resultItems.join('\n')}\n\n👇 ${isEnded ? '상세 결과 보기' : '투표 참여 및 현황 보기'}\n${shareUrl}`;
    if (navigator.share) { try { await navigator.share({ title: '소나무 무기명투표 결과', text: shareText, url: shareUrl }); } catch (err) {} }
    else { window.copyToClipboard(shareText); window.showAlert("결과가 복사되었습니다!\n카카오톡 등에 '붙여넣기' 해주세요."); }
};

window.shareKakaoPost = async (id) => {
    const p = (posts||[]).find(x => x.id === id); if(!p) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?tab=board`;
    let typeIcon = '📢', typeName = '공지사항', extra = '';
    if(p.isEvent) { typeIcon = '📋'; typeName = '회원투표'; extra = `\n현재 ${Object.keys(p.votes||{}).length}명 투표 중`; } 
    else if(p.isAnon) { typeIcon = '🔒'; typeName = '무기명투표'; extra = `\n현재 ${Object.keys(p.votes||{}).length}명 투표 중`; }
    const shareText = `${typeIcon} [소나무 ${typeName}]\n\n제목: ${p.title}\n날짜: ${p.date}\n내용: ${p.content.substring(0, 100)}${p.content.length > 100 ? '...' : ''}${extra}\n\n👇 상세 내용 보기\n${shareUrl}`;
    if (navigator.share) { try { await navigator.share({ title: `소나무 ${typeName}`, text: shareText, url: shareUrl }); } catch (err) {} }
    else { window.copyToClipboard(shareText); window.showAlert("공지 내용이 복사되었습니다!\n카카오톡 등에 '붙여넣기' 해주세요."); }
};

window.changeVoteEvent = () => { currentVotePostId=window.$('vote-event-select').value; window.renderVoteEvent(); };

window.castVoteEvent = async (t, eid) => { 
    if(window.isSavingData) return; window.isSavingData = true;
    const uid = sessionStorage.getItem('sonamu_user_id');
    if(uid === 'master') { window.isSavingData = false; return window.showAlert("마스터 계정은 투표할 수 없습니다."); }
    
    const cid = eid || currentVotePostId;
    if(!cid) { window.isSavingData = false; return; }

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if (!docB.exists) throw new Error("게시판 문서가 존재하지 않습니다.");
            const docM = await tx.get(docMembers); if (!docM.exists) throw new Error("회원 문서가 존재하지 않습니다.");
            const docS = await tx.get(docSports);

            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === cid);
            if(!targetP) throw new Error("해당 투표 항목을 찾을 수 없습니다.");

            if(!targetP.votes) targetP.votes={};
            if(!targetP.vDate) targetP.vDate={};
            if(!targetP.guestCounts) targetP.guestCounts={};
            if(!targetP.guestCounts[uid]) targetP.guestCounts[uid] = 1;
            
            if (targetP.allowMultiple) {
                let cv = targetP.votes[uid]; let arr = Array.isArray(cv) ? [...cv] : (cv ? [cv] : []);
                if (arr.includes(t)) arr = arr.filter(x => x !== t); else arr.push(t);
                if (arr.length) { 
                    targetP.votes[uid] = arr; 
                    targetP.vDate[uid] = window.getTodayString().substring(0, 7);
                } else { 
                    delete targetP.votes[uid]; 
                    delete targetP.vDate[uid]; 
                    delete targetP.guestCounts[uid];
                }
            } else { 
                targetP.votes[uid] = t; 
                targetP.vDate[uid] = window.getTodayString().substring(0, 7);
            }
            
            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });

            const mD = docM.data(); const membersList = mD.members || [];
            const targetM = membersList.find(x => x.id === uid);
            if(targetM) {
                const sD = docS.exists ? docS.data() : { teamEvents: [] };
                targetM.score = window.getMemberCalculatedScore(targetM, sD.teamEvents || [], postsList);
                tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
            }
        });

        // 로컬 데이터 동기화
        const localP = (posts||[]).find(x => x.id === cid);
        if (localP) {
            if (!localP.votes) localP.votes = {};
            if (!localP.vDate) localP.vDate = {};
            if (!localP.guestCounts) localP.guestCounts = {};
            if (!localP.guestCounts[uid]) localP.guestCounts[uid] = 1;
            if (localP.allowMultiple) {
                let cv = localP.votes[uid]; let arr = Array.isArray(cv) ? [...cv] : (cv ? [cv] : []);
                if (arr.includes(t)) arr = arr.filter(x => x !== t); else arr.push(t);
                if (arr.length) { localP.votes[uid] = arr; localP.vDate[uid] = window.getTodayString().substring(0,7); }
                else { delete localP.votes[uid]; delete localP.vDate[uid]; delete localP.guestCounts[uid]; }
            } else {
                localP.votes[uid] = t; localP.vDate[uid] = window.getTodayString().substring(0,7);
            }
        }
        
        window.showToast("투표가 성공적으로 저장되었습니다.");
        window.renderVoteEvent();
        window.updateDashboard();
        window.renderActivities();
    } catch(e) {
        console.error("Selection Save Error:", e);
        window.showAlert("서버 저장 중 오류가 발생했습니다: " + e.message);
    }
    window.isSavingData = false;
};

// [NEW] 본인 참석 인원수 변경
window.updateMyEventGuestCount = async (delta) => {
    if(!currentVotePostId) return;
    const uid = sessionStorage.getItem('sonamu_user_id');
    if(!uid || uid === 'master') return;
    if(window.isSavingData) return; window.isSavingData = true;

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if(!docB.exists) return;
            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === currentVotePostId);
            if(!targetP) return;

            if(!targetP.guestCounts) targetP.guestCounts = {};
            const curCnt = parseInt(targetP.guestCounts[uid]) || 1;
            const newCnt = Math.max(1, Math.min(99, curCnt + delta));
            targetP.guestCounts[uid] = newCnt;

            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
        });

        const localP = (posts||[]).find(x => x.id === currentVotePostId);
        if(localP) {
            if(!localP.guestCounts) localP.guestCounts = {};
            const curCnt = parseInt(localP.guestCounts[uid]) || 1;
            localP.guestCounts[uid] = Math.max(1, Math.min(99, curCnt + delta));
        }

        window.renderVoteEvent();
        window.showToast("참석 인원수가 수정되었습니다.");
    } catch(e) {
        console.error("Guest Count Update Error:", e);
    }
    window.isSavingData = false;
};

// [NEW] 관리자 - 회원/비회원 인원수 직접 수정
window.updateVoteEventGuestCount = async (postId, targetId, count) => {
    if(!window.isVotingAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true;
    const num = Math.max(1, parseInt(count) || 1);

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if(!docB.exists) return;
            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === postId);
            if(!targetP) return;

            if(!targetP.guestCounts) targetP.guestCounts = {};
            targetP.guestCounts[targetId] = num;

            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
        });

        const localP = (posts||[]).find(x => x.id === postId);
        if(localP) {
            if(!localP.guestCounts) localP.guestCounts = {};
            localP.guestCounts[targetId] = num;
        }

        window.renderVoteEvent();
        window.showToast(`인원수가 ${num}명으로 수정되었습니다.`);
    } catch(e) {
        console.error("Admin Guest Count Error:", e);
    }
    window.isSavingData = false;
};

// [NEW] 비회원/가족 참석자 추가 모달 제어
window.openEventAddGuestModal = () => {
    if(!window.isVotingAdmin()) return window.showAlert("관리자 권한이 필요합니다.");
    const p = (posts||[]).find(x => x.id === currentVotePostId);
    if(!p) return window.showAlert("선택된 투표가 없습니다.");

    const opts = p.eventOptions || ['참석', '불참', '미정'];
    const sel = window.$('select-event-guest-option');
    if(sel) {
        sel.innerHTML = opts.map(o => `<option value="${window.escapeHtml(o)}">${window.escapeHtml(o)}</option>`).join('');
    }
    window.setVal('input-event-guest-name', '');
    window.setVal('input-event-guest-count', 1);

    const m = window.$('event-add-guest-modal');
    if(m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
    }
};

window.closeEventAddGuestModal = () => {
    const m = window.$('event-add-guest-modal');
    if(m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
    }
};

window.submitEventAddGuest = async () => {
    const name = (window.$('input-event-guest-name')?.value || '').trim();
    const count = parseInt(window.$('input-event-guest-count')?.value || 1) || 1;
    const option = window.$('select-event-guest-option')?.value || '참석';

    if(!name) return window.showAlert("참석자 이름 또는 표기명을 입력해주세요.\n(예: 홍길동 가족, 김철수(비회원) 등)");
    if(count < 1) return window.showAlert("참여 인원수는 1명 이상이어야 합니다.");

    await window.addGuestToVoteEvent(currentVotePostId, name, count, option);
    window.closeEventAddGuestModal();
};

// [NEW] 비회원 참석자 Firestore 저장
window.addGuestToVoteEvent = async (postId, name, count, option) => {
    if(!window.isVotingAdmin()) return;
    if(window.isSavingData) return; window.isSavingData = true;
    const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if(!docB.exists) return;
            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === postId);
            if(!targetP) return;

            if(!targetP.votes) targetP.votes = {};
            if(!targetP.vDate) targetP.vDate = {};
            if(!targetP.guestNames) targetP.guestNames = {};
            if(!targetP.guestCounts) targetP.guestCounts = {};

            targetP.guestNames[guestId] = name;
            targetP.guestCounts[guestId] = count;
            targetP.votes[guestId] = option;
            targetP.vDate[guestId] = window.getTodayString().substring(0, 7);

            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
        });

        const localP = (posts||[]).find(x => x.id === postId);
        if(localP) {
            if(!localP.votes) localP.votes = {};
            if(!localP.vDate) localP.vDate = {};
            if(!localP.guestNames) localP.guestNames = {};
            if(!localP.guestCounts) localP.guestCounts = {};
            localP.guestNames[guestId] = name;
            localP.guestCounts[guestId] = count;
            localP.votes[guestId] = option;
            localP.vDate[guestId] = window.getTodayString().substring(0, 7);
        }

        window.renderVoteEvent();
        window.showToast(`${name} (${count}명) 참석자가 등록되었습니다.`);
    } catch(e) {
        console.error("Add Event Guest Error:", e);
        window.showAlert("비회원 추가 중 오류가 발생했습니다: " + e.message);
    }
    window.isSavingData = false;
};

// [NEW] 비회원 참석자 삭제
window.removeGuestFromVoteEvent = async (postId, guestId) => {
    if(!window.isVotingAdmin()) return;
    window.showConfirm("해당 비회원/가족 참석자를 삭제하시겠습니까?", async () => {
        if(window.isSavingData) return; window.isSavingData = true;

        try {
            await db.runTransaction(async (tx) => {
                const docB = await tx.get(docBoard); if(!docB.exists) return;
                const bD = docB.data(); const postsList = bD.posts || [];
                const targetP = postsList.find(x => x.id === postId);
                if(!targetP) return;

                if(targetP.guestNames) delete targetP.guestNames[guestId];
                if(targetP.guestCounts) delete targetP.guestCounts[guestId];
                if(targetP.votes) delete targetP.votes[guestId];
                if(targetP.vDate) delete targetP.vDate[guestId];

                tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
            });

            const localP = (posts||[]).find(x => x.id === postId);
            if(localP) {
                if(localP.guestNames) delete localP.guestNames[guestId];
                if(localP.guestCounts) delete localP.guestCounts[guestId];
                if(localP.votes) delete localP.votes[guestId];
                if(localP.vDate) delete localP.vDate[guestId];
            }

            window.renderVoteEvent();
            window.showToast("참석자가 삭제되었습니다.");
        } catch(e) {
            console.error("Remove Guest Error:", e);
        }
        window.isSavingData = false;
    });
};

window.castVoteForEvent = async (u,t) => { 
    if(!window.isVotingAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true;
    const localP=(posts||[]).find(x=>x.id===currentVotePostId); 
    if(localP) { 
        if(!localP.votes) localP.votes={}; 
        if(!localP.vDate) localP.vDate={};
        if (t === 'CLEAR' || !t) { delete localP.votes[u]; delete localP.vDate[u]; } else {
            const proxyVal = t + '_p';
            if (localP.allowMultiple) {
                let cv = localP.votes[u]; let arr = Array.isArray(cv) ? [...cv] : (cv ? [cv] : []);
                if (arr.some(v => v.replace('_p','') === t)) {
                    arr = arr.filter(x => x.replace('_p','') !== t);
                } else {
                    arr.push(proxyVal);
                }
                if (arr.length) { 
                    localP.votes[u] = arr; 
                    localP.vDate[u] = window.getTodayString().substring(0, 7);
                } else { delete localP.votes[u]; delete localP.vDate[u]; }
            } else { 
                localP.votes[u] = proxyVal; 
                localP.vDate[u] = window.getTodayString().substring(0, 7);
            }
        }
        window.renderVoteEvent();
        window.updateDashboard();
        window.renderActivities();
    }

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if (!docB.exists) return;
            const docM = await tx.get(docMembers); if (!docM.exists) return;
            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === currentVotePostId);
            if(targetP) {
                if(!targetP.votes) targetP.votes={};
                if(!targetP.vDate) targetP.vDate={};
                
                const oldV = targetP.votes[u];
                const oldPts = window.getBoardPts(oldV);

                if (t === 'CLEAR' || !t) { delete targetP.votes[u]; delete targetP.vDate[u]; } else {
                    const proxyVal = t + '_p';
                    if (targetP.allowMultiple) {
                        let cv = targetP.votes[u]; let arr = Array.isArray(cv) ? [...cv] : (cv ? [cv] : []);
                        if (arr.some(v => v.replace('_p','') === t)) {
                            arr = arr.filter(x => x.replace('_p','') !== t);
                        } else {
                            arr.push(proxyVal);
                        }
                        if (arr.length) { 
                            targetP.votes[u] = arr; 
                            targetP.vDate[u] = window.getTodayString().substring(0, 7);
                        } else { delete targetP.votes[u]; delete targetP.vDate[u]; }
                    } else { 
                        targetP.votes[u] = proxyVal; 
                        targetP.vDate[u] = window.getTodayString().substring(0, 7);
                    }
                }
                
                const newPts = window.getBoardPts(targetP.votes[u]);
                const diff = newPts - oldPts;

                tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });

                const mD = docM.data(); const membersList = mD.members || [];
                const targetM = membersList.find(x => x.id === u);
                if(targetM) {
                    targetM.score = (parseFloat(targetM.score)||0) + diff;
                    tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
                }
            }
        });
        window.showToast("대리 투표 완료");
        window.updateDashboard();
        window.renderActivities();
    } catch(e) {
        console.error("Admin proxy vote error:", e);
    }
    window.isSavingData = false;
};

// [신규] 무기명 투표 보안 마스킹 키 생성 (UID와 PostID를 조합하여 식별 어렵게 함)
window.getAnonMask = (uid, pid) => {
    try { return btoa(pid + '_' + uid).replace(/=/g, '').substring(0, 24); } catch(e) { return uid; }
};

window.renderVoteAnon = () => {
    const td = window.getTodayString();
    const l = (posts||[]).filter(p=>p.isAnon).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(!l.length) {
        window.setHtml('vote-anon-select','<option value="">무기명 투표 없음</option>');
        window.setHtml('vote-anon-action-container','');
        window.setHtml('vote-anon-status-container','<div class="col-span-full py-6 text-center text-slate-600 font-black">공지게시판에서 무기명 투표를 생성해주세요.</div>');
        window.setHtml('ended-vote-anon-list-container', '<div class="text-center py-6 text-slate-400 text-xs font-bold">이미 종료된 투표가 없습니다.</div>');
        return;
    }
    
    // [보완] 활성/종료 분리 로직 강화
    const endedPosts = l.filter(e => e.endDate ? e.endDate < td : e.date < td);
    const activePosts = l.filter(e => !l.find(x => x.id === e.id && (x.endDate ? x.endDate < td : x.date < td)) || e.id === currentVoteAnonId);

    window.setHtml('vote-anon-select', activePosts.map(e=> {
        const isEnded = e.endDate ? e.endDate < td : e.date < td;
        return `<option value="${e.id}">${isEnded ? '[종료] ' : ''}${e.date} | ${window.escapeHtml(e.title)}</option>`;
    }).join(''));

    // [UI] 종료된 무기명 투표 리스트 렌더링
    window.setHtml('ended-vote-anon-count', endedPosts.length);
    const endedListHtml = endedPosts.length ? [...endedPosts].reverse().slice(0, 15).map(e => `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group" onclick="currentVoteAnonId='${e.id}'; window.renderVoteAnon(); window.$('vote-anon-view').scrollIntoView({behavior:'smooth', block:'start'});">
            <div class="flex flex-col gap-0.5">
                <span class="text-xs font-black text-slate-700 group-hover:text-rose-700 transition-colors">${window.escapeHtml(e.title)}</span>
                <span class="text-[9px] text-slate-400 font-bold">${e.date} 마감</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg text-slate-500 font-bold">${Object.keys(e.votes||{}).length}명 참여</span>
                <i data-lucide="pie-chart" class="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-400"></i>
            </div>
        </div>
    `).join('') : '<div class="text-center py-6 text-slate-400 text-xs font-bold">이미 종료된 투표가 없습니다.</div>';
    window.setHtml('ended-vote-anon-list-container', endedListHtml);

    if(!currentVoteAnonId || !l.some(e=>e.id===currentVoteAnonId)) {
        currentVoteAnonId = activePosts.length ? activePosts[0].id : null;
    }
    window.setVal('vote-anon-select', currentVoteAnonId);
    
    const e = l.find(x=>x.id===currentVoteAnonId); if(!e) return;
    const isEnded = e.endDate ? e.endDate < td : e.date < td;
    
    // [익명 보장] 마스킹 키를 사용하여 자신의 투표값 조회
    const uid = sessionStorage.getItem('sonamu_user_id');
    const mask = window.getAnonMask(uid, e.id);
    const myV = (e.anonVotes && e.anonVotes[mask]) ? e.anonVotes[mask] : null;
    
    let btnHtml = '';
    if (isEnded) {
        btnHtml = '<div class="col-span-full py-4 text-center text-slate-500 font-black bg-slate-100 rounded-xl border border-slate-300">마감 기한이 지나 종료된 투표입니다.</div>';
    } else if(uid === 'master') {
        btnHtml = '<div class="col-span-full py-4 text-center text-slate-400 font-black bg-slate-50 rounded-xl border border-slate-200">마스터 계정은 투표할 수 없습니다.</div>';
    } else {
        const opts = e.anonOptions || ['찬성','반대'];
        const btnBase = "py-4 md:py-5 rounded-2xl font-black transition-all duration-200 flex items-center justify-center gap-2.5 border-2 w-full text-base sm:text-lg btn-touch whitespace-normal break-words";
        const checkIcon = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
        
        btnHtml = opts.map(opt => {
            const isSel = myV===opt;
            const selCls = 'bg-rose-500 border-rose-500 text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] transform scale-[1.02]';
            const unselCls = 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50';
            const iconHtml = isSel ? checkIcon : `<div class="w-5 h-5 rounded-full border-[2.5px] border-slate-300 shrink-0"></div>`;
            return `<button onclick="window.castVoteAnon('${window.escapeHtml(opt)}')" class="${btnBase} ${isSel ? selCls : unselCls}">${iconHtml}<span class="text-left leading-tight">${window.escapeHtml(opt)}</span></button>`;
        }).join('');
    }
    window.setHtml('vote-anon-action-container', (isEnded || uid === 'master') ? btnHtml : `<div class="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-${Math.min((e.anonOptions||['찬성','반대']).length, 4)} gap-3 md:gap-4 mb-6">${btnHtml}</div>`);
    
    let statHtml = '';
    const voters = e.voters || {};
    const results = e.anonResults || {};
    const totalVotes = Object.keys(voters).length;
    
    (e.anonOptions || ['찬성','반대','미정']).forEach(opt => {
        const count = results[opt] || 0;
        const pct = totalVotes ? Math.round((count/totalVotes)*100) : 0;
        statHtml += `<div class="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30"><div class="text-rose-700 dark:text-rose-300 text-sm font-black mb-2 flex justify-between items-end"><span>${window.escapeHtml(opt)}</span><span class="text-xl">${count}명 <span class="text-xs text-rose-400 dark:text-rose-500 font-bold ml-1">(${pct}%)</span></span></div><div class="w-full bg-rose-200 dark:bg-rose-800 h-2.5 rounded-full overflow-hidden"><div class="bg-rose-500 h-full rounded-full transition-all" style="width:${pct}%"></div></div></div>`;
    });
    window.setHtml('vote-anon-status-container', `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">${statHtml}</div><div class="flex justify-between items-center"><button onclick="window.shareKakaoVoteAnon()" class="bg-white border text-slate-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm btn-touch flex items-center gap-2 hover:bg-slate-50 transition-colors"><i data-lucide="share-2" class="w-3.5 h-3.5"></i> 결과 공유</button><div class="text-right text-xs text-slate-400 font-bold bg-slate-50 p-2 rounded border border-slate-200 inline-block"><i data-lucide="lock" class="w-3 h-3 inline"></i> 총 ${totalVotes}명 참여 (익명성 보완 완료)</div></div><div class="clear-both"></div>`);
    if(window.lucide) window.lucide.createIcons();
};

window.changeVoteAnon = () => { currentVoteAnonId=window.$('vote-anon-select').value; window.renderVoteAnon(); };

window.castVoteAnon = async (t, eid) => { 
    if(window.isSavingData) return; window.isSavingData = true; 
    const uid = sessionStorage.getItem('sonamu_user_id');
    if(uid === 'master') { window.isSavingData = false; return window.showAlert("마스터 계정은 투표할 수 없습니다."); } 
    
    const cid = eid || currentVoteAnonId;
    if(!cid) { window.isSavingData = false; return; }

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard); if (!docB.exists) throw new Error("게시판 문서 없음");
            const docM = await tx.get(docMembers); if (!docM.exists) throw new Error("회원 문서 없음");
            const docS = await tx.get(docSports);

            const bD = docB.data(); const postsList = bD.posts || [];
            const targetP = postsList.find(x => x.id === cid);
            if(!targetP) throw new Error("투표 항목 없음");

            if(!targetP.voters) targetP.voters = {}; 
            if(!targetP.anonVotes) targetP.anonVotes = {};
            if(!targetP.anonResults) targetP.anonResults = {};

            const mask = window.getAnonMask(uid, cid);
            const oldV = targetP.anonVotes[mask];

            // 자신의 투표 수정 로직
            if(oldV) {
                if(targetP.anonResults[oldV] > 0) targetP.anonResults[oldV]--;
            }
            
            targetP.voters[uid] = window.getTodayString(); 
            targetP.anonVotes[mask] = t;
            targetP.anonResults[t] = (targetP.anonResults[t] || 0) + 1;
            
            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });

            // 마일리지 계산
            const mD = docM.data(); const membersList = mD.members || [];
            const targetM = membersList.find(x => x.id === uid);
            if(targetM) {
                const sD = docS.exists ? docS.data() : { teamEvents: [] };
                targetM.score = window.getMemberCalculatedScore(targetM, sD.teamEvents || [], postsList);
                tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
            }
        });

        window.showToast("익명 투표가 저장되었습니다 (수정 가능).");
        window.renderVoteAnon(); 
        window.updateDashboard();
        window.renderActivities();
    } catch(e) {
        console.error("Anon Vote Error:", e);
        window.showAlert(e.message || "서버 저장 실패");
    }
    window.isSavingData = false; 
};

window.goToFreeBoard = () => {
    window.showTab('gallery');
    window.switchActivitySubTab('free');
};

