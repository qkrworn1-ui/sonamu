// --- [14. 행운 마일리지 및 부가 로직] ---
window.openLuckMileageModal = () => {
    const r = sessionStorage.getItem('sonamu_user_role');
    const m = window.$('luck-mileage-modal');
    if(m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
        
        const dateInput = window.$('input-mileage-start-date');
        const amtInput = window.$('input-luck-mileage');
        const cntInput = window.$('input-luck-count');
        const saveBtn = document.querySelector('button[onclick="window.updateLuckMileageSetting()"]');
        const redrawBtn = document.querySelector('button[onclick="window.redrawLuckMileage()"]');

        const isMaster = r === 'master';
        const isAdmin = ['회장', '감독', '총무'].includes(r);

        if (dateInput) {
            dateInput.disabled = !isMaster;
            dateInput.value = mileageStartDate || '2024-01-01';
        }
        if (amtInput) {
            amtInput.disabled = !(isMaster || isAdmin);
            amtInput.value = typeof luckMileageAmount === 'number' ? luckMileageAmount : 10;
        }
        if (cntInput) {
            cntInput.disabled = !(isMaster || isAdmin);
            cntInput.value = luckMileageCount || 2;
        }
        if (saveBtn) {
            if (isMaster || isAdmin) saveBtn.classList.remove('hidden');
            else saveBtn.classList.add('hidden');
        }
        if (redrawBtn) {
            if (isMaster || isAdmin) redrawBtn.classList.remove('hidden');
            else redrawBtn.classList.add('hidden');
        }

        setTimeout(() => m.classList.add('opacity-100'), 10);
        if(window.lucide) window.lucide.createIcons();
    }
};

window.closeLuckMileageModal = () => {
    const m = window.$('luck-mileage-modal');
    if(m) {
        m.classList.remove('opacity-100');
        setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); }, 300);
    }
};

window.updateLuckMileageSetting = async () => {
    const r = sessionStorage.getItem('sonamu_user_role');
    if (!['master', '회장', '감독', '총무'].includes(r)) return window.showAlert("권한이 없습니다.");

    const valAmt = parseInt(window.$('input-luck-mileage')?.value || '10');
    const valCnt = parseInt(window.$('input-luck-count')?.value || '2');
    const valStart = window.$('input-mileage-start-date')?.value || '2024-01-01';
    
    if (isNaN(valAmt) || valAmt < 0) return window.showAlert("올바른 점수를 입력해주세요.");
    if (isNaN(valCnt) || valCnt < 1) return window.showAlert("추첨 인원은 최소 1명 이상이어야 합니다.");
    
    // 시작일 변경 시 처리
    if (valStart !== mileageStartDate) {
        if (r !== 'master') return window.showAlert("마일리지 시작일 변경은 마스터만 가능합니다.");

        window.showConfirm(`마일리지 시작일을 [${valStart}]로 변경하시겠습니까?\n\n⚠️ 주의: 시작일 이전의 모든 이적 데이터(수동 조정 점수 및 보너스)가 완전히 삭제되며, 이 날짜 이후의 활동기록으로만 점수가 재계산됩니다.`, async () => {
            luckMileageAmount = valAmt;
            luckMileageCount = valCnt;
            mileageStartDate = valStart;

            // 모든 회원의 마일리지 점수 초기화 및 재정산 (마스터만 가능)
            (members || []).forEach(m => {
                if(m.role !== '파트너') {
                    m.score = 0; // 전체 점수 초기화
                    // Source of Truth 점수로 재정산
                    m.score = window.getMemberCalculatedScore(m, teamEvents, posts);
                }
            });

            await window.saveData('members', true);
            window.updateUI();
            window.showToast(`✅ 시작일 변경 및 데이터 정리가 완료되었습니다.`);
            window.closeLuckMileageModal();
        });
    } else {
        luckMileageAmount = valAmt;
        luckMileageCount = valCnt;
        await window.saveData('members', true);
        window.showToast(`✅ 행운 마일리지 ${valAmt}pt / 추첨 ${valCnt}명으로 변경되었습니다.`);
        window.closeLuckMileageModal();
    }
};

// [신규] 마일리지 재추첨 및 기존 당첨 포인트 회수 로직
window.redrawLuckMileage = () => {
    const r = sessionStorage.getItem('sonamu_user_role');
    if (!['master', '회장', '감독', '총무'].includes(r)) return window.showAlert("권한이 없습니다.");
    if (luckMileageAmount === 0) {
        return window.showAlert("행운 마일리지 금액이 0으로 설정되어 있어 추첨을 진행할 수 없습니다.");
    }
    const today = window.getTodayString();
    const currentWinners = luckyWinners ? luckyWinners[today] : null;
    
    let msg = "오늘 설정된 행운 마일리지를 회수하고 새로 추첨하시겠습니까?\n(기존 당첨자의 포인트는 자동으로 차감됩니다.)";
    if(!currentWinners || currentWinners.length === 0) msg = "오늘 아직 추첨이 되지 않았습니다. 새로 추첨하시겠습니까?";

    window.showConfirm(msg, async () => {
        if(window.isSavingData) return; window.isSavingData = true;
        
        try {
            await db.runTransaction(async tx => {
                const snapM = await tx.get(docMembers);
                const snapS = await tx.get(docSports);
                const snapB = await tx.get(docBoard);
                if(!snapM.exists || !snapS.exists || !snapB.exists) return;

                const dM = snapM.data(); const dS = snapS.data(); const dB = snapB.data();
                const membersList = dM.members || [];
                const currentLW = dS.luckyWinners || {};
                const postsList = dB.posts || [];
                
                // 1. 기존 당첨자 포인트 회수 후 recalculate
                const luckIdPrefix = 'luck_' + today + '_';
                membersList.forEach(m => {
                    if(m.bonuses) {
                        const originalLen = m.bonuses.length;
                        m.bonuses = m.bonuses.filter(b => !b.id || !b.id.startsWith(luckIdPrefix));
                        if(m.bonuses.length < originalLen) {
                            m.score = window.getMemberCalculatedScore(m, dS.teamEvents || [], postsList);
                        }
                    }
                });

                // 2. 당첨 기록 초기화
                delete currentLW[today];
                tx.update(docSports, { luckyWinners: currentLW, updatedAt: new Date().toISOString() });
                tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
            });
            
            // 전역 변수 즉시 갱신 반영을 위해 state 수동 초기화 (onSnapshot이 오기 전까지)
            if(luckyWinners) delete luckyWinners[today];

            window.showToast("♻️ 포인트 회수 및 재추첨을 시작합니다.");
            setTimeout(() => { window.checkAndDrawLuckMileage(true); }, 500);
        } catch(err) {
            console.error("Redraw Error:", err);
            window.showAlert("재추첨 중 오류가 발생했습니다.");
        } finally {
            window.isSavingData = false;
        }
    });
};

window.checkAndDrawLuckMileage = async (force = false) => {
    if (luckMileageAmount === 0) {
        console.log("Luck mileage is 0, skipping daily draw.");
        return;
    }
    const today = window.getTodayString();
    if (!force && luckyWinners && luckyWinners[today]) return; // 이미 오늘 당첨자 선정됨

    // 전일 날짜 구하기 (로컬 시간 일관성 유지)
    const t = new Date();
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    t.setDate(t.getDate() - 1);
    const yesterday = t.toISOString().slice(0, 10);
    
    // [데이터 레이스 방지] 최신 상태를 트랜잭션 내부에서 가져와서 판별하는 것이 가장 정확함
    try {
        await db.runTransaction(async tx => {
            const snapS = await tx.get(docSports);
            const snapM = await tx.get(docMembers);
            const snapB = await tx.get(docBoard);
            
            if(!snapS.exists || !snapM.exists || !snapB.exists) return;
            const dS = snapS.data(); const dM = snapM.data(); const dB = snapB.data();
            const currentLW = dS.luckyWinners || {};
            if (currentLW[today]) return; // 이미 당첨자가 있음

            const mList = dM.members || [];
            const al = dM.accessLog || {};
            const evts = dS.teamEvents || [];
            const mh = dS.matchHistory || [];
            const pList = dB.posts || [];
            
            // 대상자: 어제 활동 기록이 있는 일반 회원 (파트너 제외)
            const eligible = mList.filter(m => {
                if(m.role === '파트너') return false;
                
                // 1. 접속 기록 확인 (어제 날짜 포함 여부)
                const hist = Array.isArray(al[m.id]) ? al[m.id] : (al[m.id] ? [al[m.id]] : []);
                if(hist.includes(yesterday) || m.lastLogin === yesterday) return true;
                
                
                // 3. 어제 투표 참여 여부 확인 (Active/Past)
                const votedYesterday = evts.some(e => {
                    // (1) 현재 진행중인 투표의 vDate 확인
                    if(e.vDate && e.vDate[m.id] === yesterday) return true;
                    // (2) 종료된 투표의 보관된 vDate 확인
                    if(e.pastVDates && e.pastVDates[yesterday] && e.pastVDates[yesterday][m.id]) return true;
                    return false;
                });
                if(votedYesterday) return true;

                return false;
            });

            if (eligible.length === 0) {
                 console.log(`No eligible members for ${yesterday}`);
                 return;
            }

            // 무작위 선정
            const winners = [];
            const pool = [...eligible];
            const numToPick = Math.min(luckMileageCount || 2, pool.length);
            for (let i = 0; i < numToPick; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                winners.push(pool.splice(idx, 1)[0]);
            }

            if (winners.length > 0) {
                const bonusNote = `🍀 전일 접속 행운 당첨 (${yesterday})`;
                winners.forEach(w => {
                    const m = mList.find(x => x.id === w.id);
                    if (m) {
                        if (!m.bonuses) m.bonuses = [];
                        m.bonuses.push({
                            id: 'luck_' + today + '_' + m.id,
                            amount: typeof luckMileageAmount === 'number' ? luckMileageAmount : 10,
                            note: bonusNote,
                            timestamp: Date.now()
                        });
                        m.score = window.getMemberCalculatedScore(m, evts, pList);
                    }
                });
                currentLW[today] = winners.map(w => w.name);
                tx.update(docSports, { luckyWinners: currentLW, updatedAt: new Date().toISOString() });
                tx.update(docMembers, { members: mList, updatedAt: new Date().toISOString() });
            }
        });
        if(force) window.showToast("행운 마일리지 추첨을 완료했습니다.");
    } catch (err) {
        console.error("Luck Draw Error:", err);
    }
};

// [신규] 행운 마일리지 추첨 대상자 확인 (진단용)
// [신규] 원자적 접속 기록 (데이터 유실 방지)
window.recordMemberAccess = async (mid) => {
    if(!mid || mid === 'master') return;
    const td = window.getTodayString();
    
    // 로컬 상태 즉시 반영 (UI용)
    const me = (members || []).find(x => x.id === mid);
    if(me) me.lastLogin = td;

    // 2일치 기록 유지 (배열화)
    let localHistory = Array.isArray(accessLog[mid]) ? accessLog[mid] : (accessLog[mid] ? [accessLog[mid]] : []);
    if (!localHistory.includes(td)) {
        localHistory.push(td);
        if (localHistory.length > 2) localHistory.shift();
        accessLog[mid] = localHistory;
    }
    window.updateUI();

    try {
        await db.runTransaction(async tx => {
            const snap = await tx.get(docMembers);
            if(!snap.exists) return;
            const d = snap.data();
            const mList = d.members || [];
            const target = mList.find(x => x.id === mid);
            const currentAL = d.accessLog || {};
            
            let changed = false;
            if(target && target.lastLogin !== td) { target.lastLogin = td; changed = true; }
            
            // 2일치 기록 유지 (배열화)
            let history = Array.isArray(currentAL[mid]) ? currentAL[mid] : (currentAL[mid] ? [currentAL[mid]] : []);
            if (!history.includes(td)) {
                history.push(td);
                if (history.length > 2) history.shift();
                currentAL[mid] = history;
                changed = true;
            }
            
            if(changed) {
                tx.update(docMembers, { 
                    members: mList, 
                    accessLog: currentAL,
                    updatedAt: new Date().toISOString() 
                });
            }
        });
    } catch(e) { console.error("Access record failed:", e); }
};

window.showLuckEligibleMembers = () => {
    const t = new Date();
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    t.setDate(t.getDate() - 1);
    const yesterday = t.toISOString().slice(0, 10);

    const eligible = (members || []).filter(m => {
        if(m.role === '파트너') return false;
        
        // 1. 접속 기록 (2일치 배열 대응)
        const hist = Array.isArray(accessLog[m.id]) ? accessLog[m.id] : (accessLog[m.id] ? [accessLog[m.id]] : []);
        if (hist.includes(yesterday) || m.lastLogin === yesterday) return true;
        
        
        // 3. 투표 참여
        const voted = (teamEvents || []).some(e => {
            if(e.vDate && e.vDate[m.id] === yesterday) return true;
            if(e.pastVDates && e.pastVDates[yesterday] && e.pastVDates[yesterday][m.id]) return true;
            return false;
        });
        if(voted) return true;

        return false;
    });

    const names = eligible.map(m => `• ${m.name} (${m.role})`).join('\n') || '대상자 없음';
    window.showAlert(`📅 추첨 기준일 (어제): ${yesterday}\n\n👥 추첨 대상자 (${eligible.length}명):\n${names}\n\n※ 파트너를 제외한 어제 접속, 경기 참여, 투표 활동 기록이 포함됩니다.`, "행운 마일리지 진단");
};

// [신규] 특정 회원의 마일리지 총점을 실시간 계산하는 핵심 유틸리티 (Source of Truth 기반)
// [중요] 마일리지 산정 엔진 통합 (상세 내역과 총점이 일치하도록 단일 소스 사용)
window.getMemberMileageItems = (m, evts = teamEvents, pList = posts, targetYear = null, excludeLucky = false) => {
    if (!m || m.role === '파트너' || m.role === '초청선수') return [];
    
    let startD = mileageStartDate || "";
    let endD = "9999-12-31";
    
    if (targetYear && targetYear !== 'all') {
        const yearStart = `${targetYear}-01-01`;
        const yearEnd = `${targetYear}-12-31`;
        
        // 실제 시작일은 글로벌 설정 시작일과 해당 연도 1월 1일 중 더 늦은 날짜 적용
        startD = startD > yearStart ? startD : yearStart;
        endD = yearEnd;
        
        // 만약 글로벌 시작일이 조회하려는 연도의 12월 31일보다 늦다면 집계 대상 없음
        if (startD > endD) return [];
    }

    const items = [];

    // 1. 운동 투표 및 참석 (teamEvents)
    (evts || []).forEach(e => {
        // [수정] 스냅샷의 경우 부모 원본 일정이 삭제되었거나 해당 기록이 유실된 경우 마일리지 집계에 포함
        if (e.isFinished && e.originalId) {
            const parent = evts.find(p => p.id === e.originalId);
            if (parent && parent.pastVotes && parent.pastVotes[e.date]) {
                return; // 부모가 온전히 존재하므로 중복 카운트 방지
            }
        }

        // (1) 현재 활성 투표 데이터 (또는 부모 잃은 스냅샷의 단일 날짜 데이터)
        const d = e.dDate || e.date || "";
        if (!startD || (d >= startD && d <= endD)) {
            if (!(e.pastVotes && e.pastVotes[d])) {
                const v = e.votes?.[m.id];
                let explicitlyVoted = true;
                const isRecurringOrSnapshot = (e.repeatMode && e.repeatMode !== 'none') || (e.isFinished && e.originalId);
                if (isRecurringOrSnapshot) {
                    if (!e.vDate || e.vDate[m.id] !== d) explicitlyVoted = false;
                }
                
                if (v) {
                    const baseV = String(v).replace('_p', '');
                    if (baseV !== '미정' && baseV !== 'pending' && baseV !== '') {
                        if (explicitlyVoted) {
                            items.push({ d, desc: `운동 투표 참여`, p: 2, icon: 'edit-3' });
                        }
                        if (['참석', 'attend', 'late', '지각'].includes(baseV)) {
                            const isFuture = d > window.getTodayString();
                            if (!isFuture || explicitlyVoted) {
                                items.push({ d, desc: `운동 참석 보너스`, p: 1, icon: 'user-check' });
                            }
                        }
                    }
                }
            }
        }
        
        // (2) 과거 기록 (pastVotes)
        if (e.pastVotes) {
            Object.keys(e.pastVotes).forEach(pDate => {
                if (startD && (pDate < startD || pDate > endD)) return;
                const pv = e.pastVotes[pDate][m.id];
                if (pv) {
                    const baseV = String(pv).replace('_p', '');
                    if (baseV !== '미정' && baseV !== 'pending' && baseV !== '') {
                        let explicitlyVotedPast = true;
                        if (e.repeatMode && e.repeatMode !== 'none') {
                            if (e.pastVDates && e.pastVDates[pDate]) {
                                if (e.pastVDates[pDate][m.id] !== pDate) explicitlyVotedPast = false;
                            }
                        }

                        if (explicitlyVotedPast) {
                            items.push({ d: pDate, desc: `운동 투표 참여 (기록)`, p: 2, icon: 'history' });
                        }
                        if (['참석', 'attend', 'late', '지각'].includes(baseV)) {
                            items.push({ d: pDate, desc: `운동 참석 보너스 (기록)`, p: 1, icon: 'user-check' });
                        }
                    }
                }
            });
        }
    });

    // 2. 일반 투표 (posts)
    (pList || []).forEach(p => {
        if (p.isEvent || p.isAnon) {
            const pd = p.date ? p.date.substring(0,10) : '';
            if (startD && (pd < startD || pd > endD)) return;

            const v = p.isAnon ? (p.voters && p.voters[m.id]) : (p.votes?.[m.id]);
            if (v) {
                const vArray = Array.isArray(v) ? v : [v];
                const baseVArray = vArray.map(val => String(val).replace('_p', ''));
                if (baseVArray.length > 0 && !baseVArray.includes('미정') && !baseVArray.includes('pending') && !baseVArray.includes('')) {
                    items.push({ d: pd, desc: `${p.isAnon ? '무기명' : (p.isEvent ? '회원' : '일반')} 투표 참여`, p: 2, icon: 'vote' });
                }
            }
        }
    });

    // 3. 보너스 및 수동 조정 (m.bonuses)
    (m.bonuses || []).forEach(b => {
        const bDate = b.timestamp ? new Date(b.timestamp - (new Date().getTimezoneOffset()*60000)).toISOString().substring(0,10) : "";
        if (startD && (bDate < startD || bDate > endD)) return;
        
        const isLuck = (b.id && String(b.id).startsWith('luck_')) || (b.note && b.note.includes('행운'));
        if (excludeLucky && isLuck) return; // [NEW] 행운 마일리지 제외
        
        items.push({ 
            d: bDate, 
            desc: b.note || '보너스/조정', 
            p: parseFloat(b.amount) || 0, 
            icon: isLuck ? 'clover' : 'gift', 
            type: isLuck ? 'luck' : 'bonus' 
        });
    });

    // 중복 제거 및 정렬
    const unique = [];
    const seen = new Set();
    items.sort((a, b) => b.d.localeCompare(a.d)).forEach(it => {
        const key = `${it.d}_${it.desc}_${it.p}`;
        if (!seen.has(key)) {
            unique.push(it);
            seen.add(key);
        }
    });

    return unique;
};

window.getMemberCalculatedScore = (m, evts, posts, targetYear = null, excludeLucky = false) => {
    const items = window.getMemberMileageItems(m, evts, posts, targetYear, excludeLucky);
    return items.reduce((acc, it) => acc + (it.p || 0), 0);
};

window.smartDetectAttendees = () => {
    const date = window.$('recovery-date')?.value;
    if (!date) return window.showAlert("먼저 날짜를 선택해주세요.");
    
    // 1. matchHistory에서 해당 날짜 경기 참가자 추출
    const matchPlayers = new Set();
    (matchHistory || []).forEach(mh => {
        if (mh.date === date) {
            Object.values(mh.compA || {}).forEach(name => { if (name && name !== '외부선수') matchPlayers.add(name); });
            Object.values(mh.compB || {}).forEach(name => { if (name && name !== '외부선수') matchPlayers.add(name); });
        }
    });

    // 2. teamEvents.pastVotes에서 해당 날짜 투표 데이터 추출
    const votePlayers = new Set();
    (teamEvents || []).forEach(e => {
        if (e.pastVotes && e.pastVotes[date]) {
            Object.entries(e.pastVotes[date]).forEach(([mId, v]) => {
                const baseV = String(v).replace('_p', '');
                if (baseV === '참석' || baseV === 'attend' || baseV === 'late' || baseV === '늦참') {
                    const m = members.find(x => x.id === mId);
                    if (m) votePlayers.add(m.id);
                }
            });
        }
    });

    // 검색 결과 적용
    let detectedCount = 0;
    document.querySelectorAll('.recovery-cb').forEach(cb => {
        const mId = cb.value;
        const m = members.find(x => x.id === mId);
        const name = m ? m.name : '';
        
        if (matchPlayers.has(name) || votePlayers.has(mId)) {
            cb.checked = true;
            cb.closest('label').classList.replace('bg-slate-50', 'bg-rose-100');
            cb.closest('label').classList.add('ring-2', 'ring-rose-400');
            detectedCount++;
        } else {
            cb.checked = false;
            cb.closest('label').classList.replace('bg-rose-100', 'bg-slate-50');
            cb.closest('label').classList.remove('ring-2', 'ring-rose-400');
        }
    });

    if (detectedCount > 0) {
        window.showToast(`🔍 ${date} 데이터에서 ${detectedCount}명을 자동으로 찾았습니다.`);
    } else {
        window.showAlert(`${date} 날짜의 기록(경기 또는 투표)이 없습니다. 직접 선택해주세요.`);
    }
};

window.openMileageRecoveryModal = () => {
    if (window.$('recovery-date')) window.$('recovery-date').value = window.getTodayString().substring(0, 10);
    window.renderMileageRecoveryList();
    window.$('mileage-recovery-modal')?.classList.replace('hidden', 'flex');
};

window.renderMileageRecoveryList = () => {
    const container = window.$('recovery-member-list');
    if (!container) return;
    const eligible = window.getSortedMembers().filter(m => m.role !== '파트너' && m.role !== '초청선수');
    container.innerHTML = eligible.map(m => `
        <label class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 shadow-sm">
            <input type="checkbox" class="recovery-cb w-5 h-5 accent-rose-600 shrink-0" value="${m.id}" checked>
            <div class="flex-1 min-w-0">
                <div class="font-black text-slate-800 truncate">${window.escapeHtml(m.name)}</div>
                <div class="text-[10px] text-slate-400 font-bold">${m.role}</div>
            </div>
        </label>
    `).join('');
};

window.selectAllRecovery = (checked) => {
    document.querySelectorAll('.recovery-cb').forEach(cb => {
        cb.checked = checked;
        const label = cb.closest('label');
        if (checked) {
            label.classList.replace('bg-slate-50', 'bg-rose-50');
        } else {
            label.classList.replace('bg-rose-50', 'bg-slate-50');
            label.classList.remove('bg-rose-100', 'ring-2', 'ring-rose-400');
        }
    });
};

window.batchRecoverMileage = async () => {
    if (sessionStorage.getItem('sonamu_user_id') !== 'master') return window.showAlert("마스터 권한이 필요합니다.");
    const date = window.$('recovery-date')?.value;
    const pts = parseInt(window.$('recovery-pts')?.value || '5');
    if (!date) return window.showAlert("날짜를 선택해주세요.");
    const selected = [...document.querySelectorAll('.recovery-cb:checked')].map(cb => cb.value);
    if (!selected.length) return window.showAlert("복구할 회원을 1명 이상 선택해주세요.");
    
    window.showConfirm(`${date} 활동 기록으로 ${selected.length}명에게 각 ${pts}점을 복구하시겠습니까?`, async () => {
        if (window.isSavingData) return; window.isSavingData = true;
        const d = new Date(date + 'T12:00:00');
        const ts = d.getTime() + d.getTimezoneOffset() * 60000;
        const cy = d.getFullYear();
        let count = 0;
        selected.forEach(mId => {
            const m = (members || []).find(x => x.id === mId);
            if (!m) return;
            if (!m.bonuses) m.bonuses = [];
            
            // [수정] 복구 작업은 중복 체크를 완화하여 실수를 교정할 수 있도록 함
            m.bonuses.push({ 
                id: 'rec_' + mId + '_' + Date.now() + Math.random(), 
                year: cy, 
                amount: pts, 
                timestamp: ts, 
                note: `마일리지 복구 (${date})`, 
                givenById: 'master' 
            });
            count++;
        });
        await window.saveData('members', true);
        window.isSavingData = false;
        window.$('mileage-recovery-modal')?.classList.replace('flex', 'hidden');
        
        // [수지] UI 즉시 전체 갱신 (전광판 및 활동내역 모두)
        window.updateDashboard(); 
        window.renderActivities();
        window.updateUI();
        
        window.showToast(`✅ ${count}명의 마일리지가 성공적으로 복구되었습니다.`);
    });
};

// PWA 서비스워커 및 앱 초기화 구동
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered successfully:', reg.scope))
                .catch(err => console.log('Service Worker registration failed:', err));
        });
    }

    if(localStorage.getItem('sonamu_rem')==='1') { 
        try {
            let savedId = decodeURIComponent(atob(localStorage.getItem('sonamu_id')||''));
            let savedPw = decodeURIComponent(atob(localStorage.getItem('sonamu_pw')||''));
            if(savedId.startsWith('snm_')) savedId = savedId.substring(4);
            if(savedPw.startsWith('snm_')) savedPw = savedPw.substring(4);
            
            window.setVal('login-id', savedId); 
            window.setVal('login-pw', savedPw); 
        } catch(e) {
            window.setVal('login-id', localStorage.getItem('sonamu_id')||''); 
            window.setVal('login-pw', localStorage.getItem('sonamu_pw')||'');
        }
        const cb=window.$('login-remember'); if(cb) cb.checked=true;
    }
    
    let cy=new Date().getFullYear(), cm=new Date().getMonth()+1;
    currentLedgerMonthStr=`${cy}-${String(cm).padStart(2,'0')}`;
    
    // 클라우드 데이터 동기화 개시
    window.startCloudSync();
    
    // [스마트폰 뒤로가기 종료 방지 및 모달/탭 네비게이션 처리 로직]
    let isAppExiting = false;
    window.addEventListener('popstate', function(e) {
        if(isAppExiting) return;
        
        if(document.documentElement.classList.contains('app-loaded')) {
            // 1. 열려있는 모달이 있는지 확인 (로그인 화면, 공통 다이얼로그 모달 제외)
            const openModals = Array.from(document.querySelectorAll('.fixed.inset-0.flex:not(.hidden)')).filter(m => m.id !== 'login-overlay' && m.id !== 'dialog-modal' && getComputedStyle(m).opacity !== '0');
            
            if(openModals.length > 0) {
                // 모달 닫기
                const topModal = openModals[openModals.length - 1];
                
                // 각 모달의 특성에 맞춰 닫기 함수 호출
                if(topModal.id === 'member-form-container') window.resetMemberForm(false);
                else if(topModal.id === 'image-viewer-modal') window.closeImageViewer();
                else if(topModal.id === 'upload-preview-modal') window.closeUploadPreview(false);
                else {
                    const closeBtn = topModal.querySelector('button[onclick^="window.close"]') || topModal.querySelector('#dialog-btn-cancel');
                    if(closeBtn && !closeBtn.classList.contains('hidden')) {
                        closeBtn.click();
                    } else if(window.closeAlert) {
                        window.closeAlert(); 
                    }
                }
                
                // 뒤로가기를 모달 닫기에 소모했으므로 현재 위치 복원
                history.pushState(e.state, null, location.href);
                return;
            }

            // 2. 다이얼로그(Alert/Confirm) 모달이 열려있는 경우
            const dialogModal = window.$('dialog-modal');
            if(dialogModal && dialogModal.classList.contains('flex') && !dialogModal.classList.contains('hidden')) {
                window.closeAlert();
                history.pushState(e.state, null, location.href);
                return;
            }

            // 3. 탭 네비게이션 지원
            if(e.state && e.state.tab) {
                window.showTab(e.state.tab, true);
                return;
            }

            // 4. 모달도 없고 이전 탭(히스토리)도 없는 초기 진입점인 경우 앱 종료 확인창 띄움
            // Confirm창이 뜨는 동안에도 앱이 튕기지 않도록 상태 일단 유지
            history.pushState(null, null, location.href); 
            window.showConfirm("소나무 족구단 어플리케이션을 완전히 종료하시겠습니까?", () => {
                isAppExiting = true;
                history.back(); // 실제 앱 종료 권한을 시스템에 위임
            }, "종료 확인");
        }
    });

    if(window.lucide) window.lucide.createIcons();
});

// --- [신규: 자유게시판 비즈니스 로직] ---
window.renderFreeBoard = () => {
    const list = window.$('free-post-list');
    if (!list) return;

    const role = sessionStorage.getItem('sonamu_user_role');
    const uid = sessionStorage.getItem('sonamu_user_id');
    const isAdmin = window.isNoticeAdmin(); // 회장, 총무, 감독, master

    // isFreePost 필드가 true인 글만 필터링
    let freePosts = (posts || []).filter(p => p.isFreePost);
    freePosts.sort((a, b) => String(b.id).localeCompare(String(a.id))); // 최신순 정렬

    list.innerHTML = freePosts.length ? freePosts.map(p => {
        const isSecret = !!p.isSecret;
        const canRead = !isSecret || isAdmin || p.authorId === uid;
        
        let contentHtml = '';
        if (canRead) {
            contentHtml = window.escapeHtml(p.content || '');
        } else {
            contentHtml = `<span class="text-slate-400 italic flex items-center gap-1.5"><i data-lucide="lock" class="w-3.5 h-3.5"></i> 비밀글입니다. (임원진만 열람 가능)</span>`;
        }

        const titleHtml = isSecret 
            ? `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] mr-1"><i data-lucide="lock" class="w-2.5 h-2.5"></i> 비밀</span>` 
            : `<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] mr-1"><i data-lucide="globe" class="w-2.5 h-2.5"></i> 전체공개</span>`;

        // 작성자 및 수정/삭제 권한 제어
        const showActions = isAdmin || p.authorId === uid;
        const actionHtml = showActions ? `
            <div class="absolute top-5 right-5 flex gap-2">
                <button onclick="window.editFreePost('${p.id}')" class="text-slate-400 hover:text-blue-500 bg-white border p-1.5 rounded-lg shadow-sm btn-touch transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="window.deleteFreePost('${p.id}')" class="text-slate-400 hover:text-red-500 bg-white border p-1.5 rounded-lg shadow-sm btn-touch transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        ` : '';

        return `<div class="bg-slate-50 border border-slate-200 p-5 md:p-6 rounded-[1.5rem] relative group shadow-sm mb-4">
            ${actionHtml}
            <div class="mb-3 flex items-center">${titleHtml} <span class="font-black text-slate-800 ml-1 text-lg leading-tight pr-20">${window.escapeHtml(p.title)}</span></div>
            <div class="text-[10px] text-slate-400 font-bold mb-4 flex flex-wrap gap-3 border-b border-slate-200 pb-3">
                <span>작성자: ${window.escapeHtml(p.authorName || '알 수 없음')}</span>
                <span>작성일: ${p.date || ''}</span>
            </div>
            <div class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-bold bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner leading-relaxed">${contentHtml}</div>
        </div>`;
    }).join('') : `<div class="text-center py-16 text-slate-400 font-black border-2 border-dashed border-slate-200 bg-slate-50 rounded-[2rem] shadow-inner">게시물이 존재하지 않습니다. 첫 마디를 나누어보세요!</div>`;

    if (window.lucide) window.lucide.createIcons();
};

window.resetFreeForm = () => {
    window.editingFreePostId = null;
    window.setVal('free-title');
    window.setVal('free-content');
    const chk = window.$('free-is-secret');
    if (chk) chk.checked = false;
    window.$('btn-free-submit').innerText = '등록하기';
    window.$('btn-free-cancel').classList.add('hidden');
};

window.addFreePost = async () => {
    if(window.isSavingData) return;
    window.isSavingData = true;

    const t = window.$('free-title')?.value.trim();
    const c = window.$('free-content')?.value.trim();
    const isSec = window.$('free-is-secret')?.checked || false;

    if (!t) { window.isSavingData = false; return window.showAlert("제목을 입력해 주세요."); }
    if (!c) { window.isSavingData = false; return window.showAlert("내용을 입력해 주세요."); }

    const uid = sessionStorage.getItem('sonamu_user_id');
    const uname = sessionStorage.getItem('sonamu_user_name') || '회원';

    const pId = window.editingFreePostId || 'free_' + Date.now();
    let p = {
        id: pId,
        title: t,
        content: c,
        date: window.getTodayString(),
        isFreePost: true,
        isSecret: isSec,
        authorId: uid,
        authorName: uname
    };

    try {
        await db.runTransaction(async (tx) => {
            const docB = await tx.get(docBoard);
            if (!docB.exists) throw new Error("게시판 문서 없음");
            const bD = docB.data();
            let postsList = bD.posts || [];

            if (window.editingFreePostId) {
                // 수정
                postsList = postsList.map(x => x.id === window.editingFreePostId ? { ...x, ...p } : x);
            } else {
                // 신규 등록
                postsList.push(p);
            }

            tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
            // 전역 posts 즉시 갱신
            posts = postsList;
        });

        window.showToast(window.editingFreePostId ? "글이 수정되었습니다." : "새 마디가 등록되었습니다!");
        window.resetFreeForm();
        window.renderFreeBoard();
        window.updateDashboardCapacity(); // 용량 모니터링 반영
    } catch (e) {
        console.error("Free Post Error:", e);
        window.showAlert("서버 저장 실패");
    } finally {
        window.isSavingData = false;
    }
};

window.editFreePost = (id) => {
    const p = (posts || []).find(x => x.id === id);
    if (!p) return;

    window.editingFreePostId = id;
    window.setVal('free-title', p.title);
    window.setVal('free-content', p.content);
    const chk = window.$('free-is-secret');
    if (chk) chk.checked = !!p.isSecret;

    window.$('btn-free-submit').innerText = '수정 완료';
    window.$('btn-free-cancel').classList.remove('hidden');

    window.scrollTo({
        top: window.$('free-form-container').offsetTop - 100,
        behavior: 'smooth'
    });
};

window.deleteFreePost = (id) => {
    window.showConfirm("정말로 이 글을 삭제하시겠습니까?", async () => {
        if (window.isSavingData) return;
        window.isSavingData = true;

        try {
            await db.runTransaction(async (tx) => {
                const docB = await tx.get(docBoard);
                if (!docB.exists) throw new Error("게시판 문서 없음");
                const bD = docB.data();
                const postsList = (bD.posts || []).filter(x => x.id !== id);

                tx.update(docBoard, { posts: postsList, updatedAt: new Date().toISOString() });
                posts = postsList;
            });

            window.showToast("글이 삭제되었습니다.");
            window.renderFreeBoard();
            window.updateDashboardCapacity(); // 용량 모니터링 반영
        } catch (e) {
            console.error("Delete Free Post Error:", e);
            window.showAlert("삭제 실패");
        } finally {
            window.isSavingData = false;
        }
    });
};

