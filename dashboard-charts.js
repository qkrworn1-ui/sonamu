// --- [dashboard-charts.js] ---
// 소나무 족구단 대시보드 시각화 모듈 (Chart.js 연동)

window.dashboardChartInstance = null;
window.currentChartTab = 'attendance';

// [1. 초기화 및 업데이트]
window.initDashboardCharts = () => {
    if (!window.Chart) return console.warn("Chart.js not loaded.");
    window.renderDashboardCharts();
};

// [2. 차트 탭 전환]
window.switchChartTab = (type) => {
    window.currentChartTab = type;
    const btnAtt = window.$('btn-chart-attendance');
    const btnAct = window.$('btn-chart-activity');
    if (!btnAtt || !btnAct) return;

    if (type === 'attendance') {
        btnAtt.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all bg-white text-indigo-600 shadow-sm";
        btnAct.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all text-slate-500 hover:text-slate-700";
    } else {
        btnAct.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all bg-white text-blue-600 shadow-sm";
        btnAtt.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all text-slate-500 hover:text-slate-700";
    }
    window.renderDashboardCharts();
};

// [3. 차트 렌더링]
window.renderDashboardCharts = () => {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    const mList = window.members || [];
    const eList = window.teamEvents || [];
    const tList = window.transactions || [];
    
    if (mList.length === 0) return;

    if (window.dashboardChartInstance) {
        window.dashboardChartInstance.destroy();
    }

    const { labels, data, chartType, label, colors } = window.prepareChartData(window.currentChartTab, mList, eList, tList);

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.6)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    window.dashboardChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                borderWidth: chartType === 'line' ? 3 : 0,
                fill: chartType === 'line',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: colors.border,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 11 },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (context) => {
                            let val = context.parsed.y;
                            if (window.currentChartTab === 'attendance') return `출석률: ${val}%`;
                            return `종합 건강지수: ${val}점`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: {
                        color: textColor,
                        font: { size: 9, weight: 'bold' },
                        callback: (val) => window.currentChartTab === 'attendance' ? `${val}%` : `${val}점`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: textColor,
                        font: { size: 9, weight: 'bold' }
                    }
                }
            }
        }
    });

    window.updateChartStats();
};

// [4. 데이터 준비]
window.prepareChartData = (type, memberList, eventList, transList) => {
    const isDark = document.documentElement.classList.contains('dark');
    const labels = [];
    const data = [];
    let chartType = 'line';
    let label = '';
    let colors = {};

    const regularMembers = (memberList || []).filter(m => m.role !== '파트너' && m.role !== '준회원');

    if (type === 'attendance') {
        // --- 최근 5개 운동 회차별 출석률 ---
        label = '출석률(%)';
        chartType = 'line';
        colors = {
            border: '#6366f1',
            bg: 'rgba(99, 102, 241, 0.1)'
        };

        const getRecentEvents = (count) => {
            const allPast = [];
            const todayStr = (new Date()).toISOString().substring(0, 10);
            (eventList || []).forEach(e => {
                if (e.isFinished) allPast.push({ date: e.date, votes: e.votes || {} });
                else {
                    if (e.pastVotes) Object.keys(e.pastVotes).forEach(d => allPast.push({ date: d, votes: e.pastVotes[d] || {} }));
                    if (e.date && e.date <= todayStr) allPast.push({ date: e.date, votes: e.votes || {} });
                }
            });
            const seenDates = new Set();
            return allPast.sort((a, b) => b.date.localeCompare(a.date))
                .filter(r => { if (!seenDates.has(r.date)) { seenDates.add(r.date); return true; } return false; })
                .slice(0, count).reverse();
        };

        const recentEvents = getRecentEvents(5);
        recentEvents.forEach(ev => {
            labels.push(ev.date.substring(5));
            const votes = ev.votes || {};
            let att = 0;
            regularMembers.forEach(m => {
                const v = votes[m.id];
                if (['attend', '참석', 'late', '늦참'].includes(v)) att++;
            });
            data.push(regularMembers.length ? Math.round((att / regularMembers.length) * 100) : 0);
        });

    } else {
        // --- 최근 5주간 주차별 클럽 건강 지수 (종합) ---
        label = '클럽건강(점수)';
        chartType = 'bar';
        colors = {
            border: '#3b82f6',
            bg: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.8)'
        };

        const weekLabels = ["4주 전", "3주 전", "2주 전", "1주 전", "이번 주"];
        const today = new Date();

        for (let i = 4; i >= 0; i--) {
            labels.push(weekLabels[4-i]);
            const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i * 7));
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((i + 1) * 7) + 1);
            
            const startStr = start.toISOString().substring(0, 10);
            const endStr = end.toISOString().substring(0, 10);
            const ymMonth = end.toISOString().substring(0, 7);
            const ymYear = end.toISOString().substring(0, 4);

            // 1. 해당 주차 세션 추출
            const sessionsInWeek = [];
            (eventList || []).forEach(e => {
                if (e.isFinished && e.date >= startStr && e.date <= endStr) sessionsInWeek.push(e);
                else {
                    if (e.pastVotes) {
                        Object.keys(e.pastVotes).forEach(date => {
                            if (date >= startStr && date <= endStr) sessionsInWeek.push({ date, votes: e.pastVotes[date] });
                        });
                    }
                    if (e.date && e.date >= startStr && e.date <= endStr) sessionsInWeek.push(e);
                }
            });

            // 2. 활동성(20) & 소통(40) 점수
            let vCount = 0, pCount = 0;
            sessionsInWeek.forEach(s => {
                const votes = s.votes || {};
                regularMembers.forEach(m => {
                    const v = String(votes[m.id] || '').replace('_p', '');
                    if (['attend', '참석', '상시참석', 'late', '늦참', 'absent', '불참'].includes(v)) vCount++;
                    if (['attend', '참석', '상시참석'].includes(v)) pCount += 10;
                    else if (['late', '늦참'].includes(v)) pCount += 6;
                    else if (['absent', '불참'].includes(v)) pCount += 2;
                });
            });

            const maxEngagement = regularMembers.length * Math.max(1, sessionsInWeek.length);
            const scoreEng = sessionsInWeek.length > 0 ? (vCount / maxEngagement) * 40 : 32; 
            const scoreAct = sessionsInWeek.length > 0 ? (pCount / (maxEngagement * 10)) * 20 : 15;

            // 3. 재정 점수 (40) : ★ 주차 종료일(endStr) 시점의 실제 납부 상태 ★
            const paidMembers = new Set();
            (transList || []).forEach(t => {
                // 입금 타입이면서 해당 주차 종료일 이전에 처리된 내역만 인정
                if (t.type === 'income' && t.date <= endStr) {
                    if (['월회비', '년회비'].includes(t.account)) {
                        const tYear = t.date.substring(0, 4);
                        // 월회비: 해당 월의 회비를 그 시점까지 냈는가
                        if (t.account === '월회비' && t.date.startsWith(ymMonth)) {
                            if (t.member) paidMembers.add(t.member);
                        } 
                        // 년회비: 올해 회비를 그 시점까지 냈는가
                        else if (t.account === '년회비' && tYear === ymYear) {
                            if (t.member) paidMembers.add(t.member);
                        }
                    }
                }
            });
            const regPaidCount = Array.from(paidMembers).filter(id => regularMembers.some(rm => rm.id === id)).length;
            const scoreFin = regularMembers.length > 0 ? (regPaidCount / regularMembers.length) * 40 : 0;

            // 4. 활력 보너스 (10) : 해당 주차 중 발생한 찬조
            const contribCount = (transList || []).filter(t => 
                t.type === 'income' && t.account.includes('찬조금') && t.date >= startStr && t.date <= endStr
            ).length;
            const scoreBonus = Math.min(10, contribCount * 2.5);

            data.push(Math.min(100, Math.round(scoreEng + scoreAct + scoreFin + scoreBonus)));
        }
    }

    return { labels, data, chartType, label, colors };
};

// [5. 요약 통계 갱신]
window.updateChartStats = () => {
    const mList = window.members || [];
    const eList = window.teamEvents || [];
    const tList = window.transactions || [];
    if (mList.length === 0) return;

    const regularMembers = (mList || []).filter(m => m.role !== '파트너' && m.role !== '준회원');
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const ym = todayStr.substring(0, 7);

    // 1. 최근 출석률 요약
    const allPast = [];
    (eList || []).forEach(e => {
        if (e.isFinished) allPast.push({ date: e.date, votes: e.votes || {} });
        else {
            if (e.pastVotes) Object.keys(e.pastVotes).forEach(d => allPast.push({ date: d, votes: e.pastVotes[d] || {} }));
            if (e.date && e.date <= todayStr) allPast.push({ date: e.date, votes: e.votes || {} });
        }
    });
    const seenDates = new Set();
    const recentEvents = allPast.sort((a,b) => b.date.localeCompare(a.date))
        .filter(r => { if(!seenDates.has(r.date)) { seenDates.add(r.date); return true; } return false; })
        .slice(0, 3);
    let tPct = 0;
    recentEvents.forEach(ev => {
        let att = 0; const votes = ev.votes || {};
        regularMembers.forEach(m => { if (['attend','참석','late','늦참'].includes(votes[m.id])) att++; });
        tPct += regularMembers.length ? (att / regularMembers.length) : 0;
    });
    const statAtt = window.$('chart-stat-attendance');
    if (statAtt) statAtt.innerText = `${recentEvents.length ? Math.round((tPct / recentEvents.length) * 100) : 0}%`;

    // 2. 현재 주차 클럽 건강 지수 요약 (Point-in-time: Today)
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const startStr = startOfWeek.toISOString().substring(0, 10);

    let vCount = 0, pCount = 0, sCount = 0;
    (eList || []).forEach(e => {
        if (e.date >= startStr && e.date <= todayStr) {
            sCount++;
            const votes = e.votes || {};
            regularMembers.forEach(m => {
                const v = String(votes[m.id] || '').replace('_p', '');
                if (['attend','참석','상시참석','late','늦참','absent','불참'].includes(v)) vCount++;
                if (['attend','참석','상시참석'].includes(v)) pCount += 10;
                else if (['late','늦참'].includes(v)) pCount += 6;
                else if (['absent','불참'].includes(v)) pCount += 2;
            });
        }
    });

    const maxPos = regularMembers.length * Math.max(1, sCount);
    const sEng = sCount > 0 ? (vCount / maxPos) * 40 : 32;
    const sAct = sCount > 0 ? (pCount / (maxPos * 10)) * 20 : 15;

    const paidM = new Set();
    (tList || []).forEach(t => {
        if (t.type === 'income' && t.date <= todayStr) {
            if (['월회비', '년회비'].includes(t.account)) {
                if ((t.account === '월회비' && t.date.startsWith(ym)) || (t.account === '년회비' && t.date.substring(0,4) === ym.substring(0,4))) {
                    if (t.member) paidM.add(t.member);
                }
            }
        }
    });
    const sFin = regularMembers.length > 0 ? (Array.from(paidM).filter(id => regularMembers.some(rm => rm.id === id)).length / regularMembers.length) * 40 : 0;
    const cCount = (tList || []).filter(t => t.type === 'income' && t.account.includes('참조금') && t.date >= startStr && t.date <= todayStr).length;

    const nowH = Math.min(100, Math.round(sEng + sAct + sFin + Math.min(10, cCount * 2.5)));
    const statAct = window.$('chart-stat-activity');
    if (statAct) statAct.innerText = `${nowH}점`;
};
