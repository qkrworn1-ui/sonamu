// --- [2. 권한 및 모달 로직] ---
window.isFullAdmin = () => ['master','회장','총무','감독'].includes(sessionStorage.getItem('sonamu_user_role'));
window.isFinanceAdmin = () => ['master','회장','총무'].includes(sessionStorage.getItem('sonamu_user_role'));
window.isExpenseAdmin = () => ['master','회장','총무','감독'].includes(sessionStorage.getItem('sonamu_user_role'));
window.isTeamAdmin = () => ['master','회장','총무','감독','코치','플레잉코치'].includes(sessionStorage.getItem('sonamu_user_role'));
window.isNoticeAdmin = () => ['master','회장','총무','감독'].includes(sessionStorage.getItem('sonamu_user_role'));
window.isVotingAdmin = () => ['master','회장','총무','감독','코치','플레잉코치'].includes(sessionStorage.getItem('sonamu_user_role'));

window.showAlert = (msg, title="알림") => { const c=window.$('dialog-modal'); if(c) { window.setText('dialog-title', title); window.setText('dialog-message', msg); window.$('dialog-input').classList.add('hidden'); window.$('dialog-btn-cancel')?.classList.add('hidden'); const b=window.$('dialog-btn-confirm'); if(b) b.onclick=window.closeAlert; c.classList.remove('hidden'); c.classList.add('flex'); setTimeout(()=>{ c.classList.add('opacity-100'); window.$('dialog-content')?.classList.add('scale-100'); },10); } else alert(msg); };
window.closeAlert = () => { const c=window.$('dialog-modal'); if(!c) return; c.classList.remove('opacity-100'); window.$('dialog-content')?.classList.remove('scale-100'); setTimeout(()=>{ c.classList.add('hidden'); c.classList.remove('flex'); },200); };
window.showConfirm = (msg, cb, title="확인") => { const c=window.$('dialog-modal'); if(c) { window.setText('dialog-title', title); window.setText('dialog-message', msg); window.$('dialog-input').classList.add('hidden'); const cc=window.$('dialog-btn-cancel'); if(cc){ cc.classList.remove('hidden'); cc.onclick=window.closeAlert; } const oc=window.$('dialog-btn-confirm'); if(oc){ oc.onclick=()=>{ window.closeAlert(); if(cb) cb(); }; } c.classList.remove('hidden'); c.classList.add('flex'); setTimeout(()=>{ c.classList.add('opacity-100'); window.$('dialog-content')?.classList.add('scale-100'); },10); } else if(confirm(msg)) cb(); };
window.showPrompt = (title, desc, def, cb) => { const c=window.$('dialog-modal'); if(c) { window.setText('dialog-title', title); window.setText('dialog-message', desc); const i=window.$('dialog-input'); i.classList.remove('hidden'); i.value=def||''; const cc=window.$('dialog-btn-cancel'); if(cc){ cc.classList.remove('hidden'); cc.onclick=window.closeAlert; } const oc=window.$('dialog-btn-confirm'); if(oc){ oc.onclick=()=>{ const v=i.value.trim(); if(!v) return window.showAlert("입력 요망"); window.closeAlert(); cb(v); }; } c.classList.remove('hidden'); c.classList.add('flex'); setTimeout(()=>{ c.classList.add('opacity-100'); window.$('dialog-content')?.classList.add('scale-100'); },10); } };
window.showToast = m => { const t=window.$('toast'); if(!t) return; window.setText('toast-text', m); t.classList.remove('translate-y-32', 'opacity-0'); setTimeout(()=>t.classList.add('translate-y-32', 'opacity-0'), 2500); };

window.closeModal = (id, cid) => { const m=window.$(id); if(!m) return; m.classList.remove('opacity-100'); const c=window.$(cid); if(c) c.classList.remove('scale-100'); setTimeout(()=>{ m.classList.add('hidden'); m.classList.remove('flex'); },200); };
window.closeSpecialDuesModal = () => window.closeModal('special-dues-modal', 'special-dues-modal-content-wrapper');
window.closeMemoModal = () => window.closeModal('memo-modal', 'memo-modal-content');
window.closeMemberSelectModal = () => window.closeModal('member-select-modal', null);
window.closeAccountSelectModal = () => window.closeModal('account-select-modal', null);

const incomeAccountsList = ['월회비', '년회비', '찬조금(회원)', '특별찬조(비회원)', '면제', '식대(개별납부)', '은행이자및캐쉬백', '상금/대체입금', '직접입력'];
const expenseAccountsList = ['식대', '생수및간식', '용품', '대한족구협회비', '구리시족구협회비', '찬조금', '경조사비', '행사준비비', '직접입력'];

window.openAccountSelectModal = (type) => {
    const m = window.$('account-select-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => m.classList.add('opacity-100'), 10); }
    window.setText('account-modal-title', type === 'income' ? '수입 항목 선택' : '지출 항목 선택');
    const accounts = type === 'income' ? incomeAccountsList : expenseAccountsList;
    
    window.setHtml('account-select-list', accounts.map(a => {
        const isCustom = a === '직접입력';
        return `<button onclick="window.selectAccount('${type}', '${a}')" class="bg-slate-50 border border-slate-200 py-3.5 px-2 rounded-xl font-black text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors btn-touch text-sm text-center shadow-sm w-full ${isCustom ? 'col-span-2 bg-slate-100' : ''}">${a}</button>`;
    }).join(''));
    if(window.lucide) window.lucide.createIcons();
};

window.selectAccount = (type, value) => {
    const input = window.$(`${type}-account`);
    const display = window.$(`${type}-account-display`);
    const btn = window.$(`btn-${type}-account`);
    
    if (value === '직접입력') {
        display.innerText = '직접입력';
        input.value = '';
        input.classList.remove('hidden');
        setTimeout(() => input.focus(), 100);
    } else {
        display.innerText = value;
        input.value = value;
        input.classList.add('hidden');
    }
    
    if(btn) { btn.classList.remove('text-slate-400'); btn.classList.add('text-slate-800'); }
    
    if (type === 'income') {
        const memberBtn = window.$('btn-income-member');
        const memberDisplay = window.$('income-member-display');
        
        if (value.includes('특별찬조') || value === '은행이자및캐쉬백') {
            if(memberBtn) {
                memberBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-slate-50');
            }
            if(memberDisplay) memberDisplay.innerText = value === '은행이자및캐쉬백' ? '해당없음 (비고란 입력)' : '비회원 (비고란에 성명 입력)';
            window.setVal('income-member', ''); // 회원 선택 해제
        } else {
            if(memberBtn) {
                memberBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-slate-50');
            }
            const curMem = window.$('income-member')?.value;
            if(memberDisplay) memberDisplay.innerText = curMem || '회원 선택';
        }

        window.updatePaidMonthsUI();
        window.autoPrice();
        const noteEl = window.$('income-note');
        if(noteEl) {
            if(value.includes('특별찬조') || value.includes('찬조금') || value === '직접입력' || value.includes('식대') || value === '은행이자및캐쉬백' || value === '상금/대체입금') {
                noteEl.classList.remove('hidden');
                noteEl.placeholder = value.includes('비회원') ? '비고 (성명, 내역 등 기재)' : (value === '상금/대체입금' ? '비고 (대회명, 입금자명, 내역 등 기재)' : (value === '은행이자및캐쉬백' ? '비고 (예금이자, 캐쉬백 등)' : '비고 (내용 등)'));
            }
            else {
                noteEl.classList.add('hidden');
            }
        }
    }
    window.closeAccountSelectModal();
};

window.openMemberSelectModal = () => {
    const m = window.$('member-select-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => m.classList.add('opacity-100'), 10); }
    window.setHtml('member-select-list', window.getSortedMembers().filter(x=>x.role!=='파트너' && x.role!=='준회원' && x.role!=='초청선수').map(x=>`<button onclick="window.selectIncomeMember('${x.name}')" class="bg-slate-50 border border-slate-200 py-3.5 px-2 rounded-xl font-black text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors btn-touch text-sm text-center shadow-sm w-full">${x.name}</button>`).join(''));
    if(window.lucide) window.lucide.createIcons();
};

window.selectIncomeMember = (name) => {
    window.setVal('income-member', name);
    const b = window.$('income-member-display');
    if(b) { b.innerText = name; window.$('btn-income-member').classList.remove('text-slate-400'); window.$('btn-income-member').classList.add('text-slate-800'); }
    window.updatePaidMonthsUI();
    window.autoPrice();
    window.closeMemberSelectModal();
};
