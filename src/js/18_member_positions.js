// --- [18. 탭: 회원관리 - 포지션 분포 대시보드] ---
window.renderMemberPositions = () => {
    const summaryContainer = window.$('positions-dashboard-summary');
    const gridsContainer = window.$('positions-member-grids');
    if (!summaryContainer || !gridsContainer) return;
    
    // 포지션 통계 대상 필터링 (파트너, 초청선수 제외하고 활동 정회원 및 준회원 집계)
    const activeMembers = (window.members || []).filter(m => m.role !== '파트너' && m.role !== '초청선수');
    const totalCount = activeMembers.length;
    
    const positions = ['공격수', '세터', '좌수비', '우수비', '미정'];
    
    // 포지션별 그룹화
    const groups = {
        '공격수': [],
        '세터': [],
        '좌수비': [],
        '우수비': [],
        '미정': []
    };
    
    activeMembers.forEach(m => {
        const pos = m.position ? m.position.trim() : '';
        if (groups[pos]) {
            groups[pos].push(m);
        } else {
            groups['미정'].push(m);
        }
    });
    
    // 포지션 테마 설정 (색상 및 이모지)
    const themes = {
        '공격수': { color: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', ring: 'ring-rose-500', bar: 'bg-rose-500', emoji: '🔥' },
        '세터': { color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', ring: 'ring-blue-500', bar: 'bg-blue-500', emoji: '⚡' },
        '좌수비': { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', ring: 'ring-emerald-500', bar: 'bg-emerald-500', emoji: '🛡️' },
        '우수비': { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', ring: 'ring-amber-500', bar: 'bg-amber-500', emoji: '⚔️' },
        '미정': { color: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', ring: 'ring-slate-400', bar: 'bg-slate-400', emoji: '❓' }
    };
    
    // 1. 분포 요약 카드 렌더링
    let summaryHtml = '';
    positions.forEach(pos => {
        const count = groups[pos].length;
        const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';
        const t = themes[pos];
        
        summaryHtml += `
            <div class="${t.bg} border ${t.border} p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden shadow-sm">
                <div class="flex justify-between items-center z-10">
                    <span class="text-xs font-black text-slate-700">${pos} ${t.emoji}</span>
                    <span class="text-xs font-bold text-slate-400">비중</span>
                </div>
                <div class="flex items-baseline gap-1.5 z-10 mt-1">
                    <span class="text-2xl font-black text-slate-800">${count}</span>
                    <span class="text-[10px] font-bold text-slate-400">명</span>
                </div>
                <!-- 프로그레스 바 -->
                <div class="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden mt-1.5">
                    <div class="${t.bar} h-full transition-all duration-1000" style="width: ${pct}%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] font-bold text-slate-500 mt-0.5">
                    <span>${pct}%</span>
                    <span>/ ${totalCount}명</span>
                </div>
            </div>
        `;
    });
    summaryContainer.innerHTML = summaryHtml;
    
    // 2. 포지션별 회원 그리드 리스트 렌더링
    let gridsHtml = '';
    positions.forEach(pos => {
        const list = groups[pos];
        const t = themes[pos];
        
        // 정렬: 출전부 우선 정렬 (1부 > 2부 > 3부 > 4부 > 5부 > 미정), 동일 출전부 내에서는 이름 가나다순 정렬
        const divPriority = { '1부': 1, '2부': 2, '3부': 3, '4부': 4, '5부': 5 };
        list.sort((a, b) => {
            const divA = a.division || '';
            const divB = b.division || '';
            if (divA !== divB) {
                const pA = divPriority[divA] || 99;
                const pB = divPriority[divB] || 99;
                return pA - pB;
            }
            return a.name.localeCompare(b.name, 'ko');
        });
        
        let membersCardsHtml = '';
        if (list.length === 0) {
            membersCardsHtml = `
                <div class="text-center py-8 text-slate-400 text-xs font-bold border border-dashed rounded-xl ${t.border} bg-white/40">
                    등록된 선수가 없습니다.
                </div>
            `;
        } else {
            membersCardsHtml = list.map(m => {
                const backNoText = m.backNo ? `No.${String(m.backNo).padStart(2, '0')}` : 'No.00';
                const color = window.roleColors ? window.roleColors[m.role] || '#475569' : '#475569';
                
                // 관리자 또는 자기 자신인 경우 클릭하여 수정 가능하도록 커서 제공
                const isAdmin = window.isFullAdmin();
                const clickAction = isAdmin ? `onclick="window.editMember('${m.id}')"` : '';
                const cursorClass = isAdmin ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] hover:bg-slate-50' : '';
                
                return `
                    <div ${clickAction} class="bg-white border border-slate-100 rounded-xl p-3.5 flex flex-col gap-2 transition-all shadow-sm ${cursorClass} relative">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[9px] font-bold bg-slate-100 border text-slate-500 px-1 py-0.5 rounded leading-none">${backNoText}</span>
                                <span class="font-black text-slate-800 text-sm">${window.escapeHtml(m.name)}</span>
                            </div>
                            <span class="text-[9px] px-1.5 py-0.5 rounded font-black text-white shadow-sm leading-none" style="background-color: ${color}">
                                ${window.escapeHtml(m.role)}
                            </span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-50 pt-2 mt-0.5">
                            <span class="flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3 text-slate-300"></i> ${m.phone || '-'}</span>
                            ${m.division ? `<span class="text-[9px] font-black border px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 leading-none ${window.getDivisionBadgeClass(m.division)}"><i data-lucide="award" class="w-3 h-3"></i> ${window.escapeHtml(m.division)}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        gridsHtml += `
            <div class="flex flex-col bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl">
                <!-- 포지션 소제목 -->
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <span class="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full ${t.bar}"></span>
                        <span>${pos}</span>
                    </span>
                    <span class="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                        ${list.length}명
                    </span>
                </div>
                <!-- 소속 회원 명단 -->
                <div class="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1 nav-scroll custom-scrollbar">
                    ${membersCardsHtml}
                </div>
            </div>
        `;
    });
    
    gridsContainer.innerHTML = gridsHtml;
    
    if (window.lucide) window.lucide.createIcons();
};
