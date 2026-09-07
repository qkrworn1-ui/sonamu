// --- [9. 탭: 수입/지출 및 특별회비] ---
window.updatePaidMonthsUI = () => {
    const n=window.$('income-member')?.value, y=window.$('income-target-year')?.value, a=window.$('income-account')?.value, cb=document.querySelectorAll('.income-month-cb');
    cb.forEach(c=>{ c.disabled=false; c.checked=false; c.parentElement.classList.remove('opacity-40'); });
    if(!n||!y||!(a==='월회비'||a==='면제')) return;
    
    // 가입일 이전 월 비활성화 처리
    const mem = (members || []).find(m => m.name === n);
    let joinYear = null, joinMonth = null;
    if (mem && mem.joinDate) {
        const parts = mem.joinDate.split('-');
        if (parts.length >= 2) {
            joinYear = parseInt(parts[0]);
            joinMonth = parseInt(parts[1]);
        }
    }

    let pm=new Set(), isY=false;
    (transactions||[]).filter(t=>t.category==='income'&&t.name===n).forEach(t=>{ const ty=t.targetYear?String(t.targetYear):String(t.date||'').substring(0,4); if(ty===String(y)){ if(String(t.type||'').includes('년회비')) isY=true; else if(Array.isArray(t.months)) t.months.forEach(m=>pm.add(parseInt(m))); } });
    
    cb.forEach((c,i)=>{
        const mVal = i + 1;
        // 이미 납부한 달인 경우
        if (isY || pm.has(mVal)) {
            c.checked = true;
            c.disabled = true;
            c.parentElement.classList.add('opacity-40');
        } 
        // 가입일 이전 연도/월인 경우 비활성화 (체크는 안 함)
        else if (joinYear !== null && joinMonth !== null) {
            const targetY = parseInt(y);
            if (targetY < joinYear || (targetY === joinYear && mVal < joinMonth)) {
                c.disabled = true;
                c.parentElement.classList.add('opacity-40');
            }
        }
    });
};
window.autoPrice = () => { const a=window.$('income-account')?.value, iF=a==='월회비'||a==='년회비'||a?.includes('면제'), iM=a==='월회비'||a==='면제'; window.$('month-selector-container')?.classList.toggle('hidden',!iM); window.$('year-selector-container')?.classList.toggle('hidden',!iF); if(iM) window.setVal('income-amount',a==='월회비'?20000*Array.from(document.querySelectorAll('.income-month-cb:checked:not(:disabled)')).length:0); else window.setVal('income-amount',a==='년회비'?200000:(a?.includes('면제')?0:'')); };
window.updateMemberSelect = () => { window.setHtml('income-member', '<option value="">선택</option>'+(members||[]).filter(m=>m.role!=='파트너' && m.role!=='준회원' && m.role!=='초청선수').map(m=>`<option value="${m.name}">${m.name}</option>`).join('')); const mc=window.$('month-checkboxes'); if(mc&&!mc.innerHTML) window.setHtml('month-checkboxes', Array.from({length:12},(_,i)=>`<label class="flex flex-col items-center bg-white border p-1.5 rounded"><input type="checkbox" class="income-month-cb" value="${i+1}" onchange="window.autoPrice()"><span class="text-xs">${i+1}월</span></label>`).join('')); window.updatePaidMonthsUI(); };
window.resetTransactionForm = c => { 
    editingTransactionId=null; 
    window.setVal(c+'-member'); window.setVal(c+'-account'); window.$(c+'-account')?.classList.add('hidden'); 
    window.setVal(c+'-amount'); window.setVal(c+'-note'); window.$('btn-'+c+'-cancel')?.classList.add('hidden'); 
    const b=window.$('btn-'+c+'-submit'); if(b) b.innerText='등록'; 
    const ad=window.$(`btn-${c}-account`)?.querySelector('span') || window.$(`${c}-account-display`);
    if(ad) { ad.innerText='항목 선택'; window.$(`btn-${c}-account`)?.classList.add('text-slate-400'); window.$(`btn-${c}-account`)?.classList.remove('text-slate-800'); }
    if(c==='expense') window.clearReceipt();
    if(c==='income'){ 
        const md=window.$('income-member-display'); 
        const mb=window.$('btn-income-member');
        if(md){ md.innerText='회원 선택'; } 
        if(mb){ mb.classList.add('text-slate-400'); mb.classList.remove('text-slate-800', 'opacity-50', 'pointer-events-none', 'bg-slate-50'); }
        document.querySelectorAll('.income-month-cb').forEach(cb=>{cb.checked=false;cb.disabled=false;cb.parentElement.classList.remove('opacity-40');}); 
        window.$('income-note')?.classList.add('hidden'); window.autoPrice();
    } 
};
window.addTransaction = async c => {
    if(c==='income' && !window.isFinanceAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(c==='expense' && !window.isExpenseAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; 
    const n=window.$(c+'-member')?.value, a=window.$(c+'-account')?.value, am=window.$(c+'-amount')?.value, d=window.$(c+'-date')?.value, no=window.$(c+'-note')?.value;
    if(c==='income' && (!a || !am || (!a.includes('특별찬조') && a !== '직접입력' && a !== '은행이자및캐쉬백' && a !== '상금/대체입금' && !n))) return window.showAlert("입력 부족 (항목, 금액, 회원을 확인해주세요)");
    if(c==='expense' && (!a || !am)) return window.showAlert("입력 부족");
    if(parseInt(am) < 0) return window.showAlert("금액은 0보다 커야 합니다.");
    window.isSavingData = true; let txName = n;
    // 회원 드롭다운이 남아있어도 공용 자금 성격인 경우 강제로 덮어쓰기
    if (c === 'income') {
        if (a === '은행이자및캐쉬백' || a === '상금/대체입금') {
            txName = '시스템';
        } else if (a.includes('특별찬조')) {
            txName = '비회원';
        } else if (!n && a === '직접입력') {
            txName = '비회원';
        }
    }
    let tx={id:editingTransactionId||'tx_'+Date.now(), category:c, name:txName||'', type:a, amount:parseInt(am)||0, date:d||window.getTodayString(), note:no||''};
    
    // [추가] 영수증 업로드 로직
    if(c==='expense') {
        const fileInput = window.$('expense-receipt');
        if(fileInput && fileInput.files[0]) {
            try {
                const file = fileInput.files[0];
                const btn = window.$('btn-expense-submit');
                if(btn) btn.innerText = '업로드 중...';
                
                // 기존 사진이 있다면 삭제 (수정 시)
                if(editingTransactionId) {
                    const oldTx = (transactions||[]).find(x=>x.id===editingTransactionId);
                    if(oldTx && oldTx.receiptPath) {
                        try { await storage.ref().child(oldTx.receiptPath).delete(); } catch(e) {}
                    }
                }

                const blob = await window.resizeImage(file, 1200);
                const path = `receipts/${tx.id}_${Date.now()}.jpg`;
                const ref = storage.ref().child(path);
                await ref.put(blob);
                tx.receiptUrl = await ref.getDownloadURL();
                tx.receiptPath = path;
            } catch(e) {
                console.error("Receipt upload failed:", e);
                window.showAlert("영수증 업로드에 실패했습니다. (나중에 다시 시도하거나 사진 없이 등록 가능)");
            }
        } else if(editingTransactionId) {
            // 수정 시 사진을 건드리지 않았다면 기존 정보 유지
            const oldTx = (transactions||[]).find(x=>x.id===editingTransactionId);
            if(oldTx && oldTx.receiptUrl) {
                tx.receiptUrl = oldTx.receiptUrl;
                tx.receiptPath = oldTx.receiptPath;
            }
        }
    }

    if(c==='income') { const iF=a==='월회비'||a==='년회비'||a.includes('면제'), iM=a==='월회비'||a==='면제'; if(iF) tx.targetYear=window.$('income-target-year')?.value||new Date().getFullYear(); if(iM) { let m=Array.from(document.querySelectorAll('.income-month-cb:checked:not(:disabled)')).map(cb=>cb.value); if(!m.length) { window.isSavingData = false; return window.showAlert("월 선택 필요"); } tx.months=m; } }
    if(editingTransactionId) transactions=(transactions||[]).map(t=>t.id===editingTransactionId?tx:t); else transactions.push(tx);
    window.resetTransactionForm(c); window.updateUI(); await window.saveData('finance', true); window.isSavingData = false;
};
window.deleteTransaction = async id => { 
    const t=(transactions||[]).find(x=>x.id===id); 
    if(!t) return;
    if(t.category==='income' && !window.isFinanceAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(t.category==='expense' && !window.isExpenseAdmin()) { window.showAlert("권한이 없습니다."); return; }
    window.showConfirm("삭제하시겠습니까?", async ()=>{ 
        if(window.isSavingData) return; window.isSavingData=true; 
        const t=(transactions||[]).find(x=>x.id===id); 
        if(t){
            // 영수증 파일이 있으면 함께 삭제 시도 (실패해도 내역은 삭제)
            if(t.receiptPath) {
                try { await storage.ref().child(t.receiptPath).delete(); } catch(e) { console.warn("Receipt delete failed", e); }
            }
            deletedTransactions.push({...t,deletedAt:new Date().toLocaleString()}); 
            transactions=(transactions||[]).filter(x=>x.id!==id); 
            if(id.startsWith('tx_sd_')) {
                const sdId = id.substring(3, id.lastIndexOf('_'));
                const mName = t.name;
                const sd = (specialDues||[]).find(x => x.id === sdId);
                if (sd && sd.paids) sd.paids = sd.paids.filter(x => x !== mName);
            }
            window.updateUI(); await window.saveData('finance', true);
        } 
        window.isSavingData=false; 
    }); 
};
window.editTransaction = id => {
    const t = (transactions || []).find(x => x.id === id);
    if (!t) return;

    const c = t.category;
    editingTransactionId = id;

    // 탭 전환
    if (typeof window.switchFinanceTab === 'function') window.switchFinanceTab(c);

    // 공통 필드 채우기
    window.setVal(c + '-amount', t.amount);
    window.setVal(c + '-date', t.date);
    window.setVal(c + '-note', t.note || '');

    // 항목(계정) 처리
    const accInput = window.$(c + '-account');
    const accDisplay = window.$(c + '-account-display');
    const accBtn = window.$(`btn-${c}-account`);
    
    if (accInput && accDisplay) {
        const incomeList = ['월회비', '년회비', '찬조금(회원)', '특별찬조(비회원)', '면제', '식대(개별납부)', '은행이자및캐쉬백', '상금/대체입금', '직접입력'];
        const expenseList = ['식대', '생수및간식', '용품', '대한족구협회비', '구리시족구협회비', '찬조금', '경조사비', '행사준비비', '직접입력'];
        const list = c === 'income' ? incomeList : expenseList;
        
        if (list.includes(t.type)) {
            accInput.value = t.type;
            accDisplay.innerText = t.type;
            accInput.classList.add('hidden');
        } else {
            accInput.value = t.type;
            accDisplay.innerText = '직접입력';
            accInput.classList.remove('hidden');
        }
        if(accBtn) { accBtn.classList.remove('text-slate-400'); accBtn.classList.add('text-slate-800'); }
    }

    if (c === 'income') {
        window.setVal('income-member', t.name);
        const memDisplay = window.$('income-member-display');
        const memBtn = window.$('btn-income-member');
        if (memDisplay) memDisplay.innerText = t.name || '회원 선택';
        
        if (String(t.type).includes('특별찬조') || t.type === '은행이자및캐쉬백' || t.type === '상금/대체입금') {
            if(memBtn) memBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-slate-50');
        } else {
            if(memBtn) memBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-slate-50');
        }

        if (t.targetYear) window.setVal('income-target-year', t.targetYear);
        
        // 월 선택 처리
        document.querySelectorAll('.income-month-cb').forEach(cb => {
            cb.checked = (t.months || []).includes(cb.value);
            cb.disabled = false;
            cb.parentElement.classList.remove('opacity-40');
        });
        
        window.autoPrice();
        
        const noteEl = window.$('income-note');
        if (noteEl) {
            if(String(t.type).includes('특별찬조') || String(t.type).includes('찬조금') || t.type === '직접입력' || String(t.type).includes('식대') || t.type === '은행이자및캐쉬백' || t.type === '상금/대체입금' || t.note) {
                noteEl.classList.remove('hidden');
                noteEl.placeholder = String(t.type).includes('비회원') ? '비고 (성명, 내역 등 기재)' : (t.type === '상금/대체입금' ? '비고 (대회명, 입금자명, 내역 등 기재)' : (t.type === '은행이자및캐쉬백' ? '비고 (예금이자, 캐쉬백 등)' : '비고 (내용 등)'));
            } else {
                noteEl.classList.add('hidden');
            }
        }
    } else if (c === 'expense') {
        if (t.receiptUrl) {
            const preview = window.$('receipt-preview-img');
            const container = window.$('receipt-preview-container');
            const filename = window.$('receipt-filename');
            const clearBtn = window.$('btn-receipt-clear');
            if (preview) preview.src = t.receiptUrl;
            if (container) container.classList.remove('hidden');
            if (filename) filename.innerText = '첨부된 영수증 있음';
            if (clearBtn) clearBtn.classList.remove('hidden');
        } else {
            window.clearReceipt();
        }
    }

    const submitBtn = window.$('btn-' + c + '-submit');
    if (submitBtn) submitBtn.innerText = '수정 완료';
    window.$('btn-' + c + '-cancel')?.classList.remove('hidden');

    window.scrollTo({ top: window.$(c + '-view').offsetTop - 100, behavior: 'smooth' });
};
window.restoreTransaction = async id => { 
    if(window.isSavingData) return; window.isSavingData=true; 
    const t=(deletedTransactions||[]).find(x=>x.id===id); 
    if(t){
        delete t.deletedAt; transactions.push(t); 
        deletedTransactions=(deletedTransactions||[]).filter(x=>x.id!==id); 
        if(id.startsWith('tx_sd_')) {
            const sdId = id.substring(3, id.lastIndexOf('_'));
            const mName = t.name;
            const sd = (specialDues||[]).find(x => x.id === sdId);
            if (sd) {
                if(!sd.paids) sd.paids = [];
                if(!sd.paids.includes(mName)) sd.paids.push(mName);
            }
        }
        window.updateUI(); await window.saveData('finance', true);
    } 
    window.isSavingData=false; 
};
window.toggleTrash = t => { isShowingTrash[t] = !isShowingTrash[t]; window.updateUI(); };
window.changeLedgerMonth = d => { let [y,m]=currentLedgerMonthStr.split('-').map(Number); m+=d; if(m>12){m=1;y++;} if(m<1){m=12;y--;} currentLedgerMonthStr=`${y}-${String(m).padStart(2,'0')}`; document.querySelectorAll('.ledger-month-display').forEach(el=>el.innerText=currentLedgerMonthStr); window.renderTransactionLists(); };
window.emptyTrash = async c => { 
    window.showConfirm("영구 삭제하시겠습니까?", async ()=>{ 
        if(window.isSavingData) return; window.isSavingData=true; 
        if(c === 'member') {
            deletedMembers = [];
            window.renderMemberList();
            await window.saveData('members');
        } else {
            deletedTransactions=(deletedTransactions||[]).filter(t=>t.category!==c); 
            window.renderTransactionLists(); 
            await window.saveData('finance'); 
        }
        window.isSavingData=false; 
    }); 
};

window.renderTransactionLists = () => {
    // [수정] 통장 잔고 및 장부 목록에서 파트너 필터링(isNP)을 제거하여 클럽의 모든 입출금 내역을 투명하게 공개함.
    const ti=(transactions||[]).filter(t=>t.category==='income').reduce((s,t)=>s+(Number(t.amount)||0),0), te=(transactions||[]).filter(t=>t.category==='expense').reduce((s,t)=>s+(Number(t.amount)||0),0), bb=ti-te;
    const iBal = window.$('income-bank-balance-display'), eBal = window.$('expense-bank-balance-display'), sBal = window.$('summary-balance');
    const sMem = window.$('summary-members'), sInc = window.$('summary-income'), sExp = window.$('summary-expense');
    const balanceStr = bb.toLocaleString() + '원';
    if(iBal) iBal.innerText = balanceStr; 
    if(eBal) eBal.innerText = balanceStr;
    if(sBal) sBal.innerText = balanceStr;
    
    // [추가] 대시보드 상단 요약 정보 업데이트
    if(sMem) sMem.innerText = (members||[]).length + '명';
    const cm = window.getTodayString().substring(0, 7);
    const mInc = (transactions||[]).filter(t=>t.category==='income'&&String(t.date||'').startsWith(cm)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    const mExp = (transactions||[]).filter(t=>t.category==='expense'&&String(t.date||'').startsWith(cm)).reduce((s,t)=>s+(Number(t.amount)||0),0);
    if(sInc) sInc.innerText = mInc.toLocaleString() + '원';
    if(sExp) sExp.innerText = mExp.toLocaleString() + '원';
    document.querySelectorAll('.ledger-month-display').forEach(el=>el.innerText=currentLedgerMonthStr);

    let currentBal = 0;
    const sortedAll = [...(transactions||[])].filter(t => t.category === 'income' || t.category === 'expense').sort((a,b) => {
        const c1 = String(a.date||'').localeCompare(String(b.date||''));
        if (c1 !== 0) return c1;
        if (a.category !== b.category) return a.category === 'income' ? -1 : 1;
        return String(a.id||'').localeCompare(String(b.id||''));
    });
    const balanceMap = {};
    sortedAll.forEach(t => {
        if (t.category === 'income') currentBal += (Number(t.amount) || 0);
        else if (t.category === 'expense') currentBal -= (Number(t.amount) || 0);
        balanceMap[t.id] = currentBal;
    });

    const isMobile = window.innerWidth <= 640;
    ['income','expense'].forEach(c=>{
        const isE=c==='expense', cl=isE?'red':'blue';
        if(isShowingTrash[c]) {
            window.setHtml(c+'-thead', `<tr><th colspan="4" class="p-3 bg-red-50 text-red-500 font-black">휴지통 <button onclick="window.emptyTrash('${c}')" class="ml-2 bg-red-600 text-white px-2 py-1 rounded">비우기</button></th></tr>`);
            const d=(deletedTransactions||[]).filter(t=>t.category===c);
            window.setHtml(c+'-list-body', d.length?d.map(t=>`<tr class="bg-red-50 border-b"><td class="p-3 text-center">${t.date||'-'}</td><td class="p-3 text-center font-black">${isE?t.type:t.name}</td><td class="p-3 text-center text-xs">${isE?(t.note||'-'):t.type}</td><td class="p-3 text-center"><button onclick="window.restoreTransaction('${t.id}')" class="bg-blue-100 text-blue-700 px-3 rounded">복구</button></td></tr>`).join(''):`<tr><td colspan="4" class="p-10 text-center text-slate-400">비어 있음</td></tr>`);
        } else {
            if (isMobile) {
                window.setHtml(c+'-thead', `<tr><th class="p-3 bg-slate-800 text-white text-[11px] font-black tracking-widest uppercase">${isE?'지출':'수입'} 장부 (모바일 최적화)</th></tr>`);
            } else {
                window.setHtml(c+'-thead', `<tr><th class="p-3">날짜</th><th class="p-3">${isE?'항목':'성명'}</th><th class="p-3">${isE?'메모':'계정'}</th><th class="p-3 text-right">금액/잔액</th></tr>`);
            }
            const ls=(transactions||[]).filter(t=>t.category===c&&String(t.date||'').startsWith(currentLedgerMonthStr));
            window.setText(c+'-total-display', ls.reduce((s,t)=>s+(Number(t.amount)||0),0).toLocaleString());
            window.setHtml(c+'-list-body', ls.length?ls.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(t=>{
                let dt=window.escapeHtml(t.type||'');
                let rawDt = dt;
                if(dt.includes('특별찬조')) dt = `<span class="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded">${dt}</span>`;
                else if(dt.includes('찬조금')) dt = `<span class="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1 rounded">${dt}</span>`;
                else if(dt.includes('식대')) dt = `<span class="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-1 rounded">${dt}</span>`;
                else if(dt.includes('은행이자')) dt = `<span class="text-[9px] bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-1 rounded">${dt}</span>`;
                
                // [NEW] 지난년도 회비 납부 건 처리 (해당년도 뱃지 표시)
                const txYear = String(t.date||'').substring(0, 4);
                const targetY = t.targetYear ? String(t.targetYear) : txYear;
                const isDiffYear = c === 'income' && targetY && targetY !== txYear;
                
                let monthInfo = '';
                if (c === 'income' && (t.months||[]).length) {
                    if (isDiffYear) {
                        monthInfo = ` <span class="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 px-1 py-0.5 rounded font-black">[${targetY}년] ${t.months.join(',')}월</span>`;
                    } else {
                        monthInfo = ` <span class="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-1 py-0.5 rounded font-bold">${t.months.join(',')}월</span>`;
                    }
                } else if (isDiffYear && (rawDt.includes('회비') || rawDt.includes('면제'))) {
                    monthInfo = ` <span class="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 px-1 py-0.5 rounded font-black">[${targetY}년도]</span>`;
                }

                const receiptBtn = t.receiptUrl ? `<button onclick="window.viewReceipt('${t.receiptUrl}')" class="text-indigo-500 hover:text-indigo-700 active:scale-95 transition-all p-1" title="영수증 보기"><i data-lucide="image" class="w-4 h-4"></i></button>` : '';
                if (isMobile) {
                    return `<tr class="bg-white border-b">
                        <td class="p-4 flex flex-col gap-2">
                            <div class="flex justify-between items-start">
                                <div class="flex flex-col gap-1">
                                    <div class="text-[10px] font-black text-slate-700">${t.date||'-'}</div>
                                    <div class="font-black text-[13px] ${isE?'text-rose-600':'text-slate-800'} flex items-center gap-1.5">${isE?window.escapeHtml(t.type||'-'):window.escapeHtml(t.name||'-')} ${receiptBtn}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-black text-sm text-${cl}-600">${(Number(t.amount)||0).toLocaleString()}원</div>
                                    <div class="text-[10px] font-black text-slate-500 mt-0.5 tracking-tighter">잔액 ${(balanceMap[t.id]||0).toLocaleString()}원</div>
                                    <div class="text-[9px] font-bold text-slate-400 mt-0.5">${dt}${monthInfo}</div>
                                </div>
                            </div>
                            ${t.note ? `<div class="bg-slate-50 p-2 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-100 mt-1"><i data-lucide="info" class="w-3 h-3 inline mr-1 opacity-50"></i> ${window.escapeHtml(t.note)}</div>` : ''}
                            ${(isE?window.isExpenseAdmin():window.isFinanceAdmin()) ? `<div class="flex justify-end gap-2 pt-1">
                                <button onclick="window.editTransaction('${t.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black btn-touch border border-indigo-100">내역 수정</button>
                                <button onclick="window.deleteTransaction('${t.id}')" class="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black btn-touch border border-slate-200">내역 삭제</button>
                            </div>` : ''}
                        </td>
                    </tr>`;
                }
                dt += monthInfo;
                if (c==='income' && t.note) dt += ` <div class="text-[10px] text-slate-400 mt-0.5">${window.escapeHtml(t.note)}</div>`;
                return `<tr class="bg-white border-b"><td class="p-3 text-center text-xs text-slate-500">${String(t.date||'-')}</td><td class="p-3 text-center font-black ${isE?'text-red-600':''} flex items-center justify-center gap-1.5">${isE?window.escapeHtml(t.type||'-'):window.escapeHtml(t.name||'-')} ${receiptBtn}</td><td class="p-3 text-center text-xs text-slate-600">${isE?window.escapeHtml(t.note||'-'):dt}</td><td class="p-3 text-right whitespace-nowrap"><div class="font-black text-${cl}-600">${(Number(t.amount)||0).toLocaleString()}원</div><div class="text-[11px] font-bold text-slate-500 mt-0.5 tracking-tighter">잔액 ${(balanceMap[t.id]||0).toLocaleString()}원</div>${(isE?window.isExpenseAdmin():window.isFinanceAdmin())?`<div class="mt-1 flex justify-end gap-1"><button onclick="window.editTransaction('${t.id}')" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] btn-touch border border-indigo-100">수정</button><button onclick="window.deleteTransaction('${t.id}')" class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] btn-touch border border-slate-200">삭제</button></div>`:''}</td></tr>`;
            }).join(''):`<tr><td colspan="4" class="p-10 text-center text-slate-700 font-black">내역 없음</td></tr>`);
        }
    });
    if(window.lucide) window.lucide.createIcons();
};

window.renderSpecialDues = () => {
    const list = window.$('special-dues-list');
    if(!list) return;
    const dues = (specialDues||[]).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const activeDues = dues.filter(d=>!d.isClosed);
    const closedDues = dues.filter(d=>d.isClosed);
    const targetDues = isShowingClosedDues ? closedDues : activeDues;
    
    list.innerHTML = targetDues.length ? targetDues.map(d=>{
        const paidCount = (d.paids||[]).length;
        const totalCount = (d.targets||[]).length;
        const pct = totalCount ? Math.round((paidCount/totalCount)*100) : 0;
        
        let targetsHtml = `<div class="mt-3 pt-3 border-t border-blue-200/60 flex flex-wrap gap-1.5">`;
        (d.targets||[]).forEach(tn => {
            const isPaid = (d.paids||[]).includes(tn);
            const btnClass = isPaid ? 'bg-blue-500 text-white border-blue-600 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600';
            targetsHtml += `<button onclick="window.toggleSpecialDuesPaid('${d.id}', '${tn}')" class="text-[10px] px-2 py-1 rounded-lg border font-black transition-all btn-touch ${btnClass}" ${d.isClosed ? 'disabled' : ''}>${tn}</button>`;
        });
        targetsHtml += `</div>`;

        return `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-xl flex flex-col gap-2 shadow-sm mb-3">
            <div class="flex justify-between items-start">
                <div class="font-black text-blue-900 dark:text-blue-200">${d.title} <span class="text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/40 px-1.5 rounded ml-1">${(Number(d.amount)||0).toLocaleString()}원</span></div>
                <div class="text-[10px] text-blue-800 font-black">${d.date||'-'}</div>
            </div>
            <div class="w-full bg-blue-200 dark:bg-blue-800 h-2.5 rounded-full overflow-hidden mb-1"><div class="bg-blue-600 h-full transition-all" style="width:${pct}%"></div></div>
            <div class="flex justify-between items-center">
                <div class="text-xs font-black text-blue-700 dark:text-blue-300">납부 ${paidCount}명 / 총 ${totalCount}명</div>
                <div class="flex gap-1.5">
                    ${!d.isClosed ? `<button onclick="window.openSpecialDuesModal('${d.id}')" class="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-1 rounded shadow-sm btn-touch">수정/인원추가</button>` : ''}
                    ${!d.isClosed ? `<button onclick="window.closeSpecialDues('${d.id}')" class="text-[10px] bg-slate-700 text-white px-2 py-1 rounded shadow-sm btn-touch">마감</button>` : `<button onclick="window.openSpecialDues('${d.id}')" class="text-[10px] bg-slate-500 text-white px-2 py-1 rounded shadow-sm btn-touch">재오픈</button>`}
                    <button onclick="window.deleteSpecialDues('${d.id}')" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded shadow-sm btn-touch">삭제</button>
                </div>
            </div>
            ${targetsHtml}
        </div>`;
    }).join('') : `<div class="text-center py-6 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">청구 내역 없음</div>`;
};

window.toggleSpecialDuesPaid = async (dueId, memberName) => {
    if(window.isSavingData) return; window.isSavingData = true;
    const sd = (specialDues||[]).find(x => x.id === dueId);
    if(!sd || sd.isClosed) { window.isSavingData = false; return; }

    if(!sd.paids) sd.paids = [];
    const txId = 'tx_' + sd.id + '_' + memberName;

    if(sd.paids.includes(memberName)) {
        sd.paids = sd.paids.filter(x => x !== memberName);
        const txToDel = (transactions||[]).find(x => x.id === txId);
        if (txToDel) {
            deletedTransactions.push({...txToDel, deletedAt: new Date().toLocaleString()});
        }
        transactions = (transactions||[]).filter(x => x.id !== txId);
    } else {
        sd.paids.push(memberName);
        transactions.push({
            id: txId,
            category: 'income',
            name: memberName,
            type: '[특별청구] ' + sd.title,
            amount: parseInt(sd.amount) || 0,
            date: window.getTodayString(),
            note: ''
        });
    }

    window.updateUI();
    await window.saveData('finance', true);
    window.isSavingData = false;
};

window.toggleClosedSpecialDues = () => { isShowingClosedDues = !isShowingClosedDues; const b=window.$('btn-toggle-closed-dues'); if(b) b.innerText=isShowingClosedDues?'진행 내역':'마감 내역'; window.renderSpecialDues(); };

window.openSpecialDuesModal = (editId = null) => {
    editingSpecialDueId = typeof editId === 'string' ? editId : null;
    const m = window.$('special-dues-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => m.classList.add('opacity-100'), 10); }
    
    let defaultTitle = '', defaultAmount = '';
    let targetMembers = [];
    
    if (editingSpecialDueId) {
        const sd = (specialDues||[]).find(x => x.id === editingSpecialDueId);
        if (sd) {
            defaultTitle = sd.title;
            defaultAmount = sd.amount;
            targetMembers = sd.targets || [];
        }
    }
    
    window.setVal('sd-title', defaultTitle); 
    window.setVal('sd-amount', defaultAmount);
    
    window.setHtml('sd-member-list', window.getSortedMembers().filter(x=>x.role!=='파트너' && x.role!=='준회원' && x.role!=='초청선수').map(x=>{
        const isChecked = targetMembers.includes(x.name) ? 'checked' : '';
        return `<label class="flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 shadow-sm p-2.5 rounded-lg text-[11px] font-black hover:border-blue-400 transition-colors"><input type="checkbox" class="sd-member-cb w-4 h-4 accent-blue-600" value="${x.name}" ${isChecked}> ${x.name}</label>`;
    }).join(''));
};

window.toggleAllSdMembers = () => {
    const cbs = document.querySelectorAll('.sd-member-cb');
    const allChecked = Array.from(cbs).every(c => c.checked);
    cbs.forEach(c => c.checked = !allChecked);
};

window.saveSpecialDues = async () => {
    if(!window.isFinanceAdmin() && !window.isNoticeAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true;
    const t=window.$('sd-title').value.trim(), aRaw=window.$('sd-amount').value;
    const targets = Array.from(document.querySelectorAll('.sd-member-cb:checked')).map(c=>c.value);
    if(!t || !aRaw || !targets.length) { window.isSavingData=false; return window.showAlert("제목, 금액, 대상자를 모두 입력하세요."); }
    
    const a = parseInt(aRaw.replace(/[^0-9]/g, '')) || 0;

    if (editingSpecialDueId) {
        const sd = specialDues.find(x => x.id === editingSpecialDueId);
        if (sd) {
            const finalTargets = [...new Set([...targets, ...(sd.paids||[])])];
            sd.title = t;
            sd.amount = a;
            sd.targets = finalTargets;
            
            (sd.paids || []).forEach(tn => {
                const txId = 'tx_' + sd.id + '_' + tn;
                const tx = transactions.find(x => x.id === txId);
                if (tx) {
                    tx.amount = a;
                    tx.type = '[특별청구] ' + t;
                }
            });
        }
    } else {
        specialDues.push({ id:'sd_'+Date.now(), title:t, amount:a, targets:targets, paids:[], date:window.getTodayString(), isClosed:false });
    }
    
    window.closeSpecialDuesModal(); window.updateUI(); await window.saveData('finance', true); window.isSavingData = false;
};

window.closeSpecialDues = async id => { if(window.isSavingData) return; window.isSavingData=true; const d=(specialDues||[]).find(x=>x.id===id); if(d){d.isClosed=true; window.updateUI(); await window.saveData('finance');} window.isSavingData=false; };
window.openSpecialDues = async id => { if(window.isSavingData) return; window.isSavingData=true; const d=(specialDues||[]).find(x=>x.id===id); if(d){d.isClosed=false; window.updateUI(); await window.saveData('finance');} window.isSavingData=false; };
window.deleteSpecialDues = async id => { 
    window.showConfirm("청구 내역을 삭제하시겠습니까?\n(해당 청구서로 납부된 수입장부 내역도 모두 함께 삭제됩니다)", async ()=>{ 
        if(window.isSavingData) return; window.isSavingData=true; 
        const txsToDelete = (transactions||[]).filter(x => x.id.startsWith('tx_' + id + '_'));
        txsToDelete.forEach(t => deletedTransactions.push({...t, deletedAt: new Date().toLocaleString()}));
        transactions = (transactions||[]).filter(x => !x.id.startsWith('tx_' + id + '_'));
        specialDues=(specialDues||[]).filter(x=>x.id!==id); 
        window.updateUI(); await window.saveData('finance', true); window.isSavingData=false; 
    }); 
};

// --- Member Management ---
window.togglePartners = () => { isShowingPartners = window.$('show-partners-cb')?.checked; window.renderMemberList(); };

window.renderMemberList = () => {
    const isTrash = isShowingTrash['member'];
    const list = isTrash ? (deletedMembers||[]) : (members||[]);
    const filteredList = isShowingPartners ? list.filter(m => m.role !== '초청선수') : list.filter(m => m.role !== '파트너' && m.role !== '초청선수');
    const sList = window.getSortedMembers(filteredList);
    
    const isMobile = window.innerWidth <= 640;
    const isDark = document.documentElement.classList.contains('dark');
    const nameStyle = isDark ? 'color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;' : 'color: #0f172a !important; -webkit-text-fill-color: #0f172a !important;';
    const thead = window.$('member-thead');
    if (isTrash) {
        thead.innerHTML = `<tr><th colspan="7" class="p-2 sm:p-3 bg-red-50 dark:bg-red-950/40 text-red-500 font-black text-[11px] sm:text-sm">삭제된 회원 <button onclick="window.emptyTrash('member')" class="ml-2 bg-red-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs btn-touch shadow-sm">완전 비우기</button></th></tr>`;
    } else if (isMobile) {
        thead.innerHTML = `<tr><th class="p-3 bg-slate-800 dark:bg-slate-950 text-white text-[11px] font-black tracking-widest uppercase">명단 (세로보기 최적화)</th></tr>`;
    } else {
        thead.innerHTML = `<tr><th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 text-[10px] sm:text-xs whitespace-nowrap">No</th><th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 text-left text-[10px] sm:text-xs whitespace-nowrap">회원정보</th><th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 hidden md:table-cell text-[10px] sm:text-xs whitespace-nowrap">연락처</th><th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 hidden lg:table-cell text-[10px] sm:text-xs whitespace-nowrap">가입일</th><th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 text-[10px] sm:text-xs whitespace-nowrap">포지션</th>${window.isFullAdmin()?`<th class="p-1 sm:p-3 border-b border-slate-700 dark:border-slate-800 text-right text-[10px] sm:text-xs whitespace-nowrap">관리</th>`:''}</tr>`;
    }

    window.setHtml('member-list-body', sList.length ? sList.map((m,i) => {
        const displayNo = m.backNo ? String(m.backNo).padStart(2, '0') : '00';
        const backNoHtml = `<span class="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded mr-1.5 font-black whitespace-nowrap inline-block text-center min-w-[34px] sm:min-w-[42px] tracking-tighter">No.${displayNo}</span>`;
        if(isTrash) {
            return `<tr class="bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/40"><td class="p-1.5 sm:p-3 text-center text-slate-500 dark:text-slate-400 font-black text-[10px] sm:text-xs">${i+1}</td><td class="p-1.5 sm:p-3 font-black text-slate-800 dark:text-slate-100 text-left flex items-center text-[11px] sm:text-sm whitespace-nowrap">${backNoHtml}<span class="member-name font-black" style="${nameStyle}">${window.escapeHtml(m.name)}</span> <span class="text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-normal ml-1 text-slate-600 dark:text-slate-300">${window.escapeHtml(m.role)}</span></td><td colspan="4" class="p-1.5 sm:p-3 text-right whitespace-nowrap"><button onclick="window.restoreMember('${m.id}')" class="bg-blue-600 text-white px-2 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black shadow-sm btn-touch">계정 복구</button></td></tr>`;
        }
        const rp = m.role==='파트너';
        const color = roleColors[m.role] || '#334155';
        if (isMobile) {
            return `<tr class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="p-4 flex flex-col gap-3">
                    <div class="flex justify-between items-center mb-1">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[10px] font-black text-slate-400">#${i+1}</span>
                            <div class="font-black text-slate-900 dark:text-white text-sm flex items-center">${backNoHtml}<span class="member-name font-black" style="${nameStyle}">${window.escapeHtml(m.name)}</span></div>
                            <div class="text-[11px] px-1.5 py-0.5 rounded font-black text-white shadow-sm leading-none" style="background-color:${color}">${window.escapeHtml(m.role)}</div>
                        </div>
                        <div class="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50 shadow-sm">${window.escapeHtml(m.phone||'-')}</div>
                    </div>
                    <div class="flex items-center gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <div class="flex items-center gap-1"><i data-lucide="volleyball" class="w-3 h-3 text-slate-400"></i> ${m.position || '미지정'}</div>
                        <div class="flex items-center gap-1">
                            <i data-lucide="award" class="w-3 h-3 text-slate-400"></i> 
                            ${m.division ? `<span class="text-[9px] font-black border px-1.5 py-0.5 rounded leading-none ${window.getDivisionBadgeClass(m.division)}">${window.escapeHtml(m.division)}</span>` : '<span class="text-slate-400 font-bold">출전부 미정</span>'}
                        </div>
                        <div class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3 text-slate-400"></i> ${m.joinDate || '가입일 미상'}</div>
                    </div>
                    ${window.isFullAdmin() ? `<div class="flex gap-1.5 justify-end pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                        <button onclick="window.editMember('${m.id}')" class="flex-1 max-w-[80px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-[11px] font-black btn-touch shadow-sm">수정</button>
                        <button onclick="window.deleteMember('${m.id}')" class="flex-1 max-w-[80px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 py-2.5 rounded-xl text-[11px] font-black btn-touch shadow-sm">삭제</button>
                    </div>` : ''}
                </td>
            </tr>`;
        }
        return `<tr class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="p-1 sm:p-3 text-center text-slate-400 font-black text-[10px] sm:text-xs whitespace-nowrap">${i+1}</td>
            <td class="p-1 py-2 sm:p-3 text-left">
                <div class="flex items-center gap-1">
                    <div class="font-black text-slate-900 dark:text-white text-[11px] sm:text-sm flex items-center whitespace-nowrap">${backNoHtml}<span class="member-name font-black" style="${nameStyle}">${window.escapeHtml(m.name)}</span></div>
                    <div class="text-[11px] px-1.5 py-0.5 rounded font-black text-white shadow-sm whitespace-nowrap leading-none" style="background-color:${color}">${window.escapeHtml(m.role)}</div>
                </div>
                <div class="text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-black md:hidden">${window.escapeHtml(m.phone||'-')}</div>
            </td>
            <td class="p-1 sm:p-3 text-center text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200 hidden md:table-cell whitespace-nowrap">${window.escapeHtml(m.phone||'-')}</td>
            <td class="p-1 sm:p-3 text-center text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200 hidden lg:table-cell whitespace-nowrap">${window.escapeHtml(m.joinDate||'-')}</td>
            <td class="p-1 sm:p-3 text-center whitespace-nowrap">
                <div class="flex flex-col gap-1 items-center justify-center">
                    ${m.position ? `<span class="text-[9px] sm:text-[10px] font-black border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 shadow-sm inline-block">${window.escapeHtml(m.position)}</span>` : '-'}
                    ${m.division ? `<span class="text-[9px] sm:text-[10px] font-black border px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md inline-block ${window.getDivisionBadgeClass(m.division)}">${window.escapeHtml(m.division)}</span>` : ''}
                </div>
            </td>
            ${window.isFullAdmin() ? `<td class="p-1 sm:p-3 text-right whitespace-nowrap">
                <button onclick="window.editMember('${m.id}')" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-0.5 btn-touch shadow-sm border border-slate-200 dark:border-slate-700">수정</button>
                <button onclick="window.deleteMember('${m.id}')" class="bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 px-2 py-1 sm:px-3 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-black hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors btn-touch border border-red-100 dark:border-red-900/50 shadow-sm">삭제</button>
            </td>` : ''}
        </tr>`;
    }).join('') : `<tr><td colspan="7" class="p-10 sm:p-16 text-center text-slate-400 font-black border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] sm:text-sm">등록된 회원이 없습니다.</td></tr>`);
};

window.showAdminForm = () => { 
    window.resetMemberForm(); 
    window.setText('member-form-title', '신규 회원 가입');
    window.$('btn-member-submit').innerText = '신규 가입 완료';
    const c = window.$('member-form-container');
    c.classList.remove('hidden'); 
    c.classList.add('flex');
    setTimeout(() => {
        c.classList.add('opacity-100');
        window.$('member-form-card').classList.add('scale-100');
    }, 10);
};

window.isMemberFormDirty = () => {
    const fields = ['name', 'phone', 'birth', 'joinDate', 'address', 'position', 'division', 'backNo', 'topSize', 'bottomSize', 'score', 'bonus'];
    return fields.some(k => {
        const val = window.getVal('m-' + k);
        return val && val !== '' && val !== '0' && val !== 0;
    });
};

window.resetMemberForm = (force = true) => {
    if(!force && window.isMemberFormDirty()) {
        window.showConfirm("작성 중인 내용이 있습니다. 정말 취소하시겠습니까?", () => window.resetMemberForm(true), "알림");
        return;
    }

    const c = window.$('member-form-container');
    const hideModal = () => {
        if(c) {
            c.classList.add('hidden');
            c.classList.remove('flex');
        }
        
        // 폼 초기화 및 모든 필드 재활성화
        editingMemberId = null;
        const fields = ['name','role','loginId','loginPw','phone','birth','joinDate','address','position','division','backNo','topSize','bottomSize','score','bonus'];
        fields.forEach(k => {
            const el = window.$('m-'+k);
            if(el) { 
                if(k === 'role') el.value = '일반회원';
                else el.value = '';
                el.disabled = false; 
            }
        });
        
        ['m-score-container', 'm-bonus-container', 'm-current-mileage-display', 'm-bonus-mileage-display'].forEach(id => {
            const el = window.$(id);
            if(el) el.classList.add('hidden');
        });

        // [추가] 생일 구분 초기화
        const bt = document.querySelector('input[name="m-birthType"][value="solar"]');
        if(bt) bt.checked = true;

        window.$('member-form-title').innerText = "회원 설정";
    };

    if(c && c.classList.contains('opacity-100')) {
        c.classList.remove('opacity-100');
        window.$('member-form-card')?.classList.remove('scale-100');
        setTimeout(hideModal, 200);
    } else {
        hideModal();
    }
};

window.editMember = id => {
    const m = (members||[]).find(x=>x.id===id); if(!m) return;
    editingMemberId = id;
    ['name','role','loginId','loginPw','phone','birth','joinDate','address','position','division','backNo','topSize','bottomSize','score'].forEach(k=>window.setVal('m-'+k, m[k] || ''));
    
    // [추가] 생일 구분 설정
    const bt = document.querySelector(`input[name="m-birthType"][value="${m.birthType || 'solar'}"]`);
    if(bt) bt.checked = true;
    
    window.setText('member-form-title', '회원 정보 수정');
    window.$('btn-member-submit').innerText = '정보 수정 완료';
    
    const c = window.$('member-form-container');
    c.classList.remove('hidden'); 
    c.classList.add('flex');
    setTimeout(() => {
        c.classList.add('opacity-100');
        window.$('member-form-card').classList.add('scale-100');
    }, 10);
    
    const cy = window.getTodayString().substring(0,4);
    const uRole = sessionStorage.getItem('sonamu_user_role');
    const uId = sessionStorage.getItem('sonamu_user_id');
    
    const disp = window.$('m-current-mileage-display');
    const bDisp = window.$('m-bonus-mileage-display');
    const scoreContainer = window.$('m-score-container');
    const bonusContainer = window.$('m-bonus-container');
    const bonusLimitDisp = window.$('m-bonus-limit-display');
    
    let bTot=0, bYr=0;
    (m.bonuses||[]).forEach(b=>{ bTot+=b.amount; if(String(b.year)===cy) bYr+=b.amount; });

    const stats = window.getMemberStats(m.id, "");
    const tm = (parseFloat(m.score)||0) + stats.pts + bTot;
    
    if (uId === 'master') {
        if(scoreContainer) scoreContainer.classList.remove('hidden');
        if(bonusContainer) bonusContainer.classList.add('hidden');
        if(disp) {
            disp.innerText = `현재 총 마일리지: ${tm}pt (참여 ${stats.pts}pt + 보너스누적 ${bTot}pt + 수동조정 ${m.score||0}pt)`;
            disp.classList.remove('hidden');
        }
    } else if (['회장', '감독', '총무'].includes(uRole)) {
        if(scoreContainer) scoreContainer.classList.add('hidden');
        if(bonusContainer) bonusContainer.classList.remove('hidden');
        window.setVal('m-bonus', '');
        
        let myGiven = 0;
        (members||[]).forEach(mm => {
            (mm.bonuses||[]).forEach(b => {
                if(String(b.year) === cy && b.givenById === uId) myGiven += b.amount;
            });
        });
        if(bonusLimitDisp) bonusLimitDisp.innerText = `올해 보너스 잔여: ${100 - myGiven} / 100 pt`;
        
        if(bDisp) {
            bDisp.innerText = `당해 개인 보너스 누적 (전체): ${bYr}pt 추가됨`;
            bDisp.classList.remove('hidden');
        }
    } else {
        if(scoreContainer) scoreContainer.classList.add('hidden');
        if(bonusContainer) bonusContainer.classList.add('hidden');
    }
    
    window.scrollTo({top: window.$('member-form-container').offsetTop - 100, behavior: 'smooth'});
};

window.addOrUpdateMember = async () => {
    const uId = sessionStorage.getItem('sonamu_user_id');
    const isSelf = editingMemberId && editingMemberId === uId;
    if(!window.isFullAdmin() && !isSelf) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true;
    
    const existingMember = editingMemberId ? (members||[]).find(x=>x.id===editingMemberId) : null;
    const uRole = sessionStorage.getItem('sonamu_user_role');
    const cy = window.getTodayString().substring(0,4);
    
    let newBonus = 0;
    if (editingMemberId && ['회장', '감독', '총무'].includes(uRole) && uId !== 'master') {
        newBonus = parseInt(window.$('m-bonus')?.value) || 0;
        if(newBonus !== 0) {
            if (newBonus > 20) {
                window.isSavingData = false; return window.showAlert("보너스는 한 회원당 최대 20점까지만 부여할 수 있습니다.");
            }
            if (newBonus < 0) {
                window.isSavingData = false; return window.showAlert("보너스는 0 이상 양수여야 합니다.");
            }
            let myGiven = 0;
            (members||[]).forEach(mm => {
                (mm.bonuses||[]).forEach(b => {
                    if(String(b.year) === cy && b.givenById === uId) myGiven += b.amount;
                });
            });
            if (myGiven + newBonus > 100) {
                window.isSavingData = false; return window.showAlert(`올해 남은 보너스 한도(${100 - myGiven}점)를 초과할 수 없습니다.`);
            }
        }
    }
    
    const m = { id: editingMemberId || 'm_'+Date.now(), score: 0 };
    ['name','role','loginId','loginPw','phone','birth','joinDate','address','position','division','backNo','topSize','bottomSize','score'].forEach(k => m[k] = window.$('m-'+k)?.value.trim()||'');
    m.birthType = document.querySelector('input[name="m-birthType"]:checked')?.value || 'solar'; // [추가] 생일 구분 저장
    if(!m.name) { window.isSavingData = false; return window.showAlert("이름은 필수입니다."); }
    
    if(existingMember) {
        if(uId !== 'master') m.score = existingMember.score || 0;
        m.bonuses = existingMember.bonuses || [];
        if (newBonus > 0) {
            m.bonuses.push({ year: cy, amount: newBonus, givenById: uId, givenByRole: uRole, timestamp: Date.now() });
        }
    } else {
        m.bonuses = [];
    }
    
    if(m.loginPw) {
        if (!existingMember || m.loginPw !== existingMember.loginPw) {
            m.loginPw = await window.hashString(m.loginPw);
        }
    } else if(existingMember) {
        m.loginPw = existingMember.loginPw;
    }
    
    if(editingMemberId) members = members.map(x=>x.id===editingMemberId ? {...x, ...m} : x);
    else members.push({...m, lastLogin:''});
    
    window.resetMemberForm(); window.updateUI(); await window.saveData('members', true); window.isSavingData = false;
};

window.deleteMember = async id => {
    if(!window.isFullAdmin()) { window.showAlert("권한이 없습니다."); return; }
    window.showConfirm("회원을 삭제(휴지통으로 이동)하시겠습니까?\n이 회원의 경기 기록이나 투표 기록 등은 과거 기록으로 유지됩니다.", async () => {
        if(window.isSavingData) return; window.isSavingData = true;
        const m = (members||[]).find(x=>x.id===id);
        if(m) {
            deletedMembers.push({...m, deletedAt: new Date().toISOString()});
            members = members.filter(x=>x.id!==id);
            window.updateUI(); await window.saveData('members', true);
        }
        window.isSavingData = false;
    });
};

window.restoreMember = async id => {
    if(window.isSavingData) return; window.isSavingData = true;
    const m = (deletedMembers||[]).find(x=>x.id===id);
    if(m) {
        delete m.deletedAt;
        members.push(m);
        deletedMembers = deletedMembers.filter(x=>x.id!==id);
        window.updateUI(); await window.saveData('members', true);
    }
    window.isSavingData = false;
};

// --- Board / Posts ---
window.toggleEventFields = () => { const c = window.$('board-is-event')?.checked; window.$('event-fields')?.classList.toggle('hidden', !c); if(c) { window.$('board-is-anon').checked = false; window.toggleAnonFields(); window.$('end-date-container')?.classList.remove('hidden'); } else if(!window.$('board-is-anon')?.checked) { window.$('end-date-container')?.classList.add('hidden'); } };
window.toggleAnonFields = () => { const c = window.$('board-is-anon')?.checked; window.$('anon-fields')?.classList.toggle('hidden', !c); if(c) { window.$('board-is-event').checked = false; window.toggleEventFields(); window.$('end-date-container')?.classList.remove('hidden'); } else if(!window.$('board-is-event')?.checked) { window.$('end-date-container')?.classList.add('hidden'); } };
window.toggleEndedPosts = () => { isShowingEndedPosts = !isShowingEndedPosts; const b=window.$('btn-toggle-ended-posts'); if(b) b.innerText=isShowingEndedPosts?'진행중 공지/투표 보기':'종료된 투표 보기'; window.renderPosts(); };

window.resetBoardForm = () => {
    editingPostId = null;
    window.setVal('board-title'); window.setVal('board-content'); window.setVal('board-event-date'); window.setVal('board-event-location'); window.setVal('board-end-date');
    window.$('board-is-event').checked = false; window.$('board-is-anon').checked = false; window.$('board-event-allow-multiple').checked = false;
    window.setVal('board-event-options', '참석,불참,미정'); window.setVal('board-anon-options', '찬성,반대,미정');
    window.toggleEventFields(); window.toggleAnonFields();
    window.$('btn-board-submit').innerText = '등록'; window.$('btn-board-cancel').classList.add('hidden');
};

window.editPost = id => {
    const p = (posts||[]).find(x=>x.id===id); if(!p) return;
    editingPostId = id;
    window.setVal('board-title', p.title);
    window.setVal('board-content', p.content);
    window.setVal('board-end-date', p.endDate || '');
    
    window.$('board-is-event').checked = !!p.isEvent;
    window.$('board-is-anon').checked = !!p.isAnon;

    if(p.isEvent) {
        window.setVal('board-event-date', p.eventDate || '');
        window.setVal('board-event-location', p.eventLocation || '');
        window.$('board-event-allow-multiple').checked = !!p.allowMultiple;
        window.setVal('board-event-options', (p.eventOptions||['참석','불참','미정']).join(','));
    } else if(p.isAnon) {
        window.setVal('board-anon-options', (p.anonOptions||['찬성','반대','미정']).join(','));
    }

    window.toggleEventFields(); window.toggleAnonFields();
    
    window.$('btn-board-submit').innerText = '수정 완료';
    window.$('btn-board-cancel').classList.remove('hidden');
    window.scrollTo({top: window.$('board-form-container').offsetTop - 100, behavior: 'smooth'});
};

window.addPost = async () => {
    if(!window.isNoticeAdmin()) { window.showAlert("권한이 없습니다."); return; }
    if(window.isSavingData) return; window.isSavingData = true;
    
    const titleObj = window.$('board-title'), contentObj = window.$('board-content');
    const t = window.escapeHtml(titleObj ? titleObj.value.trim() : ""), c = window.escapeHtml(contentObj ? contentObj.value.trim() : "");
    
    if(!t) { window.isSavingData = false; return window.showAlert("게시글/투표의 제목을 입력하세요."); }
    
    const isEvent = window.$('board-is-event')?.checked || false;
    const isAnon = window.$('board-is-anon')?.checked || false;
    const endDate = window.$('board-end-date')?.value || "";

    if((isEvent || isAnon) && !endDate) { 
        window.isSavingData = false; 
        return window.showAlert("투표의 경우 반드시 종료일을 설정해야 등록이 가능합니다."); 
    }

    let p = { id: editingPostId || 'p_'+Date.now(), title: t, content: c, date: window.getTodayString(), isEvent: isEvent, isAnon: isAnon, endDate: endDate };
    
    // 기존 투표 데이터 보존 (수정 시)
    if(editingPostId) {
        const oldP = (posts||[]).find(x=>x.id===editingPostId);
        if(oldP && oldP.votes) p.votes = oldP.votes;
        else p.votes = {};
    } else {
        p.votes = {};
    }

    if(p.isEvent) {
        p.eventDate = window.$('board-event-date')?.value || "";
        p.eventLocation = window.$('board-event-location')?.value || "";
        p.allowMultiple = window.$('board-event-allow-multiple')?.checked || false;
        p.eventOptions = (window.$('board-event-options')?.value || "").split(',').map(x=>x.trim()).filter(Boolean);
        if(!p.eventOptions.length) p.eventOptions = ['참석','불참','미정'];
    } else if(p.isAnon) {
        p.anonOptions = (window.$('board-anon-options')?.value || "").split(',').map(x=>x.trim()).filter(Boolean);
        if(!p.anonOptions.length) p.anonOptions = ['찬성','반대','미정'];
    }
    
    if(!posts) posts = [];
    if(editingPostId) {
        posts = posts.map(x=>x.id===editingPostId ? p : x);
    } else {
        posts.push(p);
    }
    
    try {
        const snapshotPosts = JSON.parse(JSON.stringify(posts)); // 데이터 정합성을 위한 스냅샷
        window.resetBoardForm(); 
        window.updateUI(); 
        // [중요] force=true(세번째 인자)를 전달하여 saveData 내부 락을 통과시킴
        await window.saveData('board', true, true, snapshotPosts); 
    } catch(err) {
        console.error("Board Save Error:", err);
        window.showAlert("서버 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
        window.isSavingData = false;
    }
};

window.deletePost = async id => {
    if(!window.isNoticeAdmin()) return;
    window.showConfirm("게시판 또는 무기명 투표를 삭제하시겠습니까?", async () => {
        if(window.isSavingData) return; window.isSavingData = true;
        
        if(!window._deletedPostIds) window._deletedPostIds = [];
        window._deletedPostIds.push(id);
        
        posts = (posts||[]).filter(x => x.id !== id);
        const snapshotPosts = JSON.parse(JSON.stringify(posts));
        window.updateUI(); 
        
        try {
            await window.saveData('board', true, true, snapshotPosts); 
        } catch(err) {
            console.error("Delete Fail:", err);
        }
        window.isSavingData = false;
    });
};

window.renderPosts = () => {
    const list = window.$('post-list'); if(!list) return;
    const td = window.getTodayString();
    
    let targetPosts = [...(posts||[])].filter(p => !p.isFreePost);
    if (isShowingEndedPosts) {
        targetPosts = targetPosts.filter(p => p.endDate && p.endDate < td);
    } else {
        targetPosts = targetPosts.filter(p => !p.endDate || p.endDate >= td);
    }
    
    targetPosts.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    
    list.innerHTML = targetPosts.length ? targetPosts.map(p => {
        const isEnded = p.endDate && p.endDate < td;
        let badge = '';
        if (isEnded) badge = '<span class="text-[10px] font-black bg-slate-500 text-white px-2 py-1 rounded-md shadow-sm mr-1.5">종료</span>';
        else if(p.isEvent) badge = '<span class="text-[10px] font-black bg-green-500 text-white px-2 py-1 rounded-md shadow-sm mr-1.5">회원투표</span>';
        else if(p.isAnon) badge = '<span class="text-[10px] font-black bg-rose-500 text-white px-2 py-1 rounded-md shadow-sm mr-1.5">무기명투표</span>';
        else badge = '<span class="text-[10px] font-black bg-slate-800 text-white px-2 py-1 rounded-md shadow-sm mr-1.5">공지</span>';
        
        let act = '';
        if(p.isEvent || p.isAnon) act = `<button onclick="window.showTab('vote'); window.switchVoteTab('${p.isEvent?'event':'anon'}'); setTimeout(()=>{window.setVal('vote-${p.isEvent?'event':'anon'}-select','${p.id}'); window.changeVote${p.isEvent?'Event':'Anon'}();},10);" class="mt-4 w-full sm:w-auto bg-blue-50 text-blue-700 border border-blue-200 px-5 py-3.5 rounded-xl text-sm font-black shadow-sm hover:shadow-md hover:bg-blue-100 btn-touch inline-flex justify-center items-center gap-2 transition-all"><i data-lucide="vote" class="w-4 h-4"></i> ${isEnded ? '투표 결과 확인' : '투표 참여하기'}</button>`;
        
        return `<div class="bg-slate-50 border border-slate-200 p-5 md:p-6 rounded-[1.5rem] relative group shadow-sm mb-4">
            <div class="absolute top-5 right-5 flex gap-2">
                <button onclick="window.shareKakaoPost('${p.id}')" class="text-slate-400 hover:text-green-500 bg-white border p-1.5 rounded-lg shadow-sm btn-touch transition-colors" title="공유하기"><i data-lucide="share-2" class="w-4 h-4"></i></button>
                ${window.isNoticeAdmin() ? `<button onclick="window.editPost('${p.id}')" class="text-slate-400 hover:text-blue-500 bg-white border p-1.5 rounded-lg shadow-sm btn-touch transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button><button onclick="window.deletePost('${p.id}')" class="text-slate-400 hover:text-red-500 bg-white border p-1.5 rounded-lg shadow-sm btn-touch transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
            </div>
            <div class="mb-3 flex items-center">${badge} <span class="font-black text-slate-800 ml-1 text-lg leading-tight pr-20">${window.escapeHtml(p.title)}</span></div>
            <div class="text-[10px] text-slate-400 font-bold mb-4 flex flex-wrap gap-3 border-b border-slate-200 pb-3"><span>등록일: ${p.date}</span> ${p.endDate?`<span class="text-rose-500"><i data-lucide="alarm-clock" class="w-3 h-3 inline mr-0.5"></i> 투표마감: ${p.endDate}</span>`:''}</div>
            <div class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-bold bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner leading-relaxed">${window.escapeHtml(p.content||'')}</div>
            ${p.isEvent && p.eventDate ? `<div class="mt-4 text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 rounded-xl inline-flex items-center gap-2 w-full sm:w-auto"><i data-lucide="calendar" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"></i> <span>행사 일정: ${p.eventDate} ${p.eventLocation?`<span class="text-emerald-300 mx-1">|</span> 장소: ${window.escapeHtml(p.eventLocation)}`:''}</span></div>` : ''}
            ${act}
        </div>`;
    }).join('') : `<div class="text-center py-16 text-slate-400 font-black border-2 border-dashed border-slate-200 bg-slate-50 rounded-[2rem] shadow-inner">게시물이 존재하지 않습니다.</div>`;
    if(window.lucide) window.lucide.createIcons();
};

let currentReportType = 'month';
window.switchReportType = (type) => {
    currentReportType = type;
    const btnM = window.$('btn-report-type-month');
    const btnY = window.$('btn-report-type-year');
    const inpM = window.$('report-month');
    const inpY = window.$('report-year');
    
    if (type === 'month') {
        btnM.className = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-blue-600 shadow-sm font-black";
        btnY.className = "flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";
        inpM.classList.remove('hidden');
        inpY.classList.add('hidden');
    } else {
        btnY.className = "flex-1 py-3 rounded-xl text-sm transition-all bg-white text-blue-600 shadow-sm font-black";
        btnM.className = "flex-1 py-3 rounded-xl text-sm transition-all text-slate-500 hover:text-slate-700 font-black";
        inpY.classList.remove('hidden');
        inpM.classList.add('hidden');
    }
    window.renderReport();
};

window.renderReport = () => {
    const isYearly = currentReportType === 'year';
    let ym = window.$('report-month')?.value; if(!ym) { ym=window.getTodayString().substring(0,7); window.setVal('report-month', ym); }
    let yy = window.$('report-year')?.value; if(!yy) { yy=window.getTodayString().substring(0,4); window.setVal('report-year', yy); }
    
    const targetPeriod = isYearly ? yy : ym;
    
    const rb=window.$('report-content-body'), rt=window.$('report-period-text'); if(!rb||!rt) return;
    rt.innerText=`[ ${targetPeriod}${isYearly?'년':'월'} ]`; window.setText('report-gen-date', `문서 생성 일시: ${new Date().toLocaleString()}`);
    
    let pi=0, pe=0, ci=0, ce=0;
    (transactions||[]).forEach(t=>{
        const tDate = String(t.date);
        const tPeriod = isYearly ? tDate.substring(0,4) : tDate.substring(0,7);
        const isInc = t.category==='income';
        const val = Number(t.amount)||0;

        if(tPeriod < targetPeriod) { 
            if(isInc) pi+=val; else pe+=val; 
        }
        else if(tPeriod === targetPeriod) { 
            if(isInc) ci+=val; else ce+=val; 
        }
    });
    
    const pBal = pi - pe;
    const cBal = pBal + ci - ce;
    
    // 신규 가입 회원 추출 (일반회원 이상 정회원만)
    const newMembers = (members || []).filter(m => {
        const excludeRoles = ['준회원', '파트너', '비회원', '게스트', '신입', '신입회원', '휴면', '초청선수', '용병'];
        if (!m.joinDate || excludeRoles.includes(m.role)) return false;
        if (isYearly) {
            return m.joinDate.substring(0, 4) === targetPeriod;
        } else {
            return m.joinDate.substring(0, 7) === targetPeriod;
        }
    }).sort((a, b) => a.joinDate.localeCompare(b.joinDate));

    let ih = '';
    
    if (newMembers.length > 0) {
        ih += `<div class="mb-6 md:mb-8 bg-emerald-50 p-4 md:p-5 rounded-[1.5rem] border border-emerald-200 shadow-sm print:border-none print:shadow-none print:p-0">
            <h3 class="text-sm md:text-base font-black text-emerald-800 mb-3 flex items-center gap-2">
                <div class="bg-emerald-100 p-1.5 rounded-lg print:hidden"><i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i></div>
                ${isYearly?'당해':'당월'} 신규 가입 회원 <span class="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full ml-1 print:border print:border-emerald-300">${newMembers.length}명</span>
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">`;
        newMembers.forEach(nm => {
            ih += `<div class="bg-white p-2.5 md:p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center print:border-emerald-200">
                <span class="font-black text-slate-800 text-xs md:text-sm mb-0.5">${window.escapeHtml(nm.name)}</span>
                <span class="text-[9px] md:text-[10px] text-slate-500 font-bold bg-slate-50 px-1.5 py-0.5 rounded print:bg-white">${nm.joinDate.substring(5).replace('-','/')} 가입</span>
            </div>`;
        });
        ih += `</div></div>`;
    }

    ih += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"><div class="space-y-3 md:space-y-4">
        <h3 class="text-base md:text-lg font-black text-blue-800 border-b-2 border-blue-200 pb-2 flex items-center gap-2"><div class="bg-blue-100 p-1.5 rounded-lg"><i data-lucide="arrow-down-circle" class="w-4 h-4"></i></div> ${isYearly?'당해':'당월'} 수입 내역</h3>
        <div class="overflow-x-auto nav-scroll"><table class="w-full text-[11px] sm:text-xs border border-slate-200 shadow-sm min-w-[280px]"><thead class="bg-slate-100 text-slate-600"><tr><th class="p-2 sm:p-2.5 border-b font-black whitespace-nowrap">${isYearly?'구분':'일자'}</th><th class="p-2 sm:p-2.5 border-b font-black text-left">${isYearly?'항목':'내역'}</th><th class="p-2 sm:p-2.5 border-b font-black text-right whitespace-nowrap">금액</th></tr></thead><tbody class="divide-y divide-slate-100">`;
    
    const incs = (transactions||[]).filter(t=>t.category==='income' && !String(t.type||'').includes('면제') && (isYearly ? String(t.date).substring(0,4)===targetPeriod : String(t.date).substring(0,7)===targetPeriod)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    
    if(isYearly) {
        let catInc = {};
        let catNotes = {};
        incs.forEach(t => { 
            let cat = t.type || '기타'; 
            if(!catInc[cat]) { catInc[cat] = 0; catNotes[cat] = []; }
            catInc[cat] += Number(t.amount)||0; 
            
            if (cat.includes('특별찬조') || cat.includes('찬조금') || cat === '기타' || cat.includes('식대') || cat.includes('은행이자') || cat.includes('상금/대체입금') || t.note || (t.months && t.months.length) || t.targetYear) {
                let detail = '';
                if(t.name && t.name !== '비회원' && t.name !== '시스템') detail += t.name;
                
                const txYear = String(t.date||'').substring(0,4);
                const tYear = t.targetYear ? String(t.targetYear) : txYear;
                const isDiffYear = tYear && tYear !== targetPeriod;
                const yearPrefix = isDiffYear ? `[${tYear}년] ` : '';

                if(t.months && Array.isArray(t.months) && t.months.length > 0) detail += ` (${yearPrefix}${t.months.join(',')}월)`;
                else if(isDiffYear && (cat.includes('회비') || cat.includes('면제'))) detail += ` [${tYear}년도]`;

                if(t.note && t.note !== '과거 압축') detail += (detail ? ' ['+t.note+']' : t.note);
                if(detail) catNotes[cat].push(detail + ' ' + (Number(t.amount)||0).toLocaleString());
            }
        });
        const cKeys = Object.keys(catInc).sort((a,b)=>catInc[b]-catInc[a]);
        if(cKeys.length) cKeys.forEach(c => { 
            let dispC = c;
            if(c.includes('특별찬조')) dispC = `<span class="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            else if(c.includes('찬조금')) dispC = `<span class="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            else if(c.includes('[특별청구]')) dispC = `<span class="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            else if(c.includes('식대')) dispC = `<span class="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            else if(c.includes('은행이자')) dispC = `<span class="text-[10px] bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            else if(c.includes('상금/대체입금')) dispC = `<span class="text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-black mr-1 shadow-sm whitespace-nowrap">${c}</span>`;
            
            let noteHtml = catNotes[c] && catNotes[c].length ? `<div class="text-[9px] text-slate-400 mt-1 leading-tight font-normal break-keep">${catNotes[c].join('<br>')}</div>` : '';
            
            if (c.includes('[특별청구]')) {
                const titleMatch = c.replace('[특별청구] ', '').trim();
                const sds = (typeof specialDues !== 'undefined' ? specialDues : []).filter(x => x.title === titleMatch).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
                if (sds.length > 0) {
                    const sd = sds[0];
                    const paids = sd.paids || [];
                    const unpaids = (sd.targets||[]).filter(t => !paids.includes(t));
                    let statusHtml = '';
                    if (paids.length > 0) {
                        statusHtml += `<div class="text-[10px] text-emerald-600 font-bold mt-1.5 bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm mr-1">납부자: ${paids.join(', ')}</div>`;
                    }
                    if (unpaids.length > 0) {
                        statusHtml += `<div class="text-[10px] text-rose-500 font-bold mt-1.5 bg-rose-50 inline-block px-1.5 py-0.5 rounded border border-rose-100 shadow-sm">미납자: ${unpaids.join(', ')}</div>`;
                    }
                    noteHtml += statusHtml;
                }
            }
            
            ih+=`<tr><td class="p-2 sm:p-2.5 text-center text-slate-700 font-bold">-</td><td class="p-2 sm:p-2.5 font-black text-slate-800 text-left leading-relaxed">${dispC}${noteHtml}</td><td class="p-2 sm:p-2.5 text-right font-black text-blue-600 whitespace-nowrap">${catInc[c].toLocaleString()}</td></tr>`; 
        });
        else ih+=`<tr><td colspan="3" class="p-6 text-center text-slate-400 font-bold">당해 수입 내역이 없습니다.</td></tr>`;
    } else {
        if(incs.length) {
            incs.forEach(t=>{ 
                let dispType = t.type || '';
                const txYear = String(t.date||'').substring(0,4);
                const tYear = t.targetYear ? String(t.targetYear) : txYear;
                const isDiffYear = tYear && tYear !== txYear;
                const yearPrefix = isDiffYear ? `[${tYear}년] ` : '';

                if(dispType.includes('특별찬조')) dispType = `<span class="text-[9px] sm:text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType.includes('찬조금')) dispType = `<span class="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType && dispType.includes('[특별청구]')) dispType = `<span class="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType.includes('식대')) dispType = `<span class="text-[9px] sm:text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType.includes('은행이자')) dispType = `<span class="text-[9px] sm:text-[10px] bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType.includes('상금/대체입금')) dispType = `<span class="text-[9px] sm:text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-black ml-1 shadow-sm whitespace-nowrap">${dispType}</span>`;
                else if(dispType) {
                    const yearBadge = isDiffYear ? `<span class="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded font-black ml-1">[${tYear}년도]</span>` : '';
                    dispType = `<span class="text-[10px] sm:text-xs text-slate-500 ml-1 font-normal break-keep">${dispType}${yearBadge}</span>`;
                }
                
                let noteHtml = t.note ? `<div class="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight break-keep">${t.note}</div>` : '';
                
                const mBadgeClass = isDiffYear ? 'text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded font-black' : 'text-blue-500 font-black';
                const mStr = (t.months && Array.isArray(t.months) && t.months.length > 0) ? `<span class="text-[9px] ${mBadgeClass} ml-1">(${yearPrefix}${t.months.join(',')}월)</span>` : '';
                 ih+=`<tr><td class="p-2 sm:p-2.5 text-center text-slate-500 font-bold whitespace-nowrap">${String(t.date).substring(8)}일</td><td class="p-2 sm:p-2.5 font-black text-slate-800 text-left leading-tight">${window.escapeHtml(t.name)} ${mStr} ${dispType} ${noteHtml}</td><td class="p-2 sm:p-2.5 text-right font-black text-blue-600 whitespace-nowrap">${(Number(t.amount)||0).toLocaleString()}</td></tr>`; 
            });
            
            let catInc = {};
            incs.forEach(t => { let cat = t.type || '기타'; if(!catInc[cat]) catInc[cat] = 0; catInc[cat] += Number(t.amount)||0; });
            let summaryHtml = Object.keys(catInc).map(c => {
                let dispC = window.escapeHtml(c);
                if(c.includes('특별찬조')) dispC = `<span class="text-amber-600">${dispC}</span>`;
                else if(c.includes('찬조금')) dispC = `<span class="text-emerald-600">${dispC}</span>`;
                else if(c.includes('[특별청구]')) dispC = `<span class="text-indigo-600">${dispC}</span>`;
                else if(c.includes('식대')) dispC = `<span class="text-orange-600">${dispC}</span>`;
                else if(c.includes('은행이자')) dispC = `<span class="text-teal-600">${dispC}</span>`;
                else if(c.includes('상금/대체입금')) dispC = `<span class="text-sky-600">${dispC}</span>`;
                return `<span class="whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-sm">${dispC} <span class="text-slate-700 font-black">${catInc[c].toLocaleString()}</span>원</span>`;
            }).join('');
            
            let unpaidsHtml = '';
            Object.keys(catInc).filter(c => c.includes('[특별청구]')).forEach(c => {
                const titleMatch = c.replace('[특별청구] ', '').trim();
                const sds = (typeof specialDues !== 'undefined' ? specialDues : []).filter(x => x.title === titleMatch).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
                if (sds.length > 0) {
                    const sd = sds[0];
                    const paids = sd.paids || [];
                    const unpaids = (sd.targets||[]).filter(t => !paids.includes(t));
                    
                    let statusHtml = `<div class="font-black text-indigo-700 mb-1 text-[11px]">${window.escapeHtml(titleMatch)} 납부 현황</div>`;
                    if (paids.length > 0) {
                        statusHtml += `<div class="text-[10px] text-emerald-600 font-bold bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm mr-1 mb-1">납부자: ${paids.join(', ')}</div>`;
                    }
                    if (unpaids.length > 0) {
                        statusHtml += `<div class="text-[10px] text-rose-500 font-bold bg-rose-50 inline-block px-1.5 py-0.5 rounded border border-rose-100 shadow-sm mb-1">미납자: ${unpaids.join(', ')}</div>`;
                    }
                    unpaidsHtml += `<div class="mt-2.5 text-center bg-white p-2 rounded-xl border border-indigo-50 shadow-sm inline-block mx-1">${statusHtml}</div>`;
                }
            });
            
            ih+=`<tr class="bg-slate-50 border-t border-slate-200"><td colspan="3" class="p-2 sm:p-3 text-center text-[10px] text-slate-500 font-bold leading-relaxed">월간 수입 요약<div class="mt-1.5 flex flex-wrap justify-center gap-1.5">${summaryHtml}</div>${unpaidsHtml ? '<div class="mt-1 flex flex-wrap justify-center">' + unpaidsHtml + '</div>' : ''}</td></tr>`;
        }
        else ih+=`<tr><td colspan="3" class="p-6 text-center text-slate-400 font-bold">당월 수입 내역이 없습니다.</td></tr>`;
    }
    
    ih+=`<tr class="bg-blue-50 border-t-2 border-blue-200"><td colspan="2" class="p-2 sm:p-3 text-center font-black text-blue-900">${isYearly?'당해':'당월'} 수입 합계</td><td class="p-2 sm:p-3 text-right font-black text-blue-700 text-sm sm:text-base whitespace-nowrap">${ci.toLocaleString()}</td></tr></tbody></table></div></div>`;

    ih += `<div class="space-y-3 md:space-y-4">
        <h3 class="text-base md:text-lg font-black text-red-800 border-b-2 border-red-200 pb-2 flex items-center gap-2"><div class="bg-red-100 p-1.5 rounded-lg"><i data-lucide="arrow-up-circle" class="w-4 h-4"></i></div> ${isYearly?'당해':'당월'} 지출 내역</h3>
        <div class="overflow-x-auto nav-scroll"><table class="w-full text-[11px] sm:text-xs border border-slate-200 shadow-sm min-w-[280px]"><thead class="bg-slate-100 text-slate-600"><tr><th class="p-2 sm:p-2.5 border-b font-black whitespace-nowrap">${isYearly?'구분':'일자'}</th><th class="p-2 sm:p-2.5 border-b font-black text-left">${isYearly?'항목':'내역'}</th><th class="p-2 sm:p-2.5 border-b font-black text-right whitespace-nowrap">금액</th></tr></thead><tbody class="divide-y divide-slate-100">`;
    
    const exps = (transactions||[]).filter(t=>t.category==='expense' && (isYearly ? String(t.date).substring(0,4)===targetPeriod : String(t.date).substring(0,7)===targetPeriod)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    
    if(isYearly) {
        let catExp = {};
        let catNotes = {};
        exps.forEach(t => { 
            let cat = t.type || '기타'; 
            if(!catExp[cat]) { catExp[cat] = 0; catNotes[cat] = []; }
            catExp[cat] += Number(t.amount)||0; 
            
            if (t.note && t.note !== '과거 압축') {
                catNotes[cat].push(window.escapeHtml(t.note) + ' ' + (Number(t.amount)||0).toLocaleString());
            }
        });
        const cKeys = Object.keys(catExp).sort((a,b)=>catExp[b]-catExp[a]);
        if(cKeys.length) cKeys.forEach(c => { 
            let noteHtml = catNotes[c] && catNotes[c].length ? `<div class="text-[9px] text-slate-400 mt-1 leading-tight font-normal break-keep">${catNotes[c].join('<br>')}</div>` : '';
            ih+=`<tr><td class="p-2 sm:p-2.5 text-center text-slate-700 font-bold">-</td><td class="p-2 sm:p-2.5 font-black text-slate-800 text-left leading-relaxed">${window.escapeHtml(c)}${noteHtml}</td><td class="p-2 sm:p-2.5 text-right font-black text-red-600 whitespace-nowrap">${catExp[c].toLocaleString()}</td></tr>`; 
        });
        else ih+=`<tr><td colspan="3" class="p-6 text-center text-slate-400 font-bold">당해 지출 내역이 없습니다.</td></tr>`;
    } else {
        if(exps.length) exps.forEach(t=>{ ih+=`<tr><td class="p-2 sm:p-2.5 text-center text-slate-500 font-bold whitespace-nowrap">${String(t.date).substring(8)}일</td><td class="p-2 sm:p-2.5 font-black text-slate-800 text-left leading-tight">${window.escapeHtml(t.type)} ${t.note?`<span class="text-[9px] text-slate-400 font-normal block mt-0.5 leading-tight break-keep">${window.escapeHtml(t.note)}</span>`:''}</td><td class="p-2 sm:p-2.5 text-right font-black text-red-600 whitespace-nowrap">${(Number(t.amount)||0).toLocaleString()}</td></tr>`; });
        else ih+=`<tr><td colspan="3" class="p-6 text-center text-slate-400 font-bold">당월 지출 내역이 없습니다.</td></tr>`;
    }
    
    ih+=`<tr class="bg-red-50 border-t-2 border-red-200"><td colspan="2" class="p-2 sm:p-3 text-center font-black text-red-900">${isYearly?'당해':'당월'} 지출 합계</td><td class="p-2 sm:p-3 text-right font-black text-red-700 text-sm sm:text-base whitespace-nowrap">${ce.toLocaleString()}</td></tr></tbody></table></div></div></div>`;
    
    ih += `<div class="mt-8 md:mt-10 bg-slate-50 p-5 md:p-6 rounded-[2rem] border-2 border-slate-200 shadow-inner">
        <h3 class="text-lg md:text-xl font-black text-slate-800 mb-4 md:mb-5 flex items-center gap-2"><div class="bg-slate-200 p-2 rounded-xl"><i data-lucide="calculator" class="w-4 h-4 md:w-5 md:h-5 text-slate-600"></i></div> 결산 요약 (통장 잔고)</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm">
            <div class="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"><span class="text-slate-500 font-black mb-1 md:mb-2 text-[10px] md:text-xs">${isYearly?'전년':'전월'} 이월금</span><span class="text-base md:text-lg font-black text-slate-800 text-right whitespace-nowrap">${pBal.toLocaleString()}원</span></div>
            <div class="bg-blue-50 p-3 md:p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between"><span class="text-blue-600 font-black mb-1 md:mb-2 text-[10px] md:text-xs">${isYearly?'당해':'당월'} 수입</span><span class="text-base md:text-lg font-black text-blue-700 text-right whitespace-nowrap">+ ${ci.toLocaleString()}원</span></div>
            <div class="bg-red-50 p-3 md:p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between"><span class="text-red-600 font-black mb-1 md:mb-2 text-[10px] md:text-xs">${isYearly?'당해':'당월'} 지출</span><span class="text-base md:text-lg font-black text-red-700 text-right whitespace-nowrap">- ${ce.toLocaleString()}원</span></div>
            <div class="bg-gradient-to-r from-indigo-600 to-blue-700 p-3 md:p-4 rounded-2xl border-indigo-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div class="absolute -right-3 -top-3 opacity-10 pointer-events-none"><i data-lucide="landmark" class="w-16 h-16 text-white"></i></div>
                <span class="text-indigo-100 font-black mb-1 md:mb-2 text-[10px] md:text-xs relative z-10">${isYearly?'당해':'당월'} 통장 잔액</span><span class="text-lg sm:text-xl md:text-2xl font-black text-white text-right relative z-10 drop-shadow-md whitespace-nowrap">${cBal.toLocaleString()}원</span>
            </div>
        </div>
    </div>`;

    ih += `<div class="mt-6 md:mt-8 bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:mt-6">
        <div class="flex justify-between items-center mb-3 print:mb-2">
            <h3 class="text-sm md:text-base font-black text-slate-800 flex items-center gap-2"><div class="bg-slate-100 p-1.5 rounded-lg print:hidden"><i data-lucide="edit-3" class="w-4 h-4 text-slate-600"></i></div> 결산 비고 및 전달사항</h3>
            <button class="print:hidden text-[10px] md:text-xs bg-slate-800 text-white px-4 py-2 rounded-lg font-black shadow-sm btn-touch flex items-center gap-1" onclick="window.saveReportNote('${targetPeriod}')"><i data-lucide="save" class="w-3 h-3"></i> 메모 저장</button>
        </div>
        <textarea id="report-note-input" class="w-full border-2 border-slate-100 p-4 rounded-xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-blue-50 transition-colors print:hidden resize-none min-h-[100px]" placeholder="해당 결산 기간(${targetPeriod}${isYearly?'년':'월'})에 대한 추가 설명, 이월금 상세 내역이나 전달사항을 입력하세요. (우측 상단 '메모 저장' 버튼을 눌러야 반영됩니다)">${reportNotes[targetPeriod] || ''}</textarea>
        <div class="hidden print:block text-xs text-slate-700 whitespace-pre-wrap font-bold bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px] mb-4">${window.escapeHtml(reportNotes[targetPeriod] || '특별한 전달사항이 없습니다.')}</div>`;

    if (isYearly) {
        const monthsWithNotes = Object.keys(reportNotes)
            .filter(k => k.startsWith(targetPeriod + '-') && reportNotes[k].trim())
            .sort();
        if (monthsWithNotes.length > 0) {
            ih += `<div class="mt-4 pt-4 border-t-2 border-dashed border-slate-100">
                <h4 class="text-xs font-black text-slate-600 mb-3 flex items-center gap-1.5"><i data-lucide="history" class="w-3 h-3"></i> 월별 결산 비고 모아보기</h4>
                <div class="space-y-2">`;
            monthsWithNotes.forEach(k => {
                const monthNum = parseInt(k.substring(5, 7));
                ih += `<div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col sm:flex-row sm:items-start gap-2 print:border-none print:p-1 print:bg-white print:mb-2">
                    <div class="text-[10px] font-black text-white bg-slate-400 px-2 py-0.5 rounded-lg whitespace-nowrap self-start print:text-slate-800 print:bg-transparent print:border print:border-slate-300">${monthNum}월</div>
                    <div class="text-[11px] sm:text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-bold break-all sm:break-words break-keep w-full overflow-hidden">${window.escapeHtml(reportNotes[k])}</div>
                </div>`;
            });
            ih += `</div></div>`;
        }
    }
    
    ih += `</div>`;

    rb.innerHTML = ih;
    if(window.lucide) window.lucide.createIcons();
};

window.saveReportNote = async (period) => {
    if(window.isSavingData) return;
    window.isSavingData = true;
    const note = window.$('report-note-input')?.value.trim() || '';
    if(typeof reportNotes === 'undefined') window.reportNotes = {};
    reportNotes[period] = note;
    window.showToast("결산 비고가 안전하게 저장되었습니다.");
    window.renderReport();
    await window.saveData('finance');
    window.isSavingData = false;
};

window.installPWA = () => {
    if(window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the PWA install prompt');
                const container = window.$('pwa-install-container');
                if(container) container.classList.add('hidden');
            } else {
                console.log('User dismissed the PWA install prompt');
            }
            window.deferredPrompt = null;
        });
    } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (isStandalone) {
            window.showAlert("이미 바탕화면에 앱이 설치되어 있습니다.", "알림");
        } else if (isIOS) {
            window.showAlert("아이폰(iOS) 사용자는 하단의 '공유' 아이콘(사각형에 위 화살표)을 클릭한 후, 메뉴를 아래로 내려 '홈 화면에 추가'를 선택하여 앱을 설치하실 수 있습니다.", "아이폰 앱 설치 방법");
        } else {
            window.showAlert("현재 브라우저에서는 스마트폰 홈 화면 추가 기능을 직접 지원하지 않거나, 기기에 이미 앱이 설치되어 있습니다.\n\n안드로이드 크롬은 우측 상단 메뉴(점 3개)에서 '앱 설치'를 클릭해 주세요.", "앱 설치 안내");
        }
    }
};

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('beforeinstallprompt event fired');
    
    const container = window.$('pwa-install-container');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if(container && !isStandalone) {
        container.classList.remove('hidden');
    }
});

// [신규] 월말 결산 보고서 공유 로직 (Web Share API 및 클립보드 복사 지원)
window.shareReport = async () => {
    const isYearly = currentReportType === 'year';
    let ym = window.$('report-month')?.value;
    let yy = window.$('report-year')?.value;
    const targetPeriod = isYearly ? yy : ym;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 1. 기간 내 금액 합계 재계산 (정확성 확보)
    let pi=0, pe=0, ci=0, ce=0;
    (transactions||[]).forEach(t=>{
        const tDate = String(t.date);
        const tPeriod = isYearly ? tDate.substring(0,4) : tDate.substring(0,7);
        const isInc = t.category==='income';
        const val = Number(t.amount)||0;
        if(tPeriod < targetPeriod) { if(isInc) pi+=val; else pe+=val; }
        else if(tPeriod === targetPeriod) { if(isInc) ci+=val; else ce+=val; }
    });
    const pBal = pi - pe;
    const cBal = pBal + ci - ce;
    const notes = (typeof reportNotes !== 'undefined' && reportNotes[targetPeriod]) || "특별한 전달사항이 없습니다.";
    
    // 2. 앱 접속 경로 링크 생성
    const baseUrl = window.location.origin + window.location.pathname;
    const appUrl = `${baseUrl}?tab=report`;

    // 3. 보고서 텍스트 메시지 구성
    const msg = `[소나무 족구단 ${isYearly?'연간':'월간'} 결산 보고서]

안녕하세요, 소나무 족구단 회원 여러분!
총무로서 우리 클럽의 투명한 운영을 위해 이번 달 결산 내역을 보고드립니다. 
항상 클럽 활동에 적극적으로 참여해 주셔서 감사합니다.

📅 대상 기간: ${targetPeriod}${isYearly?'년':'월'}

💰 전월 이월금: ${pBal.toLocaleString()}원
➕ 당월 총 수입: ${ci.toLocaleString()}원
➖ 당월 총 지출: ${ce.toLocaleString()}원
━━━━━━━━━━━━━━
🏦 현재 통장 잔액: ${cBal.toLocaleString()}원

📝 전달사항:
${notes}

------------------------------
※ 자세한 내역은 아래 링크를 통해 클럽 프로그램에 접속하셔서 [회계/결산] 메뉴의 '결산 보고'를 확인해 주시기 바랍니다.

🔗 스마트폰 전용 링크: ${appUrl}

보고자: 소나무 족구단 총무 (인)`;

    // 4. 공유 시도
    if (navigator.share && isMobile) {
        try {
            await navigator.share({
                title: `소나무 족구단 ${isYearly?'연간':'월간'} 결산 보고`,
                text: msg,
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Share Error:", err);
                window.showAlert("공유 중 오류가 발생했습니다.");
            }
        }
    } else {
        // [Fallback] 클립보드 복사
        try {
            const textArea = document.createElement("textarea");
            textArea.value = msg;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                window.showToast("보고서 내용이 클립보드에 복사되었습니다! 카카오톡 등에 붙여넣어 공유하세요.");
            } else {
                throw new Error("Copy failed");
            }
        } catch (err) {
            console.error("Copy Error:", err);
            window.showAlert("클립보드 복사에 실패했습니다. 수동으로 복사해주세요.");
        }
    }
};

window.handleReceiptSelect = async (el) => {
    const file = el.files[0];
    if(!file) return;
    window.$('receipt-filename').innerText = file.name;
    window.$('btn-receipt-clear').classList.remove('hidden');
    const preview = window.$('receipt-preview-img');
    const container = window.$('receipt-preview-container');
    if(preview) preview.src = URL.createObjectURL(file);
    if(container) container.classList.remove('hidden');
};

window.clearReceipt = () => {
    const input = window.$('expense-receipt');
    if(input) input.value = '';
    const fn = window.$('receipt-filename');
    if(fn) fn.innerText = '첨부된 사진 없음';
    const bc = window.$('btn-receipt-clear');
    if(bc) bc.classList.add('hidden');
    const pc = window.$('receipt-preview-container');
    if(pc) pc.classList.add('hidden');
    const pi = window.$('receipt-preview-img');
    if(pi) pi.src = '';
};

window.viewReceipt = (url) => {
    if(!url) return;
    const img = window.$('image-viewer-img');
    if(img) img.src = url;
    window.setHtml('image-viewer-info', `영수증 확인`);
    const btnDel = window.$('btn-delete-photo');
    if(btnDel) btnDel.classList.add('hidden');
    const m = window.$('image-viewer-modal');
    if(m) { 
        m.classList.remove('hidden'); 
        m.classList.add('flex'); 
        setTimeout(() => m.classList.add('opacity-100'), 10); 
    }
};
