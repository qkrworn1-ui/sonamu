// --- [1. 유틸 및 초기화] ---
window.isSavingData = false;

window.hashString = async (str) => {
    if(!str) return '';
    try {
        if (window.crypto && window.crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(str + "sonamu_salt_2024!");
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch(e) { console.warn("암호화 폴백 사용"); }
    return btoa(encodeURIComponent(str + "sonamu_salt_2024!"));
};

window.escapeHtml = (str) => {
    if(typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[match]);
};

let dbSizes = { members: 0, finance: 0, sports: 0, board: 0, gallery: 0 };
let currentLedgerMonthStr="", members=[], transactions=[], teamEvents=[], calendarEvents=[], posts=[], specialDues=[], deletedMembers=[], deletedTransactions=[], reportNotes={}, galleryPhotos=[], mileageStartDate = "2024-01-01";
let luckyWinners = {}; let luckMileageAmount = 10; let luckMileageCount = 2; let accessLog = {};

// [초고속 로그인] 로컬 스토리지에 캐시된 회원 정보가 있으면 0.0001초 만에 즉시 메모리에 적재
try {
    const cachedM = localStorage.getItem('sonamu_cached_members');
    if (cachedM) members = JSON.parse(cachedM);
} catch(e) {}

// [스코프 보정] 외부 스크립트(dashboard-charts.js 등) 접근을 위해 window 객체에 연결
window.updateGlobalRefs = () => {
    window.members = members;
    window.transactions = transactions;
    window.teamEvents = teamEvents;
    window.calendarEvents = calendarEvents;
    window.posts = posts;
    window.galleryPhotos = galleryPhotos;
};
let currentGalleryPage=1;
let user=null, currentVoteTeamId=null, currentVotePostId=null, currentVoteAnonId=null, currentTeamEventId=null, currentTeamSubTab='match', editingMemberId=null, editingTransactionId=null, editingPostId=null, editingSpecialDueId=null, editingTeamEventId=null, currentStatusYear=new Date().getFullYear(), currentPhotoId=null;
let isShowingTrash={ member:false, income:false, expense:false }, isShowingClosedDues=false, isShowingPartners=false, isShowingEndedPosts=false, showOnlyRegularAct = true;
const roleColors = { 
    '회장':'#ef4444', '총무':'#3b82f6', '감독':'#8b5cf6', '코치':'#f59e0b', '플레잉코치':'#0ea5e9', 
    '파트너':'#ec4899', '준회원':'#94a3b8', '감사':'#06b6d4', '고문':'#6b7280', '일반회원':'#3b82f6', 'master':'#000000' 
};
window.getDivisionBadgeClass = (div) => {
    switch (div) {
        case '1부': return 'bg-rose-50 text-rose-700 border-rose-200';
        case '2부': return 'bg-amber-50 text-amber-700 border-amber-200';
        case '3부': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case '4부': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case '5부': return 'bg-purple-50 text-purple-700 border-purple-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

// [고도화] 마일리지 전용 통합 계산 엔진 v3.5 (단일화 및 무한 루프 방지)
window.calculateMemberPoints = (member, events = teamEvents, noticePosts = posts) => {
    const targetYear = window.currentMileageYear || new Date().getFullYear().toString();
    return window.getMemberCalculatedScore(member, events, noticePosts, targetYear);
};

let rankCache = { data: [], timestamp: 0 };

window.getTodayString = () => { const t=new Date(); t.setMinutes(t.getMinutes()-t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
window.setRelativeDate = (id, off) => { let d=new Date(); d.setDate(d.getDate()+off); document.getElementById(id).value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
window.$ = id => document.getElementById(id);
window.getVal = id => { const e=window.$(id); return e ? e.value : ''; };
window.setVal = (id, v='') => { const e=window.$(id); if(e) e.value=v; };
window.setHtml = (id, h) => { const e=window.$(id); if(e) e.innerHTML=h; };
window.setText = (id, t) => { const e=window.$(id); if(e) e.innerText=t; };

window.toggleEndedVoteList = () => {
    const list = window.$('ended-vote-list-container');
    const label = window.$('btn-toggle-ended-label');
    const icon = window.$('icon-toggle-ended');
    if(!list || !label || !icon) return;
    
    const isHidden = list.classList.contains('hidden');
    if(isHidden) {
        list.classList.remove('hidden');
        label.innerText = '접기';
        icon.classList.add('rotate-180');
    } else {
        list.classList.add('hidden');
        label.innerText = '보기';
        icon.classList.remove('rotate-180');
    }
};

window.toggleDbCapacityDetail = () => {
    const list = window.$('db-capacity-detail');
    const label = window.$('btn-toggle-db-label');
    const icon = window.$('icon-toggle-db');
    if(!list || !label || !icon) return;
    
    const isHidden = list.classList.contains('hidden');
    if(isHidden) {
        list.classList.remove('hidden');
        list.classList.add('animate-fadeIn');
        label.innerText = '데이터 용량 접기';
        icon.classList.add('rotate-180');
    } else {
        list.classList.add('hidden');
        label.innerText = '데이터 용량 보기';
        icon.classList.remove('rotate-180');
    }
};

window.copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
        document.execCommand('copy');
        window.showToast("계좌번호가 복사되었습니다.");
    } catch (err) {
        window.showAlert("복사에 실패했습니다. 직접 선택하여 복사해주세요.");
    }
    document.body.removeChild(el);
};

const FIREBASE_CONFIG = { apiKey: "AIzaSyAnkGVAlO39p6rnTEibygeQTBYDbp505dA", authDomain: "sonamu-jokgu-club.firebaseapp.com", projectId: "sonamu-jokgu-club", storageBucket: "sonamu-jokgu-club.firebasestorage.app", messagingSenderId: "4409664943", appId: "1:4409664943:web:e0a5f08c6811bcfa327b5a" };
if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore(), auth = firebase.auth(), storage = firebase.storage();

// [속도 최적화] 브라우저 IndexedDB 로컬 캐시 활성화 (초기 로딩 0.1초대 단축)
try {
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        console.warn("Firestore Persistence:", err.code);
    });
} catch(e) { console.warn("Persistence init error:", e); }

// [수정/강화] 4개의 개별 상자(Document)로 분할
const colRef = db.collection('sonamu_club_data');
const docMembers = colRef.doc('doc_members');
const docFinance = colRef.doc('doc_finance');
const docSports = colRef.doc('doc_sports');
const docBoard = colRef.doc('doc_board');
const docGallery = colRef.doc('doc_gallery');
