// --- [7. 탭: 활동 및 납부] ---
window.renderActivities = () => {
    const lastPlayMap = {};
    (matchHistory || []).forEach(m => {
        const players = [...Object.values(m.compA || {}), ...Object.values(m.compB || {})].filter(Boolean);
        players.forEach(p => { if (!lastPlayMap[p] || m.date > lastPlayMap[p]) lastPlayMap[p] = m.date; });
    });
    const cy = window.getTodayString().substring(0, 4);
    const cm = window.getTodayString().substring(0, 7);
    const globalStart = mileageStartDate || "";
    
    // [UI] 시행일 안내 표시 (일반 회원 포함)
    const notice = window.$('mileage-start-notice'), noticeSpan = window.$('mileage-start-date-display');
    if(notice) {
        if(globalStart) {
            notice.classList.remove('hidden');
            if(noticeSpan) noticeSpan.innerText = globalStart;
        } else {
            notice.classList.add('hidden');
        }
    }

    // [UI] 행운 마일리지 상금 표시
    const luckAmount = window.$('mileage-luck-amount-display');
    if(luckAmount) {
        if (luckMileageAmount === 0) {
            luckAmount.parentElement.classList.add('hidden');
        } else {
            luckAmount.parentElement.classList.remove('hidden');
            luckAmount.innerText = luckMileageAmount + " PT";
        }
    }

    const filtered = showOnlyRegularAct ? members.filter(m => m.role !== '파트너' && m.role !== '초청선수') : members;

    // [신규] 연도 선택 드롭다운 값 가져오기
    let selectedYear = window.currentMileageYear || new Date().getFullYear().toString();
    const yearSelect = window.$('mileage-year-select');
    if (yearSelect && !window.currentMileageYear) {
        yearSelect.value = selectedYear;
        window.currentMileageYear = selectedYear;
    }

    // [NEW] 행운 마일리지 제외 기본값 처리 (기본: 제외)
    if (typeof window.excludeLuckyMileage === 'undefined') {
        window.excludeLuckyMileage = true;
    }
    const excludeLuck = window.excludeLuckyMileage !== false;
    const cbExclude = window.$('cb-exclude-lucky-mileage');
    if (cbExclude) cbExclude.checked = excludeLuck;

    const scoreHeader = window.$('activity-score-header');
    if (scoreHeader) {
        scoreHeader.innerHTML = `총 마일리지 ${excludeLuck ? '<span class="text-[9px] text-amber-600 font-bold ml-0.5">(행운제외)</span>' : '<span class="text-[9px] text-indigo-400 font-bold ml-0.5">(전체포함)</span>'}`;
    }

    const ranked = window.getSortedMembers(filtered)
        .map(m => {
            const stats = window.getMemberStats(m.id);
            return {
                ...m,
                count: stats.count,
                // [수정] 선택된 연도 및 행운마일리지 제외 여부를 전달하여 마일리지 계산
                fS: window.getMemberCalculatedScore(m, teamEvents, posts, window.currentMileageYear, excludeLuck)
            };
        })
        .sort((a, b) => b.fS - a.fS);

    // 공동 순위 적용
    let lSc = -1, cR = 0;
    const s = ranked.map((m, i) => {
        if (m.fS !== lSc) cR = i + 1;
        lSc = m.fS;
        return { ...m, rank: cR };
    });

    window.setHtml('activities-list-body', s.length ? s.map((m) => `
        <tr class="bg-white hover:bg-indigo-50/50 cursor-pointer transition-all duration-200 group border-b border-slate-50" onclick="window.showMemberMileageDetail('${m.id}')">
            <td class="p-4 text-center">
                <div class="flex items-center justify-center">
                    ${m.rank <= 3 ? `
                        <div class="relative">
                            <i data-lucide="trophy" class="w-8 h-8 ${m.rank===1?'text-amber-400':(m.rank===2?'text-slate-300':'text-orange-400')}"></i>
                            <span class="absolute inset-0 flex items-center justify-center text-[10px] font-black mt-1 ${m.rank===1?'text-amber-700':(m.rank===2?'text-slate-500':'text-orange-800')}">${m.rank}</span>
                        </div>
                    ` : `<span class="text-xs font-black text-slate-400">${m.rank}위</span>`}
                </div>
            </td>
            <td class="p-4">
                <div class="flex flex-col">
                    <span class="member-name text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">${window.escapeHtml(m.name)}</span>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest">${m.role}</span>
                        ${m.lastLogin ? `<span class="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/50" title="최근 접속일">🕒 ${m.lastLogin.substring(5)}</span>` : `<span class="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200" title="최근 접속일">🕒 기록없음</span>`}
                    </div>
                </div>
            </td>
            <td class="p-4 text-center">
                <span class="text-xs font-black text-slate-700">${m.count || 0}회</span>
            </td>
            <td class="p-4 text-right">
                <div class="inline-flex flex-col items-end bg-indigo-50/50 px-4 py-2 rounded-2xl border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                    <span class="text-[9px] font-black text-indigo-400 group-hover:text-indigo-100 uppercase mb-0.5">Total Score</span>
                    <span class="text-sm font-black text-indigo-700 group-hover:text-white tabular-nums">${m.fS.toLocaleString()} <span class="text-[10px]">PT</span></span>
                </div>
            </td>
        </tr>`).join('') : `<tr><td colspan="4" class="p-20 text-center text-slate-400 font-bold bg-slate-50/50 rounded-3xl">등록된 데이터가 없습니다.</td></tr>`);
    if(window.lucide) window.lucide.createIcons();

    // [Filter Button UI Update]
    const btn = window.$('btn-activity-filter');
    if(btn) {
        if(showOnlyRegularAct) {
            btn.innerText = '정회원만';
            btn.className = "px-4 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all bg-white shadow-sm ring-1 ring-slate-200 text-slate-800";
        } else {
            btn.innerText = '모두보기';
            btn.className = "px-4 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all bg-indigo-600 text-white shadow-md";
        }
    }
};

window.toggleActivityFilter = () => {
    showOnlyRegularAct = !showOnlyRegularAct;
    window.renderActivities();
};

window.toggleExcludeLuckyMileage = (checked) => {
    window.excludeLuckyMileage = !!checked;
    window.renderActivities();
};

window.changeMileageYear = () => {
    const sel = window.$('mileage-year-select');
    if (sel) {
        window.currentMileageYear = sel.value;
        window.renderActivities();
    }
};

window.showMemberMileageDetail = (mId) => {
    const m = (members || []).find(x => x.id === mId);
    if (!m) return;

    window.setText('mileage-detail-title', `${m.name} 회원님`);
    
    const lastLoginText = m.lastLogin ? ` | 최근 접속: ${m.lastLogin}` : ` | 최근 접속: 기록 없음`;
    const excludeLuck = window.excludeLuckyMileage !== false;
    const luckNotice = excludeLuck ? ` (행운제외)` : ``;
    window.setText('mileage-detail-subtitle', `${m.role} | 마일리지 상세 내역${lastLoginText}${luckNotice}`);
    
    const globalStart = mileageStartDate || "";
    let html = '';

    // [Audit Header for Transparency]
    html += `
        <tr class="border-b border-slate-700 bg-slate-800/80">
            <td colspan="4" class="p-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <div class="bg-amber-500/20 p-2 rounded-xl"><i data-lucide="clover" class="w-4 h-4 text-amber-400"></i></div>
                    <div class="text-left">
                        <div class="text-[11px] font-black text-white">마일리지 집계 (Active Score)${excludeLuck ? ' - <span class="text-amber-400">행운 마일리지 제외됨</span>' : ''}</div>
                        <div class="text-[9px] font-bold text-amber-300 opacity-70">${globalStart ? '['+globalStart+'] 시행일 이후' : '전체 기간'} 기록이 합계에 반영되었습니다.</div>
                    </div>
                </div>
            </td>
        </tr>
    `;

    // [중요] 상세 내역도 선택된 연도 및 행운제외 여부에 맞춰서 필터링 (합계 100% 일치)
    const logItems = window.getMemberMileageItems(m, teamEvents, posts, window.currentMileageYear, excludeLuck);

    // Render Log
    logItems.forEach(it => {
        let typeCls = 'bg-slate-100 text-slate-500';
        let iconCls = 'text-slate-400';
        if (it.desc.includes('운동')) { typeCls = 'bg-blue-50 text-blue-600 border border-blue-100'; iconCls = 'text-blue-500'; }
        else if (it.desc.includes('회원')) { typeCls = 'bg-emerald-50 text-emerald-600 border border-emerald-100'; iconCls = 'text-emerald-500'; }
        else if (it.desc.includes('무기명')) { typeCls = 'bg-rose-50 text-rose-600 border border-rose-100'; iconCls = 'text-rose-500'; }
        else if (it.type === 'luck') { typeCls = 'bg-amber-100 text-amber-700 border border-amber-300 shadow-sm'; iconCls = 'text-amber-600'; }
        else if (it.type === 'bonus') { typeCls = 'bg-indigo-50 text-indigo-600 border border-indigo-100'; iconCls = 'text-indigo-500'; }

        html += `
            <tr class="border-b border-slate-50 bg-white hover:bg-slate-50 transition-colors ${it.type==='luck'?'bg-amber-50/20':''}">
                <td class="p-2 sm:p-4 text-slate-600 font-bold text-[11px] sm:text-[12px] text-center">${it.d.substring(5)}</td>
                <td class="p-2 sm:p-4">
                    <div class="flex items-center gap-1.5 sm:gap-2.5">
                        <div class="p-1 sm:p-1.5 rounded-lg ${typeCls}"><i data-lucide="${it.icon || 'star'}" class="w-3 sm:w-3.5 h-3 sm:h-3.5 ${iconCls}"></i></div>
                        <span class="text-[11px] sm:text-[12px] font-black text-black leading-tight">${it.desc}</span>
                    </div>
                </td>
                <td class="p-2 sm:p-4 text-right">
                    <span class="text-[10px] sm:text-xs font-black ${it.p > 0 ? 'text-blue-600' : 'text-slate-400'}">${it.p > 0 ? '+' : ''}${it.p}</span>
                </td>
                <td class="p-2 sm:p-4 text-center">
                    <span class="px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[9px] font-black bg-slate-100 text-slate-400 uppercase tracking-tighter whitespace-nowrap">합산완료</span>
                </td>
            </tr>
        `;
    });

    if (!logItems.length) html += `<tr><td colspan="4" class="p-16 text-center text-slate-400 font-bold bg-slate-50/50 rounded-3xl">내역이 없습니다.</td></tr>`;
    window.$('mileage-detail-body').innerHTML = html;
    
    // 합계 계산 (실제 표시된 목록의 합계)
    const calculatedTotal = logItems.reduce((acc, it) => acc + (it.p || 0), 0);
    
    // 보너스 총 합계 (UI 표시용) - 필터링된 logItems에서만 추출하여 100% 정합성 보장
    const bonusOnlyTotal = logItems
        .filter(it => it.icon === 'clover' || it.icon === 'plus-circle')
        .reduce((acc, it) => acc + (it.p || 0), 0);

    window.setText('mileage-summary-bonus', `${bonusOnlyTotal.toLocaleString()} pt`);
    window.setText('mileage-summary-total', `${calculatedTotal.toLocaleString()} pt`);

    const modal = window.$('mileage-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if(window.lucide) window.lucide.createIcons();
    setTimeout(() => {
        modal.classList.add('opacity-100');
        window.$('mileage-detail-card')?.classList.add('scale-100');
    }, 10);
};

window.closeMileageDetail = () => {
    const modal = window.$('mileage-detail-modal');
    const card = window.$('mileage-detail-card');
    if(card) card.classList.remove('scale-100');
    if(modal) modal.classList.remove('opacity-100');
    setTimeout(() => {
        if(modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }, 3000);
};

window.changeStatusYear = d => { currentStatusYear+=d; window.setText('current-status-year-display', currentStatusYear+'년도'); window.renderPaymentStatus(); };

// [NEW] 과거 전체 미납 개월수 계산 (가입일 ~ 작년 12월)
// 2025년부터 계산하도록 수정됨
window._calcPastUnpaid = (memberName, joinDate) => {
    const baseYear = 2025; // 25년부터 계산
    const jd = joinDate ? String(joinDate).substring(0,7) : null;
    if (!jd) return 0;
    
    let jdYear = parseInt(jd.substring(0,4));
    let jdMonth = parseInt(jd.substring(5,7));

    // 계산 시작점 보정 (2025년 이전 가입자도 2025년부터 계산)
    const startYear = Math.max(baseYear, jdYear);
    const startMonth = (startYear > jdYear) ? 1 : jdMonth;
    
    const endYear = currentStatusYear - 1;
    if (endYear < startYear) return 0;

    // 과거 전체 기간 중 납부된 월 Set 구축
    const paidYears = new Set();
    const paidMonths = new Set();
    (transactions||[]).filter(t => t.category==='income' && String(t.name||'').trim() === memberName).forEach(t => {
        const ty = String(t.type||'');
        const tYear = t.targetYear ? String(t.targetYear) : String(t.date||'').substring(0,4);
        const tYearNum = parseInt(tYear);
        if (tYearNum < startYear || tYearNum > endYear) return;

        const isExempt = ty.includes('면제');
        const isYearly = ty.includes('년회비') && !isExempt;
        const isMonthly = ty.includes('월회비') || ty.includes('회비') || ty === '입급' || ty === '입금';

        if (isExempt || isYearly) {
            paidYears.add(tYearNum);
        } else if (isMonthly && !ty.includes('특별')) {
            (Array.isArray(t.months) ? t.months : [(t.date||'').split('-')[1]?.replace(/^0+/,'')]).forEach(m => {
                const mm = parseInt(m);
                if (mm >= 1 && mm <= 12) paidMonths.add(`${tYear}-${String(mm).padStart(2,'0')}`);
            });
        }
    });

    let unpaidCount = 0;
    const tm = window.getTodayString().substring(0,7);
    for (let y = startYear; y <= endYear; y++) {
        if (paidYears.has(y)) continue;
        const sM = (y === startYear) ? startMonth : 1;
        for (let m = sM; m <= 12; m++) {
            const cd = `${y}-${String(m).padStart(2,'0')}`;
            if (cd > tm) continue;
            if (!paidMonths.has(cd)) unpaidCount++;
        }
    }
    return unpaidCount;
};

window.renderPaymentStatus = () => {
    window.setText('current-status-year-display', currentStatusYear+'년도');
    const vm = window.getSortedMembers().filter(m => m.role!=='파트너' && m.role!=='준회원' && m.role!=='초청선수');
    const grid = window.$('status-card-grid');
    const summary = window.$('status-summary-cards');
    if (!grid || !summary) return;

    if (!vm.length) {
        grid.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400 font-black border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl">데이터 없음</div>';
        summary.innerHTML = '';
        return;
    }

    // ========== 1) 데이터 계산 ==========
    const tm = window.getTodayString().substring(0,7);
    const memberData = []; // { name, joinDate, monthStatus[12], annualFlag, pastUnpaid, paidCount, unpaidCount }

    vm.forEach(m => {
        const mName = String(m.name||'').trim();
        const months = Array.from({length:12}, (_, i) => {
            let y = currentStatusYear, mo = i + 1;
            let jd = m.joinDate ? String(m.joinDate).substring(0,7) : '1999-12';
            let cd = `${y}-${String(mo).padStart(2,'0')}`;
            if (cd < jd) return '-';
            if (cd > tm) return 'F';
            return 'U';
        });
        let annualFlag = false; // 'A' = 년회비, 'E' = 면제

        // 입금 내역으로 월별 상태 업데이트
        (transactions||[]).filter(t => t.category==='income' && (t.targetYear ? String(t.targetYear) : String(t.date||'').substring(0,4)) === String(currentStatusYear)).forEach(t => {
            if (String(t.name||'').trim() !== mName) return;
            const ty = String(t.type||'');
            const isExempt = ty.includes('총무년회비면제') || (ty.includes('년회비') && ty.includes('면제'));
            const isYearly = ty.includes('년회비') && !ty.includes('면제');
            const isMonthly = ty.includes('월회비');

            if (isExempt) { annualFlag = 'E'; }
            else if (isYearly) { annualFlag = 'A'; }
            else if (ty.includes('면제')) {
                (Array.isArray(t.months) ? t.months : [(t.date||'').split('-')[1]?.replace(/^0+/,'')]).forEach(mm => {
                    let idx = parseInt(mm) - 1;
                    if (idx >= 0 && idx < 12 && months[idx] !== '-') months[idx] = 'E';
                });
            }
            else if (isMonthly) {
                (Array.isArray(t.months) ? t.months : [(t.date||'').split('-')[1]?.replace(/^0+/,'')]).forEach(mm => {
                    let idx = parseInt(mm) - 1;
                    if (idx >= 0 && idx < 12 && months[idx] !== '-' && months[idx] !== 'E') months[idx] = 'P';
                });
            }
        });

        // 통계 집계: 면제('E') 및 가입일 이전('-')도 납부한 것으로 간주하여 연간 % 계산
        let paidCount = 0, unpaidCount = 0;
        const totalDue = 12; // 모든 연간 퍼센트의 기준은 12개월로 고정

        if (annualFlag) {
            paidCount = 12;
        } else {
            months.forEach(s => {
                // 'P' (납부), 'E' (면제), '-' (가입 전) 모두 납부 완료로 간주
                if (s === 'P' || s === 'E' || s === '-') { paidCount++; }
                else if (s === 'U') { unpaidCount++; }
            });
        }
 
        const pastUnpaid = window._calcPastUnpaid(mName, m.joinDate);
 
        memberData.push({ name: mName, role: m.role, joinDate: m.joinDate, months, annualFlag, paidCount, unpaidCount, totalDue, pastUnpaid });
    });

    // ========== 2) 요약 통계 카드 ==========
    const totalMembers = memberData.length;
    const completedMembers = memberData.filter(d => d.annualFlag || d.unpaidCount === 0).length;
    const unpaidMembers = memberData.filter(d => !d.annualFlag && d.unpaidCount > 0).length;
    const totalPastUnpaid = memberData.reduce((s, d) => s + d.pastUnpaid, 0);

    summary.innerHTML = `
        <div class="fee-stat-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <span class="text-[11px] text-blue-700 uppercase tracking-widest font-black">납부 완료</span>
            <div class="text-2xl font-black text-blue-700">${completedMembers}<span class="text-sm text-blue-400 ml-0.5">명</span></div>
            <div class="text-[9px] text-blue-500 font-bold">${totalMembers}명 중</div>
        </div>
        <div class="fee-stat-card bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200">
            <span class="text-[11px] text-rose-700 uppercase tracking-widest font-black">미납 회원</span>
            <div class="text-2xl font-black text-rose-600">${unpaidMembers}<span class="text-sm text-rose-400 ml-0.5">명</span></div>
            <div class="text-[9px] text-rose-500 font-bold">${currentStatusYear}년도 기준</div>
        </div>
        <div class="fee-stat-card bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <span class="text-[11px] text-amber-800 uppercase tracking-widest font-black">완납률</span>
            <div class="text-2xl font-black text-amber-700">${totalMembers ? Math.round((completedMembers / totalMembers) * 100) : 0}<span class="text-sm text-amber-400 ml-0.5">%</span></div>
            <div class="fee-progress-bar mt-1"><div class="fee-progress-fill bg-gradient-to-r from-amber-400 to-amber-500" style="width:${totalMembers ? Math.round((completedMembers / totalMembers) * 100) : 0}%"></div></div>
        </div>
    `;

    // ========== 3) 회원 카드 렌더링 ==========
    // 미납 > 일부납부 > 완납 순정렬 (미납 회원이 위로)
    memberData.sort((a, b) => {
        const aScore = a.annualFlag ? 100 : (a.unpaidCount === 0 ? 50 : 0);
        const bScore = b.annualFlag ? 100 : (b.unpaidCount === 0 ? 50 : 0);
        if (aScore !== bScore) return aScore - bScore; // 미납(0)이 상위
        if (a.pastUnpaid !== b.pastUnpaid) return b.pastUnpaid - a.pastUnpaid; // 과거미납 많은 순
        return a.name.localeCompare(b.name);
    });

    grid.innerHTML = memberData.map((d, idx) => {
        // 카드 분류
        let cardClass = 'fee-card';
        let statusBadge = '';
        let statusIcon = '';

        if (d.annualFlag === 'A') {
            cardClass += ' fee-card-yearly';
            statusBadge = '<span class="text-[9px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full shadow-sm inline-flex items-center justify-center">년회비 완납</span>';
            statusIcon = '<i data-lucide="check-circle-2" class="w-4 h-4 text-blue-500"></i>';
        } else if (d.annualFlag === 'E') {
            cardClass += ' fee-card-exempt';
            statusBadge = '<span class="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full shadow-sm inline-flex items-center justify-center">년회비 면제</span>';
            statusIcon = '<i data-lucide="shield-check" class="w-4 h-4 text-purple-500"></i>';
        } else if (d.unpaidCount === 0) {
            cardClass += ' fee-card-complete';
            statusBadge = '<span class="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-full shadow-sm inline-flex items-center justify-center">전월 완납</span>';
            statusIcon = '<i data-lucide="check-circle-2" class="w-4 h-4 text-indigo-500"></i>';
        } else {
            cardClass += ' fee-card-unpaid';
            statusBadge = `<span class="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-100 px-2.5 py-1 rounded-full shadow-sm inline-flex items-center justify-center">${d.unpaidCount}개월 미납</span>`;
            statusIcon = '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-500"></i>';
        }

        // 과거 미납 배지
        let pastBadge = '';
        if (d.pastUnpaid > 0) {
            pastBadge = `<span class="fee-past-unpaid-badge"><i data-lucide="alert-triangle" class="w-3 h-3"></i> 과거 미납 ${d.pastUnpaid}개월</span>`;
        }

        // 월 도트 (년회비/면제일 경우 12개 전부 파란색/보라색)
        let dotsHtml = '';
        if (d.annualFlag) {
            const dotClass = d.annualFlag === 'A' ? 'fee-dot-paid' : 'fee-dot-exempt';
            const dotLabel = d.annualFlag === 'A' ? '✓' : '✓';
            dotsHtml = Array.from({length:12}, (_, i) => `<div class="fee-dot ${dotClass}">${i+1}</div>`).join('');
        } else {
            dotsHtml = d.months.map((s, i) => {
                let cls = 'fee-dot-future', label = '';
                if (s === 'P') { cls = 'fee-dot-paid'; label = '✓'; }
                else if (s === 'E') { cls = 'fee-dot-exempt'; label = '✓'; }
                else if (s === 'U') { cls = 'fee-dot-unpaid'; label = '!'; }
                else if (s === 'F') { cls = 'fee-dot-future'; label = ''; }
                else if (s === '-') { cls = 'fee-dot-before'; label = ''; }
                return `<div class="fee-dot ${cls}">${label || (i+1)}</div>`;
            }).join('');
        }

        // 진행률
        const pct = d.totalDue > 0 ? Math.round((d.paidCount / d.totalDue) * 100) : 100;
        const pctColor = pct >= 100 ? 'from-blue-500 to-indigo-500' : (pct >= 50 ? 'from-amber-400 to-amber-500' : 'from-rose-400 to-rose-500');

        const roleColor = (typeof roleColors !== 'undefined' && roleColors[d.role]) || '#334155';

        return `<div class="${cardClass} fee-card-appear" style="animation-delay:${Math.min(idx * 30, 300)}ms" data-member-name="${d.name}">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2.5">
                    ${statusIcon}
                    <div>
                        <div class="font-black text-sm text-black font-black">${window.escapeHtml(d.name)}</div>
                        <div class="text-[11px] font-black text-white px-1.5 py-0.5 rounded mt-0.5 inline-block" style="background:${roleColor}">${window.escapeHtml(d.role)}</div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1.5 min-w-[80px]">
                    ${statusBadge}
                    ${pastBadge}
                </div>
            </div>

            <!-- 월별 도트 그리드 -->
            <div class="fee-month-dots mb-0.5">${dotsHtml}</div>
            <div class="fee-month-dots text-[11px] sm:text-[12px] text-slate-800 font-black mb-3 border-t border-slate-200 pt-1">
                <span class="text-center">1</span><span class="text-center">2</span><span class="text-center">3</span><span class="text-center">4</span><span class="text-center">5</span><span class="text-center">6</span><span class="text-center">7</span><span class="text-center">8</span><span class="text-center">9</span><span class="text-center">10</span><span class="text-center">11</span><span class="text-center">12</span>
            </div>

            <!-- 진행률 바 -->
            <div class="flex items-center gap-3">
                <div class="fee-progress-bar flex-1"><div class="fee-progress-fill bg-gradient-to-r ${pctColor}" style="width:${pct}%"></div></div>
                <span class="text-[12px] font-black ${pct >= 100 ? 'text-blue-600' : (pct >= 50 ? 'text-amber-600' : 'text-rose-600')}">${pct}%</span>
            </div>
        </div>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
};

// [NEW] 검색 필터
window.filterStatusCards = () => {
    const q = (window.$('status-search-input')?.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('#status-card-grid > div[data-member-name]');
    cards.forEach(card => {
        const name = (card.getAttribute('data-member-name') || '').toLowerCase();
        card.style.display = name.includes(q) ? '' : 'none';
    });
};
