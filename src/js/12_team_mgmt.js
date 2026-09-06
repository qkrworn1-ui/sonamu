// --- [8. 탭: 경기관리 (빠른 배치 적용 및 스코어보드)] ---
let qaSelectedPlayer = null;

window.renderTeamManagement = () => {
    // [고도화] 종료된 일정(isFinished)은 관리 목록에서 제외하여 클러터링 방지
    const activeEvents = (teamEvents||[]).filter(e => !e.isFinished);
    const sL = activeEvents.map(e=>({...e, dDate:window.getNextRecurringDate(e), rL:window.getRepeatLabel(e)})).sort((a,b)=>a.isPinned&&!b.isPinned?-1:!a.isPinned&&b.isPinned?1:String(b.dDate||'').localeCompare(String(a.dDate||'')));
    
    window.setHtml('team-event-select', sL.map(e=>`<option value="${e.id}">${e.isPinned?'📌 ':''}${e.dDate} | ${e.title}${e.location ? ' ('+e.location+')' : ''} ${e.rL}</option>`).join(''));
    
    if(sL.length && (!currentTeamEventId || !sL.some(e=>e.id===currentTeamEventId))) {
        const td = window.getTodayString();
        let tE = sL.find(e => e.dDate === td);
        if(!tE) { const futures = [...sL].filter(e => e.dDate > td).sort((a,b) => String(a.dDate).localeCompare(String(b.dDate))); tE = futures.length ? futures[0] : sL[0]; }
        currentTeamEventId = tE.id;
    }
    window.setVal('team-event-select', currentTeamEventId);
    
    const e = activeEvents.find(x=>x.id===currentTeamEventId);
    
    // [수정] 다가오는 일정 5개 렌더링 (반복 일정의 미래 발생 건들 포함)
    const today = window.getTodayString();
    let allOccurrences = [];
    
    (teamEvents || []).forEach(ev => {
        if (!ev.repeatMode || ev.repeatMode === 'none') {
            if (ev.date >= today) allOccurrences.push({ ...ev, dDate: ev.date });
        } else {
            // 반복 일정의 경우 미래의 5개 날짜를 미리 계산하여 후보에 추가
            let start = Math.max(new Date(ev.date || 0).getTime(), new Date(today).getTime());
            let cur = new Date(start);
            let found = 0;
            const fmt = d => new Date(d.getTime()-(d.getTimezoneOffset()*60000)).toISOString().substring(0,10);
            
            // 최대 90일 또는 5개까지 탐색
            for (let i = 0; i < 90 && found < 5; i++) {
                let ds = fmt(cur);
                let isMatch = false;
                if (ev.repeatMode === 'weekly' && Array.isArray(ev.repeatData)) {
                    isMatch = ev.repeatData.includes(cur.getDay());
                } else if (ev.repeatMode === 'monthly' && ev.repeatData) {
                    const nw = parseInt(ev.repeatData.week), tdDay = parseInt(ev.repeatData.day);
                    let y = cur.getFullYear(), m = cur.getMonth(), fd = new Date(y, m, 1).getDay(), off = tdDay - fd;
                    if (off < 0) off += 7;
                    let trg = 1 + off + (nw <= 4 ? (nw - 1) * 7 : 0);
                    if (nw > 4) { let ld = new Date(y, m + 1, 0).getDate(); while (trg + 7 <= ld) trg += 7; }
                    isMatch = cur.getDate() === trg;
                }
                
                if (isMatch && ds >= today) {
                    allOccurrences.push({ ...ev, dDate: ds });
                    found++;
                }
                cur.setDate(cur.getDate() + 1);
            }
        }
    });

    const upcomings = allOccurrences
        .sort((a,b) => a.dDate.localeCompare(b.dDate))
        .slice(0, 5);
        
    const upHtml = upcomings.length ? upcomings.map(ev => `
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer" onclick="window.setVal('team-event-select','${ev.id}'); window.changeTeamEvent();">
            <div class="flex flex-col">
                <span class="text-sm font-black text-slate-800">${window.escapeHtml(ev.title)}</span>
                <span class="text-[10px] text-slate-400 font-bold mt-0.5">${window.getRepeatLabel(ev)}</span>
            </div>
            <div class="text-right">
                <div class="text-blue-600 text-xs font-black">${ev.dDate}</div>
                <div class="text-[9px] text-slate-400 font-bold">${window.getDayOfWeek(ev.dDate)}요일</div>
            </div>
        </div>
    `).join('') : '<div class="text-center py-10 text-slate-400 font-black">예정된 일정이 없습니다.</div>';
    
    window.setHtml('upcoming-schedules-list', upHtml);

    if(!e) return;
    
    if(window.lucide) window.lucide.createIcons();
};

window.changeTeamEvent = () => { currentTeamEventId=window.$('team-event-select').value; window.renderTeamManagement(); };

window.openAddTeamEvent = () => { 
    editingTeamEventId = null;
    window.$('team-event-form-title').innerText = '새 운동 만들기';
    window.$('btn-team-event-submit').innerText = '생성';
    window.setVal('new-team-event-title', ''); 
    window.setVal('new-team-event-location', ''); 
    window.setVal('new-team-event-time', ''); 
    window.setVal('new-team-event-date', window.getTodayString());
    window.setVal('new-team-event-repeat', 'none');
    window.$('new-team-event-pinned').checked = false;
    document.querySelectorAll('.repeat-weekday').forEach(cb => cb.checked = false);
    window.toggleRepeatOptions();
    
    const m = window.$('team-event-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => m.classList.add('opacity-100'), 10); }
};

window.openEditTeamEvent = () => {
    if(!currentTeamEventId) return window.showAlert("수정할 일정이 없습니다.");
    const e = (teamEvents||[]).find(x => x.id === currentTeamEventId);
    if(!e) return;

    editingTeamEventId = e.id;
    window.$('team-event-form-title').innerText = '운동 일정 수정';
    window.$('btn-team-event-submit').innerText = '수정 완료';
    
    window.setVal('new-team-event-title', e.title); 
    window.setVal('new-team-event-location', e.location || '');
    window.setVal('new-team-event-time', e.time || '');
    window.setVal('new-team-event-date', e.date);
    window.setVal('new-team-event-repeat', e.repeatMode || 'none');
    window.$('new-team-event-pinned').checked = !!e.isPinned;
    
    window.toggleRepeatOptions();
    
    if(e.repeatMode === 'weekly' && Array.isArray(e.repeatData)) {
        document.querySelectorAll('.repeat-weekday').forEach((cb, i) => {
            cb.checked = e.repeatData.includes(i);
        });
    } else if(e.repeatMode === 'monthly' && e.repeatData) {
        window.setVal('repeat-month-week', e.repeatData.week);
        window.setVal('repeat-month-day', e.repeatData.day);
    }
    
    const m = window.$('team-event-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => m.classList.add('opacity-100'), 10); }
};

window.closeAddTeamEvent = () => { 
    const m = window.$('team-event-modal');
    if(m) {
        m.classList.remove('opacity-100');
        setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); editingTeamEventId = null; }, 300);
    }
};

window.toggleRepeatOptions = () => { const v=window.$('new-team-event-repeat').value; window.$('repeat-weekly-options').classList.toggle('hidden',v!=='weekly'); window.$('repeat-monthly-options').classList.toggle('hidden',v!=='monthly'); };

window.confirmAddTeamEvent = async () => {
    if(window.isSavingData) return; window.isSavingData = true;
    const t=window.$('new-team-event-title').value.trim(), loc=window.$('new-team-event-location').value.trim(), tm=window.$('new-team-event-time').value, d=window.$('new-team-event-date').value; 
    if(!t||!d) { window.isSavingData = false; return window.showAlert('입력 필요 (제목과 날짜는 필수입니다)'); }
    const rm=window.$('new-team-event-repeat').value; let rd=null;
    if(rm==='weekly') rd=Array.from(document.querySelectorAll('.repeat-weekday:checked')).map(c=>parseInt(c.value));
    else if(rm==='monthly') rd={week:window.$('repeat-month-week').value, day:window.$('repeat-month-day').value};
    
    if(editingTeamEventId) {
        const e = (teamEvents||[]).find(x => x.id === editingTeamEventId);
        if(e) {
            e.title = t;
            e.location = loc;
            e.time = tm;
            e.date = d;
            e.repeatMode = rm;
            e.repeatData = rd;
            e.isPinned = window.$('new-team-event-pinned').checked;
        }
        window.showToast("일정이 정상적으로 수정되었습니다.");
    } else {
        const e = { id:'evt_'+Date.now(), title:t, location:loc, time:tm, date:d, repeatMode:rm, repeatData:rd, isPinned:window.$('new-team-event-pinned').checked, teams:[], bracketMatches:[], votes:{} };
        teamEvents.push(e); 
        currentTeamEventId=e.id; 
    }
    
    window.closeAddTeamEvent(); window.updateUI(); await window.saveData('sports', true);
    window.isSavingData = false;
};

window.deleteCurrentTeamEvent = async () => { 
    if(!currentTeamEventId) return; 
    window.showConfirm('일정을 삭제/종료하시겠습니까? (과거 기록 마일리지 유지를 위해 종료 상태로 전환됩니다)', async ()=>{ 
        const target = (teamEvents||[]).find(e => e.id === currentTeamEventId);
        if (target && ((target.pastVotes && Object.keys(target.pastVotes).length > 0) || (target.votes && Object.keys(target.votes).length > 0))) {
            target.isFinished = true;
            target.repeatMode = 'none';
        } else {
            teamEvents=(teamEvents||[]).filter(e=>e.id!==currentTeamEventId); 
        }
        currentTeamEventId=teamEvents.filter(e => !e.isFinished)[0]?.id||null; 
        window.updateUI(); await window.saveData('sports', true); 
    }); 
};
