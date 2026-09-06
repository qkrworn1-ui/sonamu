// --- [회원 전용] 내 정보 수정(My Profile) 로직 ---
window.openMyProfile = () => {
    const mid = sessionStorage.getItem('sonamu_user_id');
    if (!mid || mid === 'master') return window.showAlert("관리자 계정은 회원 관리 탭을 이용해 주세요.");
    
    const m = members.find(x => x.id === mid);
    if (!m) return window.showAlert("회원 정보를 찾을 수 없습니다.");

    editingMemberId = m.id;
    window.$('member-form-title').innerText = "내 정보 수정";
    window.$('m-name').value = m.name || "";
    window.$('m-phone').value = m.phone || "";
    window.$('m-birth').value = m.birth || "";
    window.$('m-joinDate').value = m.joinDate || "";
    window.$('m-address').value = m.address || "";
    window.$('m-loginId').value = m.loginId || "";
    window.$('m-loginPw').value = m.loginPw || "";
    window.$('m-role').value = m.role || "일반회원";
    window.$('m-position').value = m.position || "";
    window.$('m-backNo').value = m.backNo || "";
    window.$('m-topSize').value = m.topSize || "";
    window.$('m-bottomSize').value = m.bottomSize || "";
    
    // 내 정보 수정 시에는 역할/등번호 등 주요 정보 수정 제한 (관리자 제외)
    const isAdmin = window.isNoticeAdmin();
    window.$('m-role').disabled = !isAdmin;
    window.$('m-backNo').disabled = !isAdmin;
    window.$('m-position').disabled = !isAdmin;
    window.$('m-joinDate').disabled = !isAdmin;
    window.$('m-name').disabled = !isAdmin; // 이름/가입일도 관리자만 수정 가능하도록 제한
    
    window.$('m-score-container').classList.add('hidden');
    window.$('m-bonus-container').classList.add('hidden');

    const modal = window.$('member-form-container');
    modal.classList.replace('hidden', 'flex');
    setTimeout(() => {
        modal.classList.replace('opacity-0', 'opacity-100');
        window.$('member-form-card').classList.replace('scale-95', 'scale-100');
    }, 10);
};

window.startCloudSync = async () => {
    const sUI = (t) => {
        const l=window.$('login-sync-status'), logo=window.$('login-logo-container'), mLogo=window.$('main-logo-container'), btn=window.$('btn-login');
        let icon='', text='', classes='status-badge inline-flex items-center rounded-full font-black shadow-lg backdrop-blur-xl border transition-all duration-700';
        let logoClasses='w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border shadow-2xl relative overflow-hidden group transition-all duration-700';
        let mLogoClasses='mini-logo-container';
        
        if(t === 'loading') {
            icon = '<div class="relative flex items-center justify-center mr-2"><div class="absolute w-4 h-4 rounded-full border-2 border-blue-400/20"></div><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-blue-400"></i></div>';
            text = '서버 연결 중...';
            classes += ' bg-blue-950/40 text-blue-100 border-blue-500/40 animate-pulse glow-blue';
            logoClasses += ' border-blue-500/50 animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.3)]';
            mLogoClasses += ' border-blue-500/50 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]';
            if(btn) btn.disabled = true;
        } else if(t === 'success') {
            icon = '<div class="relative flex items-center justify-center mr-2"><div class="absolute w-5 h-5 rounded-full bg-emerald-500/20 animate-ping"></div><i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400 relative z-10"></i></div>';
            text = '서버 연결됨';
            classes += ' bg-emerald-950/40 text-emerald-100 border-emerald-500/40 glow-emerald';
            logoClasses += ' border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.4)]';
            mLogoClasses += ' border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            if(btn) btn.disabled = false;
        } else {
            icon = '<div class="relative flex items-center justify-center mr-2"><i data-lucide="wifi-off" class="w-3.5 h-3.5 text-rose-400"></i></div>';
            text = '오프라인 모드';
            classes += ' bg-rose-950/40 text-rose-100 border-rose-500/40 animate-bounce';
            logoClasses += ' border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)]';
            mLogoClasses += ' border-rose-400/80 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
            if(btn) btn.disabled = true;
        }

        const html = `${icon}<span class="tracking-tight">${text}</span>`;
        if(l) { l.className = `${classes} text-[10px] px-4 py-2 mt-6 uppercase tracking-widest`; l.innerHTML = html; }
        if(logo) { logo.className = logoClasses; }
        if(mLogo) { mLogo.className = mLogoClasses; }
        const credit = window.$('ai-credit-status'), creditText = window.$('ai-credit-text');
        if(credit && t === 'success') { 
            credit.classList.remove('hidden'); credit.classList.add('flex'); 
            if(creditText) creditText.innerText = '서버 연결됨';
        } else if(credit && t === 'loading') {
            credit.classList.remove('hidden'); credit.classList.add('flex'); 
            if(creditText) creditText.innerText = '서버 연결 중...';
        } else if(credit) {
            credit.classList.remove('hidden'); credit.classList.add('flex'); 
            if(creditText) creditText.innerText = '오프라인';
        }
        if(window.lucide) window.lucide.createIcons();
    };
    try {
        sUI('loading');
        await auth.signInAnonymously(); user=auth.currentUser;
        
        try {
            const legacySnap = await docMainLegacy.get();
            if(legacySnap.exists && !legacySnap.data().migrated && legacySnap.data().members) {
                const d = legacySnap.data();
                const batch = db.batch();
                batch.set(docMembers, { members: d.members||[], deletedMembers: d.deletedMembers||[], updatedAt: new Date().toISOString() });
                batch.set(docFinance, { transactions: d.transactions||[], deletedTransactions: d.deletedTransactions||[], specialDues: d.specialDues||[], reportNotes: d.reportNotes||{}, updatedAt: new Date().toISOString() });
                batch.set(docSports, { teamEvents: d.teamEvents||[], updatedAt: new Date().toISOString() });
                batch.set(docBoard, { posts: d.posts||[], updatedAt: new Date().toISOString() });
                batch.set(docMainLegacy, { migrated: true, updatedAt: new Date().toISOString() });
                await batch.commit();
            }
        } catch (migErr) { console.warn("마이그레이션 건너뜀:", migErr); }

        let initDocs = new Set();
        let isAppReady = false;

        const checkInitComplete = (docName) => {
            if (isAppReady) {
                window.updateUI();
                return;
            }
            
            initDocs.add(docName);
            if(initDocs.size === 5) {
                isAppReady = true;
                sUI('success');
                window.updateUI();
                const loginBtn = window.$('btn-login'); if(loginBtn) loginBtn.disabled = false;
                
                // [동기화 피드백] 최신 동기화 시간 표시
                const creditText = window.$('ai-credit-text');
                if(creditText) {
                    const now = new Date();
                    creditText.innerText = `서버 연결됨 (${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')})`;
                }
                
                // [무결성 강화] 행운 마일리지 자동 추첨 실행 (접속 기록 업데이트 전 실행 권장)
                setTimeout(() => { window.checkAndDrawLuckMileage(); }, 3000);

                // [무결성 강화] 접속 즉시 기록 (추첨 로직이 어제 데이터를 먼저 보도록 약간 지연)
                const sid = sessionStorage.getItem('sonamu_user_id');
                setTimeout(() => {
                    if(sid && sid !== 'master') window.recordMemberAccess(sid);
                }, 6000);

                // 테마 아이콘 동기화
                const isDark = document.documentElement.classList.contains('dark');
                const dIcon = window.$('theme-icon-d'), mIcon = window.$('theme-icon-m');
                if (dIcon) dIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
                if (mIcon) mIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
                if (window.lucide) window.lucide.createIcons();

                if (sessionStorage.getItem('sonamu_user_role')) {
                    document.documentElement.classList.add('app-loaded');
                    window.checkAndRouteFromUrl();
                }

                setTimeout(() => {
                    db.runTransaction(async tx => {
                        const snapM = await tx.get(docMembers);
                        const snapF = await tx.get(docFinance);
                        const snapS = await tx.get(docSports);
                        
                        let dM = snapM.exists ? snapM.data() : {members:[]};
                        let dF = snapF.exists ? snapF.data() : {transactions:[], specialDues:[]};
                        let dS = snapS.exists ? snapS.data() : {teamEvents:[]};
                        
                        let modM = false, modF = false, modS = false;
                        const td = window.getTodayString();
                        const currentYm = td.substring(0, 7);
                        const currentY = td.substring(0, 4);

                        // [마일리지 시스템 통합] 총 마일리지 체제 확립 (모든 이월 및 정산 로직 제거됨)
                        if (dM.members?.length > 0) {
                            dM.members.forEach(m => {
                                // [마이그레이션] 임시/가입대기/신입 관련 등급 -> 준회원으로 통일
                                if (['임시', '가입대기', '가입대기자', '신입', '신입회원'].includes(m.role)) {
                                    m.role = '준회원';
                                    modM = true;
                                }
                                if (m.role === '파트너') return;
                                // 불필요한 레거시 필드 정리
                                if (m.scoreYear !== undefined) delete m.scoreYear;
                                if (m.lastResetY !== undefined) delete m.lastResetY;
                            });
                            if (dM.lastResetYm !== undefined) delete dM.lastResetYm;
                            if (dM.lastResetY !== undefined) delete dM.lastResetY;
                            if (dM.mileageStartDate !== undefined) delete dM.mileageStartDate; 
                            modM = true;
                        }

                        (dF.specialDues||[]).forEach(sd=>{
                            if(!sd.date) { sd.date=td; modF=true; }
                            (sd.paids||[]).forEach(tn=>{
                                const txId='tx_'+sd.id+'_'+tn;
                                const existingTx = (dF.transactions||[]).find(t=>t.id===txId);
                                if(!existingTx){
                                    if(!dF.transactions) dF.transactions = [];
                                    dF.transactions.push({id:txId,category:'income',name:tn,type:'[특별청구] '+sd.title,amount:parseInt(sd.amount)||0,date:sd.date||td,months:null});
                                    modF=true;
                                } else if (existingTx.amount !== (parseInt(sd.amount)||0) || existingTx.type !== '[특별청구] ' + sd.title) {
                                    existingTx.amount = parseInt(sd.amount)||0;
                                    existingTx.type = '[특별청구] ' + sd.title;
                                    modF=true;
                                }
                            });
                        });

                        const mid = sessionStorage.getItem('sonamu_user_id');
                        if(mid && mid !== 'master') {
                            // recordMemberAccess가 즉시 처리하므로 여기서는 중복 트랜잭션 방출만 제거
                        }

                        const ts = new Date().toISOString();
                        if(modM) { dM.updatedAt = ts; tx.update(docMembers, { members: dM.members, updatedAt: ts }); }
                        if(modF) { dF.updatedAt = ts; tx.update(docFinance, { transactions: dF.transactions, specialDues: dF.specialDues, updatedAt: ts }); }
                        if(modS) { dS.updatedAt = ts; tx.update(docSports, { teamEvents: dS.teamEvents, luckyWinners: dS.luckyWinners, updatedAt: ts }); }
                    }).catch(e => console.warn("Background Sync TX failed"));
                }, 2000);

                // [추가] 실시간 정합성 보장을 위한 로그인 사용자 점수 자동 무결성 검증
                setTimeout(async () => {
                    const sid = sessionStorage.getItem('sonamu_user_id');
                    if(sid && sid !== 'master') {
                        try {
                            await db.runTransaction(async tx => {
                                const snapM = await tx.get(docMembers);
                                const snapS = await tx.get(docSports);
                                const snapB = await tx.get(docBoard);
                                if (!snapM.exists || !snapS.exists || !snapB.exists) return;

                                const mD = snapM.data(); const sD = snapS.data(); const bD = snapB.data();
                                const mList = mD.members || [];
                                const targetM = mList.find(x => x.id === sid);
                                if(targetM) {
                                    const calc = window.calculateMemberPoints(targetM, sD.teamEvents, bD.posts);
                                    if(Math.abs((targetM.score || 0) - calc) > 0.1) {
                                        targetM.score = calc;
                                        tx.update(docMembers, { members: mList, updatedAt: new Date().toISOString() });
                                        console.log("Verified & Synced Total Score for:", sid);
                                    }
                                }
                            });
                        } catch(e) { console.warn("Silent Sync failed", e); }
                    }
                }, 8000);

            }
        };

        docMembers.onSnapshot(snap => { 
            if(snap.exists) { 
                const d=snap.data(); 
                members=d.members||[]; 
                deletedMembers=d.deletedMembers||[]; 
                mileageStartDate = d.mileageStartDate || "2024-01-01";
                luckMileageAmount = typeof d.luckMileageAmount === 'number' ? d.luckMileageAmount : 10;
                luckMileageCount = typeof d.luckMileageCount === 'number' ? d.luckMileageCount : 2;
                accessLog = d.accessLog || {};
                
                // Ensure all members have up-to-date scores using the integrated engine
                let needsScoreSync = false;
                members.forEach(m => {
                    if (m.role === '파트너') return;
                    const freshScore = window.calculateMemberPoints(m);
                    if (Math.abs((m.score || 0) - freshScore) > 0.1) {
                        m.score = freshScore;
                        needsScoreSync = true;
                    }
                });
                
                if (needsScoreSync && window.isNoticeAdmin() && !window._isSyncingInit) {
                    window._isSyncingInit = true;
                    window.saveData('members', false);
                }

                window.updateDashboardMileageInfo();
                dbSizes.members = new Blob([JSON.stringify(snap.data())]).size; 
            } else { 
                members=[]; deletedMembers=[]; dbSizes.members=0;
            } 
            const sid=sessionStorage.getItem('sonamu_user_id'), sr=sessionStorage.getItem('sonamu_user_role'); 
            if(sid && sid!=='master') { 
                const fm=members.find(x=>x.id===sid); 
                if(!fm) return window.logout(); 
                if(fm.role!==sr) { sessionStorage.setItem('sonamu_user_role', fm.role); return window.location.reload(); } 
            } 
            checkInitComplete('members'); 
            if(document.documentElement.classList.contains('app-loaded')) {
                window.updateUI();
            }
        }, err => console.error(err));
        docFinance.onSnapshot(snap => { 
            if(snap.exists) { 
                const d=snap.data(); 
                transactions=d.transactions||[]; 
                deletedTransactions=d.deletedTransactions||[]; 
                specialDues=d.specialDues||[]; 
                reportNotes=d.reportNotes||{}; 
                dbSizes.finance=new Blob([JSON.stringify(d)]).size; 
            } else { 
                transactions=[]; deletedTransactions=[]; specialDues=[]; reportNotes={}; dbSizes.finance=0; 
            } 
            checkInitComplete('finance'); 
            if(document.documentElement.classList.contains('app-loaded')) window.updateUI(); 
        }, err => console.error(err));
        docSports.onSnapshot(async snap => {
            if(snap.exists) {
                const d = snap.data();
                let evts = d.teamEvents || [];
                matchHistory = d.matchHistory || [];
                luckyWinners = d.luckyWinners || {};
                calendarEvents = d.calendarEvents || [];
                dbSizes.sports = new Blob([JSON.stringify(snap.data())]).size;

                const td = window.getTodayString();
                const purgeDate = new Date(); 
                purgeDate.setDate(purgeDate.getDate() - 7);
                const purgeDateStr = new Date(purgeDate.getTime() - purgeDate.getTimezoneOffset()*60000).toISOString().substring(0,10);

                let needsRollover = false;
                let needsPurgeSettlement = false;
                let updatedMembers = [...(members || [])];

                // 1. [자동 롤오버] 날짜가 지난 반복 일정 처리
                evts.forEach(e => {
                    if (e.repeatMode && e.repeatMode !== 'none' && e.date && e.date < td) {
                        const nxt = window.getNextRecurringDate(e);
                        if (nxt && nxt >= td && e.date !== nxt) {
                            if (!e.pastVotes) e.pastVotes = {};
                            if (!e.pastVDates) e.pastVDates = {};
                            e.pastVotes[e.date] = e.votes || {};
                            e.pastVDates[e.date] = e.vDate || {};

                            // 기존 회차를 'isFinished' 스냅샷으로 복제하여 7일간 보관
                            const finishedSnapshot = {
                                ...JSON.parse(JSON.stringify(e)),
                                id: e.id + '_' + e.date,
                                originalId: e.id,
                                isFinished: true,
                                repeatMode: 'none', // 스냅샷은 반복 안 함
                                pastVotes: null, 
                                pastVDates: null
                            };
                            evts.push(finishedSnapshot);

                            // 원본 일정은 다음 날짜로 갱신
                            e.date = nxt;
                            e.votes = {};
                            e.vDate = {};
                            e.proxyVotes = {};
                            e.bracketMatches = [];
                            if (e.teams) e.teams.forEach(t => { ['spiker','setter','leftDef','rightDef','sub1','sub2'].forEach(p => t[p] = ''); });
                            needsRollover = true;
                        }
                    }
                });

                // 2. [Data Cleanup] 보존 정책 강화: 7일 지난 일정 삭제 로직 제거
                // (실시간 마일리지 집계 체계에서 데이터 삭제는 점수 하락을 의미하므로 무기한 보존)
                teamEvents = evts;


                // DB 업데이트 (조용히 처리 - Quiet Mode)
                if ((needsRollover || needsPurgeSettlement) && user) {
                    if (needsPurgeSettlement) {
                        members = updatedMembers;
                        await window.saveData('members', false); // No prompt
                    }
                    await window.saveData('sports', false); // No prompt
                }
            } else {
                teamEvents = []; matchHistory = []; dbSizes.sports = 0;
            }
            checkInitComplete('sports');
            if(document.documentElement.classList.contains('app-loaded')) window.updateUI();
        }, err => console.error(err));
        docBoard.onSnapshot(async snap => {
            if(snap.exists) {
                const d = snap.data();
                let ptsArray = d.posts || [];
                dbSizes.board = new Blob([JSON.stringify(snap.data())]).size;

                const td = window.getTodayString();
                const purgeDate = new Date(); 
                purgeDate.setDate(purgeDate.getDate() - 7);
                const purgeDateStr = new Date(purgeDate.getTime() - purgeDate.getTimezoneOffset()*60000).toISOString().substring(0,10);

                let needsPurgeSettlement = false;
                let updatedMembers = [...(members || [])];

                // [Data Cleanup] 보존 정책 강화: 7일 지난 투표 삭제 로직 제거
                posts = ptsArray;

                if (needsPurgeSettlement && user) {
                    members = updatedMembers;
                    await window.saveData('members', false);
                    await window.saveData('board', false);
                }
            } else {
                posts = []; dbSizes.board = 0;
            }
            checkInitComplete('board');
            if(document.documentElement.classList.contains('app-loaded')) window.updateUI();
        }, err => console.error(err));
        docGallery.onSnapshot(snap => { 
            if(snap.exists) { 
                const d=snap.data(); 
                // [강화] 필드명 혼용 방지 (레거시/백업 필드명 포괄 대응)
                let rawPhotos = d.photos || d.galleryPhotos || d.gallery || d.images || d.items || [];
                if (!Array.isArray(rawPhotos)) rawPhotos = Object.values(rawPhotos || {});
                galleryPhotos = rawPhotos;
                window.galleryPhotos = galleryPhotos;
                dbSizes.gallery = new Blob([JSON.stringify(snap.data())]).size; 
                
                // [중요] 최신 사진 수신 시 페이지 범위 검증 및 리셋
                const isMobile = window.innerWidth <= 768;
                const maxItems = isMobile ? 20 : 40;
                const totalPages = Math.ceil(galleryPhotos.length / maxItems) || 1;
                if(currentGalleryPage > totalPages) currentGalleryPage = 1;

                if(document.documentElement.classList.contains('app-loaded')) {
                    window.renderGallery();
                    if(window.updateDashboard) window.updateDashboard();
                }
            } else { 
                galleryPhotos=[]; 
                window.galleryPhotos = galleryPhotos;
                dbSizes.gallery=0; 
            } 
            checkInitComplete('gallery'); 
        }, err => console.error(err));

    } catch(e) { sUI('error'); setTimeout(window.startCloudSync, 5000); }
};

window.cleanupOldData = () => {
    if (sessionStorage.getItem('sonamu_user_id') !== 'master') return window.showAlert("마스터 권한이 필요합니다.");
    const yr=new Date().getFullYear()-3, cut=`${yr}-12-31`;
    window.showConfirm(`${yr}년 이전 데이터 정리?`, async ()=>{
        const ot=[], kt=[]; let oi=0, oe=0;
        (transactions||[]).forEach(t=>{ if((t.date||'')<=cut) ot.push(t); else kt.push(t); });
        ot.forEach(t=>{ 
            if(t.category==='income') oi+=Number(t.amount)||0; 
            else if(t.category==='expense') oe+=Number(t.amount)||0; 
        });
        if(oi>0) kt.push({ id:'tx_old_in_'+Date.now(), category:'income', name:'시스템', type:'이월금액', amount:oi, date:cut, note:'과거 압축' });
        if(oe>0) kt.push({ id:'tx_old_ex_'+Date.now(), category:'expense', name:'시스템', type:'식대', amount:oe, date:cut, note:'과거 압축' });
        let oldEvts = (teamEvents||[]).filter(e => (window.getNextRecurringDate(e)||e.date) <= cut);
        let oldPosts = (posts||[]).filter(p => (p.date||'') <= cut);

        (members || []).forEach(m => {
            if (m.role === '파트너') return;
            let carryoverPoints = 0;
            // 1. Team Events Points Calculation
            oldEvts.forEach(e => {
                const v = e.votes?.[m.id];
                if (v) {
                    const baseV = String(v).replace('_p', '');
                    if (baseV !== '미정' && baseV !== 'pending') carryoverPoints += 2;
                    if (baseV === '참석' || baseV === 'attend' || baseV === 'late' || baseV === '늦참') carryoverPoints += 3;
                }
                if (e.pastVotes) {
                    Object.values(e.pastVotes).forEach(pvMap => {
                        const pv = pvMap[m.id];
                        if (pv) {
                            const baseV = String(pv).replace('_p', '');
                            if (baseV !== '미정' && baseV !== 'pending') carryoverPoints += 2;
                            if (baseV === '참석' || baseV === 'attend' || baseV === 'late' || baseV === '늦참') carryoverPoints += 3;
                        }
                    });
                }
            });
            // 2. Posts Points Calculation
            oldPosts.forEach(p => {
                if (p.isEvent || p.isAnon) {
                    const v = p.votes?.[m.id];
                    if (v) {
                        const vArray = Array.isArray(v) ? v : [v];
                        const baseVArray = vArray.map(val => String(val).replace('_p', ''));
                        if (baseVArray.length > 0 && !baseVArray.includes('미정')) carryoverPoints += 2;
                    }
                }
            });

            if (carryoverPoints > 0) {
                if (!m.bonuses) m.bonuses = [];
                m.bonuses.push({
                    id: 'cleanup_mileage_' + yr + '_' + Date.now() + '_' + m.id,
                    amount: carryoverPoints,
                    note: `[시스템] ${yr}년 이전 활동 마일리지 소급 정산 (데이터 정리)`,
                    timestamp: Date.now()
                });
                // score는 getMemberCalculatedScore로 다시 집계되므로 별도 합산 불필요하지만 무결성을 위해 갱신
            }
        });

        transactions = kt; 
        matchHistory = (matchHistory||[]).filter(m => (m.date||'') > cut); 
        posts = (posts||[]).filter(p => (p.date||'') > cut); 
        specialDues = (specialDues||[]).filter(s => (s.date||'') > cut);
        teamEvents = (teamEvents||[]).filter(e => (window.getNextRecurringDate(e)||e.date) > cut);

        // 3. 사진 메타데이터 정리 (3년 이상)
        galleryPhotos = (galleryPhotos||[]).filter(p => {
             const ts = p.timestamp || 0;
             if(ts === 0) return true;
             return new Date(ts).toISOString().substring(0,10) > cut;
        });

        // 4. 휴지통 데이터(Recycle Bin) 완전 삭제 (3년 이상)
        deletedTransactions = (deletedTransactions||[]).filter(t => (t.deletedAt || t.date || "") > cut);
        deletedMembers = (deletedMembers||[]).filter(m => !m.deletedAt || m.deletedAt > cut);

        // 5. 접속 로그(Access Logs) 기한 경과분 삭제 (2년 보존)
        const logCut = (new Date().getFullYear()-2) + "-12-31";
        const newAccessLog = {};
        Object.keys(accessLog||{}).forEach(mid => {
             const hist = accessLog[mid] || [];
             const filtered = Array.isArray(hist) ? hist.filter(d => d > logCut) : (hist > logCut ? [hist] : []);
             if(filtered.length > 0) newAccessLog[mid] = filtered;
        });
        accessLog = newAccessLog;

        // 6. 회계 결산 메모 정리 (3년 이상)
        for(let key in reportNotes) { if(key.substring(0,4) < yr) delete reportNotes[key]; }

        // 업데이트된 멤버별 score 재계산 (데이터가 사라진 후의 총점 유지 확인)
        (members || []).forEach(m => {
            m.score = window.getMemberCalculatedScore(m, teamEvents, posts);
        });

        window.updateUI(); 
        await window.saveData('all', true); 
        window.showAlert("데이터베이스 최적화가 완료되었습니다.\n휴지통, 접속로그, 과거 메모 등을 모두 정리하여 안정성을 확보했습니다.");
    });
};

window.updateDashboardMileageInfo = () => {
    const el = window.$('dashboard-mileage-start-date');
    if(!el) return;
    const startD = mileageStartDate || '2024-01-01';
    let text = `${startD} 시행일 이후 마일리지 집계`;
    el.innerText = text;
    el.classList.remove('hidden');
};

window.updateMileageStartDate = (v) => {
    if(!v) return;
    window.showConfirm(`${v} 이후 데이터만 마일리지에 반영하도록 설정을 변경하시겠습니까?\n(모든 회원의 점수가 즉시 재계산됩니다)`, async () => {
        mileageStartDate = v;
        // 모든 멤버 점수 즉시 동기화
        members.forEach(m => {
            if(m.role !== '파트너') m.score = window.calculateMemberPoints(m);
        });
        await window.saveData('members', true);
        window.updateUI();
    });
};

// --- [초기화 실행부] ---
// Firebase 인증 상태 관찰 및 초기 데이터 동기화
auth.onAuthStateChanged(user => {
    console.log("[Auth] State changed:", user ? "Authenticated" : "Not Authenticated");
    if (user) {
        window.startCloudSync();
        // 세션 정보가 있을 경우 UI 즉시 전환 시도
        if (sessionStorage.getItem('sonamu_user_id')) {
            document.documentElement.classList.add('app-loaded');
            window.updateUI();
        }
    } else {
        // 비인증 상태 시 익명 로그인 (읽기 전용 보장)
        auth.signInAnonymously().catch(e => console.error("[Auth] Anonymous login failed:", e));
    }
});

// 페이지 로드 및 비상 탈출 로직
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOMContentLoaded");
    
    // [비상 탈출] 인증 성공 후 5초가 지났는데도 오버레이가 안 사라지면 강제 제거
    setTimeout(() => {
        if (sessionStorage.getItem('sonamu_user_id')) {
            console.warn("[Init] Emergency overlay removal triggered");
            document.documentElement.classList.add('app-loaded');
            window.updateUI();
        }
    }, 5000);
});
