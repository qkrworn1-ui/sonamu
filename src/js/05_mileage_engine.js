// --- [3. 데이터 유틸] ---
window.getEventOccurrences = (e, prefix, floor = "") => {
    const dates = [];
    if (!e.repeatMode || e.repeatMode === 'none') {
        const d = e.date || "";
        if (d && d.startsWith(prefix) && d >= floor) dates.push(d);
        return dates;
    }
    const fmt = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().substring(0, 10);
    const today = window.getTodayString();
    let stDate = new Date(Math.max(new Date(e.date||0).getTime(), floor ? new Date(floor).getTime() : 0));
    let edLimit = new Date(today);
    if (prefix && prefix.length === 7) {
        const [py, pm] = prefix.split('-').map(Number);
        const lastDay = new Date(py, pm, 0);
        if (lastDay < edLimit) edLimit = lastDay;
    }
    let cur = new Date(stDate), count = 0;
    while (cur <= edLimit && count++ < 400) {
        let isMatch = false;
        if (e.repeatMode === 'weekly' && Array.isArray(e.repeatData)) {
            isMatch = e.repeatData.includes(cur.getDay());
        } else if (e.repeatMode === 'monthly' && e.repeatData) {
            const nw = parseInt(e.repeatData.week), td = parseInt(e.repeatData.day);
            const y = cur.getFullYear(), m = cur.getMonth();
            let off = td - new Date(y,m,1).getDay(); if (off < 0) off += 7;
            let trg = 1 + off + (nw <= 4 ? (nw-1)*7 : 0);
            if (nw > 4) { let ld = new Date(y,m+1,0).getDate(); while (trg+7 <= ld) trg += 7; }
            isMatch = cur.getDate() === trg;
        }
        const ds = fmt(cur);
        if (isMatch && ds.startsWith(prefix) && ds >= floor) dates.push(ds);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

// [개선] 마일리지 활동 내역 집계 (최근 7일 및 투표 내역 로깅용)
// [개선] 마일리지 활동 내역 집계 (통합 엔진 활용)
window.getMemberStats = (mId) => {
    const m = (members || []).find(x => x.id === mId || x.name === mId);
    if (!m || m.role === '파트너') return { count: 0, pts: 0 };
    
    // 마일리지 시작일 이후의 참석 횟수만 카운트하기 위해 getMemberMileageItems 재활용
    const evts = typeof teamEvents !== 'undefined' ? teamEvents : [];
    const ptsList = typeof posts !== 'undefined' ? posts : [];
    
    const items = window.getMemberMileageItems(m, evts, ptsList, window.currentMileageYear);
    const count = items.filter(it => it.icon === 'user-check').length;

    // 참고: pts(점수) 부분은 하위 호환성을 위해 유지 (보통 getMemberCalculatedScore에서 별도 합산됨)
    const pts = typeof window.calculateMemberPoints === 'function' ? window.calculateMemberPoints(m) : items.reduce((a,b)=>a+(b.p||0),0);

    return { count, pts };
};

window.getPrevMonthYm = (ym) => {
    let [y, m] = ym.split('-').map(Number);
    m--; if (m === 0) { m = 12; y--; }
    return `${y}-${String(m).padStart(2, '0')}`;
};
window.getNextRecurringDate = e => {
    if(!e.repeatMode || e.repeatMode==='none') return e.date||'';
    const fmt = d => new Date(d.getTime()-(d.getTimezoneOffset()*60000)).toISOString().substring(0,10);
    let st = Math.max(new Date(e.date||0).getTime(), new Date(window.getTodayString()).getTime()), cur = new Date(st);
    if(e.repeatMode==='weekly' && Array.isArray(e.repeatData)) {
        for(let i=0; i<7; i++) { if(e.repeatData.includes(cur.getDay())) return fmt(cur); cur.setDate(cur.getDate()+1); }
    } else if(e.repeatMode==='monthly' && e.repeatData) {
        const nw=parseInt(e.repeatData.week), td=parseInt(e.repeatData.day);
        for(let i=0; i<3; i++) {
            let y=cur.getFullYear(), m=cur.getMonth(), fd=new Date(y,m,1).getDay(), off=td-fd;
            if(off<0) off+=7; let trg=1+off+(nw<=4?(nw-1)*7:0);
            if(nw>4) { let ld=new Date(y,m+1,0).getDate(); while(trg+7<=ld) trg+=7; }
            let cand = new Date(y,m,trg); if(cand>=new Date(st)) return fmt(cand);
            cur = new Date(y,m+1,1);
        }
    } return e.date||'';
};
window.getDayOfWeek = (dateStr) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(dateStr);
    return days[isNaN(d.getDay()) ? 0 : d.getDay()];
};
window.getRepeatLabel = e => { const d=['일','월','화','수','목','금','토']; if(e.repeatMode==='weekly'&&e.repeatData) return `(매주 ${e.repeatData.map(x=>d[x]).join(',')})`; if(e.repeatMode==='monthly'&&e.repeatData) return `(매월 ${e.repeatData.week===5?'마지막':e.repeatData.week+'째'}주 ${d[e.repeatData.day]})`; return ''; };
window.getSortedMembers = (list = members) => {
    const roleOrder = { '회장':1, '감독':2, '총무':3, '감사':4, '코치':5, '플레잉코치':6, '고문':7, '일반회원':8, '준회원':9, '파트너':10 };
    return [...(list||[])].filter(Boolean).sort((a,b) => (roleOrder[a.role]||99) - (roleOrder[b.role]||99) || String(a.name||'').localeCompare(String(b.name||'')));
};

window.getPostCategoryLabel = p => {
    if (p.isEvent) return '회원투표';
    if (p.isAnon) return '무기명투표';
    return '공지';
};
