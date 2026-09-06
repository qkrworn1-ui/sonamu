// --- [17. 탭: 소나무 일정 (달력형 스케줄러)] ---
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();
let editingCalendarEventId = null;

// 특정 날짜(양력 기준)의 생일자 추출 함수 (음력 생일은 해당 연도 기준으로 환산)
const getBirthdaysOnDate = (year, month, day) => {
    const list = [];
    (window.members || []).forEach(m => {
        if (!m.birth) return;
        const parts = m.birth.split('-');
        if (parts.length < 3) return;
        const bMonth = parseInt(parts[1]);
        const bDay = parseInt(parts[2]);
        
        let sMonth, sDay;
        if (m.birthType === 'lunar' && typeof KoreanLunarCalendar !== 'undefined') {
            try {
                const calendar = new KoreanLunarCalendar();
                calendar.setLunarDate(year, bMonth, bDay, false);
                const sol = calendar.getSolarCalendar();
                sMonth = sol.month;
                sDay = sol.day;
            } catch (e) {
                sMonth = bMonth; sDay = bDay;
            }
        } else {
            sMonth = bMonth;
            sDay = bDay;
        }
        
        if (sMonth === (month + 1) && sDay === day) {
            list.push(m);
        }
    });
    return list;
};

window.renderCalendar = () => {
    const displayEl = window.$('calendar-month-display');
    if (!displayEl) return;
    
    // 헤더 년월 표시
    displayEl.innerText = `${currentCalendarYear}년 ${String(currentCalendarMonth + 1).padStart(2, '0')}월`;
    
    // 관리자만 일정 등록 버튼 표시
    const addBtn = window.$('btn-add-calendar-event');
    if (addBtn) {
        if (window.isNoticeAdmin()) {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }
    }
    
    const daysGrid = window.$('calendar-days-grid');
    if (!daysGrid) return;
    daysGrid.innerHTML = '';
    
    const todayStr = window.getTodayString();
    
    // 해당 월의 첫 날 요일 및 총 일수 계산
    const firstDayIndex = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
    const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    
    // 이전 달의 총 일수
    const prevTotalDays = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    
    let html = '';
    
    // 1. 이전 달 날짜 채우기 (Muted 처리)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = prevTotalDays - i;
        // 이전 달의 연/월 계산
        let pm = currentCalendarMonth - 1;
        let py = currentCalendarYear;
        if (pm < 0) { pm = 11; py--; }
        const dateStr = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        html += renderDayCell(py, pm, d, dateStr, true, todayStr);
    }
    
    // 2. 이번 달 날짜 채우기
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        html += renderDayCell(currentCalendarYear, currentCalendarMonth, d, dateStr, false, todayStr);
    }
    
    // 3. 다음 달 날짜 채우기 (Muted 처리 - 그리드 42칸 맞추기)
    const remainingCells = 42 - (firstDayIndex + totalDays);
    for (let d = 1; d <= remainingCells; d++) {
        // 다음 달의 연/월 계산
        let nm = currentCalendarMonth + 1;
        let ny = currentCalendarYear;
        if (nm > 11) { nm = 0; ny++; }
        const dateStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        html += renderDayCell(ny, nm, d, dateStr, true, todayStr);
    }
    
    daysGrid.innerHTML = html;
    
    if (window.lucide) window.lucide.createIcons();
};

// 개별 날짜 셀 렌더러
function renderDayCell(year, month, day, dateStr, isMuted, todayStr) {
    const isToday = dateStr === todayStr;
    const dayOfWeek = new Date(year, month, day).getDay();
    
    // 요일별 텍스트 색상 클래스
    let dayColorClass = 'text-slate-700';
    if (dayOfWeek === 0) dayColorClass = 'text-rose-500'; // 일요일
    else if (dayOfWeek === 6) dayColorClass = 'text-blue-500'; // 토요일
    
    // 셀 배경 및 테두리 스타일
    let cellBgClass = 'bg-white hover:bg-slate-50/70';
    let cellBorderClass = 'border-slate-100';
    
    if (isMuted) {
        cellBgClass = 'bg-slate-50/40 text-slate-300';
        dayColorClass = dayOfWeek === 0 ? 'text-rose-300' : (dayOfWeek === 6 ? 'text-blue-300' : 'text-slate-300');
    }
    
    if (isToday) {
        cellBgClass = 'bg-amber-50/40';
        cellBorderClass = 'border-amber-200 ring-2 ring-amber-400/50 ring-inset';
    }
    
    // 해당 날짜의 소나무일정 및 운동(경기)일정 조회
    const dayEvents = (window.calendarEvents || []).filter(e => e.date === dateStr);
    const regularEvents = (window.teamEvents || []).filter(e => {
        // regularEvent의 repeatMode가 없는 경우 단순 비교
        if (!e.repeatMode || e.repeatMode === 'none') {
            return e.date === dateStr;
        } else {
            // 반복 일정인 경우, 해당 요일/일자가 매칭되는지 확인
            const curDate = new Date(year, month, day);
            if (e.repeatMode === 'weekly' && Array.isArray(e.repeatData)) {
                return e.repeatData.includes(curDate.getDay()) && e.date <= dateStr;
            } else if (e.repeatMode === 'monthly' && e.repeatData) {
                if (e.date > dateStr) return false;
                const nw = parseInt(e.repeatData.week), tdDay = parseInt(e.repeatData.day);
                let fd = new Date(year, month, 1).getDay(), off = tdDay - fd;
                if (off < 0) off += 7;
                let trg = 1 + off + (nw <= 4 ? (nw - 1) * 7 : 0);
                if (nw > 4) { let ld = new Date(year, month + 1, 0).getDate(); while (trg + 7 <= ld) trg += 7; }
                return day === trg;
            }
            return false;
        }
    });
    
    let eventsHtml = '';
    
    // 1. 경기 일정 분기 렌더링 (반복 정기 운동은 공아이콘 🏐으로, 1회성 일정은 텍스트 배지로 표시)
    const recurringEvents = regularEvents.filter(e => e.repeatMode && e.repeatMode !== 'none');
    const oneTimeEvents = regularEvents.filter(e => !e.repeatMode || e.repeatMode === 'none');
    
    if (recurringEvents.length > 0) {
        eventsHtml += '<div class="flex flex-wrap gap-1 mb-1.5">';
        recurringEvents.forEach(e => {
            eventsHtml += `
                <div onclick="event.stopPropagation(); window.showTab('teams'); window.setVal('team-event-select','${e.id}'); window.changeTeamEvent();" 
                     class="w-5 h-5 rounded-full flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 cursor-pointer transition-all shadow-sm shrink-0" 
                     title="정기 운동: ${window.escapeHtml(e.title)} (${e.time || ''})"
                     style="font-size: 10px;">
                     🏐
                </div>
            `;
        });
        eventsHtml += '</div>';
    }
    
    oneTimeEvents.forEach(e => {
        eventsHtml += `
            <div onclick="event.stopPropagation(); window.showTab('teams'); window.setVal('team-event-select','${e.id}'); window.changeTeamEvent();" 
                 class="truncate text-[9px] font-black py-0.5 px-1.5 rounded-lg w-full text-left bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-0.5 shadow-sm"
                 title="운동: ${window.escapeHtml(e.title)}">
                 <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                 <span>${window.escapeHtml(e.title)}</span>
            </div>
        `;
    });
    
    // 2. 등록된 소나무 일정 렌더링 (대회: rose, 야유회: emerald, 행사: amber, 기타: slate)
    dayEvents.forEach(e => {
        let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
        let dotColor = 'bg-slate-500';
        
        if (e.type === '대회') {
            badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
            dotColor = 'bg-rose-500';
        } else if (e.type === '야유회') {
            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            dotColor = 'bg-emerald-500';
        } else if (e.type === '행사') {
            badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
            dotColor = 'bg-amber-500';
        } else if (e.type === '기타') {
            badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
            dotColor = 'bg-indigo-500';
        }
        
        eventsHtml += `
            <div onclick="event.stopPropagation(); window.openEditCalendarEvent('${e.id}')" 
                 class="truncate text-[9px] font-black py-0.5 px-1.5 rounded-lg w-full text-left border hover:brightness-95 transition-all cursor-pointer flex items-center gap-0.5 shadow-sm ${badgeClass}"
                 title="${e.type}: ${window.escapeHtml(e.title)}">
                 <span class="w-1.5 h-1.5 rounded-full ${dotColor} shrink-0"></span>
                 <span>${window.escapeHtml(e.title)}</span>
            </div>
        `;
    });
    
    // 3. 생일자 렌더링 (케이크 🎂 아이콘 및 핑크색 배지)
    const birthdays = getBirthdaysOnDate(year, month, day);
    birthdays.forEach(m => {
        const isLunar = m.birthType === 'lunar';
        const typeLabel = isLunar ? ' (음력)' : '';
        const displayLabel = isLunar ? ' (음)' : '';
        eventsHtml += `
            <div class="truncate text-[9px] font-black py-0.5 px-1.5 rounded-lg w-full text-left bg-pink-50 text-pink-700 border border-pink-100 flex items-center gap-0.5 shadow-sm"
                 title="생일 축하: ${window.escapeHtml(m.name)}${typeLabel} (음력 생일: ${m.birth})">
                 <span>🎂</span>
                 <span>${window.escapeHtml(m.name)} 생일${displayLabel}</span>
            </div>
        `;
    });
    
    const clickHandler = window.isNoticeAdmin() ? `onclick="window.openAddCalendarEvent('${dateStr}')"` : '';
    const cursorStyle = window.isNoticeAdmin() ? 'cursor-pointer' : '';
    
    return `
        <div ${clickHandler} class="flex flex-col min-h-[75px] md:min-h-[90px] p-1.5 ${cellBgClass} ${cellBorderClass} ${cursorStyle} transition-all duration-150 relative">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-black ${dayColorClass} ${isToday ? 'bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center' : ''}">${day}</span>
                ${isToday ? '<span class="text-[8px] bg-amber-400 text-white px-1 rounded-md font-black uppercase">Today</span>' : ''}
            </div>
            <div class="flex flex-col gap-1 w-full overflow-hidden">
                ${eventsHtml}
            </div>
        </div>
    `;
}

// 캘린더 월 이동
window.changeCalendarMonth = (offset) => {
    currentCalendarMonth += offset;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    window.renderCalendar();
};

// 오늘 날짜로 이동
window.goTodayCalendar = () => {
    currentCalendarYear = new Date().getFullYear();
    currentCalendarMonth = new Date().getMonth();
    window.renderCalendar();
};

// 일정 등록 모달 열기
window.openAddCalendarEvent = (dateStr) => {
    if (!window.isNoticeAdmin()) return;
    
    editingCalendarEventId = null;
    window.setText('calendar-event-form-title', '일정 등록');
    window.setVal('cal-event-title', '');
    window.setVal('cal-event-type', '대회');
    window.setVal('cal-event-note', '');
    window.setVal('cal-event-date', dateStr || window.getTodayString());
    
    // 등록 시 삭제 버튼 숨기기
    const delBtn = window.$('btn-cal-event-delete');
    if (delBtn) delBtn.classList.add('hidden');
    
    // 입력 필드 활성화
    toggleFormFieldsDisabled(false);
    const submitBtn = window.$('btn-cal-event-submit');
    if (submitBtn) submitBtn.classList.remove('hidden');
    
    const m = window.$('calendar-event-modal');
    if (m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
        setTimeout(() => {
            m.classList.add('opacity-100');
            m.querySelector('.modal-content').classList.replace('scale-95', 'scale-100');
        }, 10);
    }
};

// 일정 수정/조회 모달 열기
window.openEditCalendarEvent = (eventId) => {
    const e = (window.calendarEvents || []).find(x => x.id === eventId);
    if (!e) return;
    
    editingCalendarEventId = e.id;
    const isAdmin = window.isNoticeAdmin();
    
    window.setText('calendar-event-form-title', isAdmin ? '일정 수정/관리' : '일정 상세 정보');
    window.setVal('cal-event-title', e.title);
    window.setVal('cal-event-type', e.type || '대회');
    window.setVal('cal-event-note', e.note || '');
    window.setVal('cal-event-date', e.date);
    
    const delBtn = window.$('btn-cal-event-delete');
    if (delBtn) {
        if (isAdmin) delBtn.classList.remove('hidden');
        else delBtn.classList.add('hidden');
    }
    
    const submitBtn = window.$('btn-cal-event-submit');
    if (submitBtn) {
        if (isAdmin) submitBtn.classList.remove('hidden');
        else submitBtn.classList.add('hidden');
    }
    
    // 권한에 따라 폼 비활성화
    toggleFormFieldsDisabled(!isAdmin);
    
    const m = window.$('calendar-event-modal');
    if (m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
        setTimeout(() => {
            m.classList.add('opacity-100');
            m.querySelector('.modal-content').classList.replace('scale-95', 'scale-100');
        }, 10);
    }
};

function toggleFormFieldsDisabled(disabled) {
    const titleInput = window.$('cal-event-title');
    const typeSelect = window.$('cal-event-type');
    const noteTextarea = window.$('cal-event-note');
    const dateInput = window.$('cal-event-date');
    
    if (titleInput) titleInput.disabled = disabled;
    if (typeSelect) typeSelect.disabled = disabled;
    if (noteTextarea) noteTextarea.disabled = disabled;
    if (dateInput) dateInput.disabled = disabled;
}

// 모달 닫기
window.closeCalendarEventModal = () => {
    const m = window.$('calendar-event-modal');
    if (m) {
        m.classList.remove('opacity-100');
        m.querySelector('.modal-content').classList.replace('scale-100', 'scale-95');
        setTimeout(() => {
            m.classList.add('hidden');
            m.classList.remove('flex');
            editingCalendarEventId = null;
        }, 200);
    }
};

// 일정 저장 확인
window.confirmSaveCalendarEvent = async () => {
    if (!window.isNoticeAdmin()) return;
    if (window.isSavingData) return;
    
    const title = window.$('cal-event-title').value.trim();
    const type = window.$('cal-event-type').value;
    const note = window.$('cal-event-note').value.trim();
    const date = window.$('cal-event-date').value;
    
    if (!title || !date) {
        return window.showAlert('일정 제목과 날짜를 입력해 주세요.');
    }
    
    window.isSavingData = true;
    
    if (editingCalendarEventId) {
        // 기존 일정 수정
        const e = (window.calendarEvents || []).find(x => x.id === editingCalendarEventId);
        if (e) {
            e.title = title;
            e.type = type;
            e.note = note;
            e.date = date;
        }
        window.showToast("일정이 정상적으로 수정되었습니다.");
    } else {
        // 신규 일정 등록
        const e = {
            id: 'cal_' + Date.now(),
            title: title,
            type: type,
            note: note,
            date: date
        };
        if (!window.calendarEvents) window.calendarEvents = [];
        window.calendarEvents.push(e);
        window.showToast("새 일정이 등록되었습니다.");
    }
    
    window.closeCalendarEventModal();
    window.renderCalendar();
    
    // Firestore 저장 호출 (sports 문서에 저장)
    await window.saveData('sports', true);
    window.isSavingData = false;
};

// 일정 삭제
window.deleteCalendarEvent = () => {
    if (!window.isNoticeAdmin()) return;
    if (!editingCalendarEventId) return;
    
    window.showConfirm("이 일정을 정말 삭제하시겠습니까?", async () => {
        if (window.isSavingData) return;
        window.isSavingData = true;
        
        window.calendarEvents = (window.calendarEvents || []).filter(e => e.id !== editingCalendarEventId);
        
        window.closeCalendarEventModal();
        window.renderCalendar();
        
        await window.saveData('sports', true);
        window.isSavingData = false;
    });
};
