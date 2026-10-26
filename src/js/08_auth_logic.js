// --- [관리자 전용] 데이터 복구(Restore) 로직 ---
window.handleRestoreUpload = (input) => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // 기본 구조 검증 (최소한의 필드 체크)
            if (!data.members && !data.transactions && !data.teamEvents) {
                return window.showAlert("올바른 백업 파일 형식이 아닙니다.");
            }

            window.showConfirm("⚠️ 주의: 업로드한 파일로 현재 모든 데이터를  덮어쓰시겠습니까?\n이 작업은 취소할 수 없으며 시스템이 즉시 재시작됩니다.", async () => {
                if(window.isSavingData) return; window.isSavingData = true;
                try {
                    // 데이터 전역 변수 동기화
                    if (data.members) members = data.members;
                    if (data.deletedMembers) deletedMembers = data.deletedMembers;
                    if (data.transactions) transactions = data.transactions;
                    if (data.deletedTransactions) deletedTransactions = data.deletedTransactions;
                    if (data.specialDues) specialDues = data.specialDues;
                    if (data.reportNotes) reportNotes = data.reportNotes;
                    if (data.reportAgendas) reportAgendas = data.reportAgendas;
                    if (data.teamEvents) teamEvents = data.teamEvents;
                    if (data.matchHistory) matchHistory = data.matchHistory;
                    if (data.luckyWinners) luckyWinners = data.luckyWinners;
                    if (data.posts) posts = data.posts;
                    const recPhotos = data.photos || data.galleryPhotos || data.gallery || (data.doc_gallery && (data.doc_gallery.photos || data.doc_gallery.galleryPhotos || data.doc_gallery.gallery));
                    if (recPhotos) {
                        galleryPhotos = Array.isArray(recPhotos) ? recPhotos : Object.values(recPhotos);
                        window.galleryPhotos = galleryPhotos;
                    }
                    if (typeof data.luckMileageAmount === 'number') luckMileageAmount = data.luckMileageAmount;
                    if (typeof data.luckMileageCount === 'number') luckMileageCount = data.luckMileageCount;
                    if (data.accessLog) accessLog = data.accessLog;

                    await window.saveData('all', true);
                    window.showAlert("✅ 데이터 복구가 완료되었습니다. 시스템을 다시 인식합니다.", () => {
                        window.location.reload();
                    });
                } catch (err) {
                    window.showAlert("복구 중 오류가 발생했습니다: " + err.message);
                } finally {
                    window.isSavingData = false;
                }
            });
        } catch (err) {
            window.showAlert("파일을 읽는 중 오류가 발생했습니다: " + err.message);
        }
        input.value = ""; // 초기화
    };
    reader.readAsText(file);
};


// --- [구글 간편 로그인 및 계정 연동 로직] ---

// [로그인 화면 탭 전환 및 선호 탭 관리]
window.switchLoginTab = (tab, savePreference = true) => {
    const btnGoogle = document.getElementById('tab-btn-google');
    const btnPw = document.getElementById('tab-btn-pw');
    const panelGoogle = document.getElementById('panel-login-google');
    const panelPw = document.getElementById('panel-login-pw');

    if (!btnGoogle || !btnPw || !panelGoogle || !panelPw) return;

    if (tab === 'pw') {
        btnGoogle.classList.remove('active');
        btnPw.classList.add('active');
        panelGoogle.classList.add('hidden');
        panelPw.classList.remove('hidden');

        // 데스크톱 환경에서는 ID 탭 전환 시 입력창 자동 포커스
        if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
            const idEl = document.getElementById('login-id');
            if (idEl && !idEl.value) {
                try { idEl.focus(); } catch (e) {}
            }
        }
    } else {
        btnGoogle.classList.add('active');
        btnPw.classList.remove('active');
        panelGoogle.classList.remove('hidden');
        panelPw.classList.add('hidden');
    }

    if (savePreference && typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem('sonamu_preferred_login_tab', tab);
        } catch (e) {}
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch(e) {}
    }
};

// [초기화] 이전 선호 탭 복원 (기본값은 'google' 간편인증 탭)
window.initLoginTabPreference = () => {
    try {
        const preferredTab = localStorage.getItem('sonamu_preferred_login_tab');
        if (preferredTab === 'pw') {
            window.switchLoginTab('pw', false);
        } else {
            window.switchLoginTab('google', false);
        }
    } catch (e) {
        window.switchLoginTab('google', false);
    }
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initLoginTabPreference);
} else {
    window.initLoginTabPreference();
}

window._pendingGoogleUser = null;

const GOOGLE_CLIENT_ID = '4409664943-ld7hsd1b1thbqv59af0utrhc2e2v68b1.apps.googleusercontent.com';
window.gisTokenClient = null;

// [신규] Google Identity Services (GIS) 최신 공식 클라이언트 초기화 (승인된 도메인 연동)
window.initGIS = () => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        try {
            window.gisTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'email profile openid',
                callback: async (tokenResponse) => {
                    const btn = window.$('btn-google-login');
                    if (tokenResponse && tokenResponse.access_token) {
                        try {
                            if (btn) {
                                btn.disabled = true;
                                btn.classList.add('opacity-70');
                                btn.innerHTML = `
                                    <div class="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin"></div>
                                    <span>Google 계정 확인 중...</span>
                                `;
                            }
                            const credential = firebase.auth.GoogleAuthProvider.credential(null, tokenResponse.access_token);
                            const authResult = await firebase.auth().signInWithCredential(credential);
                            if (authResult && authResult.user) {
                                await window.processGoogleUserLogin(authResult.user);
                            } else {
                                throw new Error("사용자 정보를 불러오지 못했습니다.");
                            }
                        } catch (err) {
                            console.error("GIS signInWithCredential error:", err);
                            window.showAlert("구글 계정 인증 처리 중 오류가 발생했습니다:\n" + (err.message || err.code));
                        } finally {
                            if (btn) {
                                btn.disabled = false;
                                btn.classList.remove('opacity-70');
                                btn.innerHTML = `
                                    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                    </svg>
                                    <span>Google 계정으로 시작하기</span>
                                `;
                            }
                        }
                    }
                },
                error_callback: (err) => {
                    console.warn("GIS token client error:", err);
                    const btn = window.$('btn-google-login');
                    if (btn) {
                        btn.disabled = false;
                        btn.classList.remove('opacity-70');
                    }
                }
            });
            console.log("✅ Google Identity Services (GIS) client ready!");
        } catch(e) {
            console.warn("GIS init exception:", e);
        }
    }
};
window.initGIS();
setTimeout(window.initGIS, 1000);
setTimeout(window.initGIS, 2500);

// [보안/환경 안내] 모바일 브라우저 쿠키/웹 저장소 제한 시 친절한 한글 안내 모달
window.showGoogleStorageGuidanceModal = (rawError = null) => {
    const msg = 
        "구글 로그인 브라우저 캐시 / 환경 안내\n\n" +
        "현재 브라우저에 저장된 이전 버전 캐시 또는 보안 설정으로 인해 구글 로그인이 원활하지 않습니다.\n\n" +
        "【권장 해결 조치】\n" +
        "아래 [캐시 초기화]를 누르시면 최신 코드로 즉시 자동 갱신됩니다.\n" +
        "(또는 아래 기존 아이디 / 비밀번호로도 즉시 정상 로그인하실 수 있습니다.)";
    
    if (window.showConfirm) {
        window.showConfirm(
            msg,
            () => {
                window.location.href = window.location.pathname + '?clear-cache=' + Date.now();
            },
            "구글 로그인 환경 갱신",
            "지금 캐시 초기화 및 새로고침",
            "닫기"
        );
    } else {
        if (confirm(msg + "\n\n지금 캐시를 초기화하고 새로고침하시겠습니까?")) {
            window.location.href = window.location.pathname + '?clear-cache=' + Date.now();
        }
    }
};

// [공통 처리] 구글 사용자 계정 검증 및 매칭 로직 (팝업/리다이렉트 공통)
window.processGoogleUserLogin = async (gUser) => {
    if (!gUser) throw new Error("사용자 정보를 불러올 수 없습니다.");

    // 회원 목록 로드 대기 (최대 3초)
    if (!members || members.length === 0) {
        try {
            const cachedM = localStorage.getItem('sonamu_cached_members');
            if (cachedM) members = JSON.parse(cachedM);
        } catch(e) {}
    }
    if (!members || members.length === 0) {
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 200));
            if (typeof members !== 'undefined' && members && members.length > 0) break;
        }
    }

    // Case 1: 이미 구글 UID로 연동된 회원인 경우 즉시 입장
    const uidMatch = (members || []).find(m => m.googleUid === gUser.uid);
    if (uidMatch) {
        if (window.showToast) window.showToast(`${uidMatch.name}님, 환영합니다!`);
        window.finalizeMemberLogin(uidMatch, true);
        return;
    }

    // Case 2: 회원 DB에 이메일이 등록되어 있고 일치하는 경우 자동 매칭
    const emailMatch = (members || []).find(m => m.email && gUser.email && m.email.trim().toLowerCase() === gUser.email.trim().toLowerCase());
    if (emailMatch) {
        emailMatch.googleUid = gUser.uid;
        emailMatch.googleEmail = gUser.email;
        if (gUser.photoURL && !emailMatch.profilePhoto) emailMatch.googlePhoto = gUser.photoURL;
        await window.saveData('members', true);
        if (window.showToast) window.showToast(`이메일(${gUser.email}) 일치로 자동 연동되었습니다.`);
        window.finalizeMemberLogin(emailMatch, true);
        return;
    }

    // Case 3: 최초 구글 로그인 - 기존 회원 정보와 1회 매칭 모달 오픈
    window.openGoogleLinkModal(gUser);
};

// [리다이렉트 로그인 결과 자동 감지] 모바일 환경에서 페이지 복귀 시 처리
window.checkGoogleRedirectResult = async () => {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    const isRedirecting = sessionStorage.getItem('sonamu_google_redirecting') === '1';
    const googleBtn = document.getElementById('btn-google-login');
    if (isRedirecting && googleBtn) {
        googleBtn.disabled = true;
        googleBtn.classList.add('opacity-70');
        googleBtn.innerHTML = `
            <div class="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Google 계정 확인 중...</span>
        `;
    }

    try {
        const result = await firebase.auth().getRedirectResult();
        if (result && result.user) {
            sessionStorage.removeItem('sonamu_google_redirecting');
            await window.processGoogleUserLogin(result.user);
        } else {
            sessionStorage.removeItem('sonamu_google_redirecting');
            if (googleBtn && isRedirecting) {
                googleBtn.disabled = false;
                googleBtn.classList.remove('opacity-70');
                googleBtn.innerHTML = `
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google로 로그인</span>
                `;
            }
        }
    } catch (err) {
        sessionStorage.removeItem('sonamu_google_redirecting');
        const googleBtn = document.getElementById('btn-google-login');
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.classList.remove('opacity-70');
            googleBtn.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google로 로그인</span>
            `;
        }
        console.error("Google redirect result error:", err);
        const errMsg = (err && (err.message || err.code || '')) + '';
        const isStorageIssue = 
            err.code === 'auth/operation-not-supported-in-this-environment' || 
            err.code === 'auth/web-storage-unsupported' ||
            errMsg.includes('web storage') ||
            errMsg.includes('location.protocol') ||
            errMsg.includes('operation-not-supported');

        if (isStorageIssue) {
            window.showGoogleStorageGuidanceModal(err);
        } else if (err.code && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
            window.showAlert("구글 로그인 처리 중 오류가 발생했습니다:\n" + errMsg);
        }
    }
};

window.handleGoogleLogin = async () => {
    // 0. 서버 연결 전 비활성화 가드
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn && googleBtn.disabled) {
        return window.showAlert("서버 연결 중입니다. 잠시 후 다시 시도해주세요.", "연결 확인");
    }

    // 1. 카카오톡 인앱 브라우저 체크 (구글 OAuth 차단 사전 방어)
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('kakaotalk')) {
        return window.showAlert(
            "카카오톡 인앱 브라우저에서는 구글 보안 정책상 로그인이 제한됩니다.\n\n" +
            "화면 우측 하단 점 3개(···)를 누르고 '다른 브라우저로 열기(Safari/Chrome)'를 이용하시거나, 아래 기존 아이디/비밀번호로 로그인해주세요.",
            "브라우저 안내"
        );
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
        return window.showAlert("인증 시스템을 준비 중입니다. 잠시 후 다시 시도해주세요.");
    }

    // 2. [최우선] Google Identity Services (GIS) 최신 공식 인증 사용
    // 승인된 원본(https://qkrworn1-ui.github.io)을 통해 브라우저 iframe 제약 없이 원터치 로그인 실행
    if (window.gisTokenClient) {
        try {
            window.gisTokenClient.requestAccessToken({ prompt: 'select_account' });
            return;
        } catch (gisErr) {
            console.warn("GIS request error, falling back to Firebase Auth:", gisErr);
        }
    } else if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        window.initGIS();
        if (window.gisTokenClient) {
            try {
                window.gisTokenClient.requestAccessToken({ prompt: 'select_account' });
                return;
            } catch(e) {}
        }
    }

    const btn = window.$('btn-google-login');
    const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-70');
        btn.innerHTML = `
            <div class="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Google 인증 중...</span>
        `;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        // [중요 모바일 환경 최적화]
        // 모바일 브라우저(Android Chrome, iOS Safari 등)는 다중 창 팝업 및 크로스 도메인 iframe 통신이
        // 보안상 원천 차단되어 signInWithPopup 실행 시 "operation not supported" 에러가 발생합니다.
        // 따라서 모바일 환경에서는 Firebase 공식 권장 방식인 signInWithRedirect를 직접 호출하여 안전하게 이동합니다.
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                              (window.innerWidth <= 768 && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)));

        if (isMobileDevice) {
            try {
                sessionStorage.setItem('sonamu_google_redirecting', '1');
                await firebase.auth().signInWithRedirect(provider);
                return; // 모바일 전체 화면 구글 로그인으로 부드럽게 이동
            } catch (redirectErr) {
                sessionStorage.removeItem('sonamu_google_redirecting');
                console.warn("Direct mobile redirect threw error, falling back to popup:", redirectErr);
                try {
                    const popResult = await firebase.auth().signInWithPopup(provider);
                    if (popResult && popResult.user) {
                        await window.processGoogleUserLogin(popResult.user);
                        return;
                    }
                } catch (popupErr) {
                    console.error("Popup fallback also failed:", popupErr);
                }
                throw redirectErr;
            }
        }
        
        let gUser = null;
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            gUser = result ? result.user : null;
        } catch (popupErr) {
            console.warn("Popup sign-in error/warning:", popupErr);
            // 데스크톱 환경에서 팝업이 차단되거나 환경 미지원 오류 발생 시 signInWithRedirect로 자동 폴백
            if (popupErr.code === 'auth/operation-not-supported-in-this-environment' || 
                popupErr.code === 'auth/popup-blocked') {
                try {
                    sessionStorage.setItem('sonamu_google_redirecting', '1');
                    await firebase.auth().signInWithRedirect(provider);
                    return; // 브라우저가 구글 로그인으로 이동
                } catch (redirectErr) {
                    sessionStorage.removeItem('sonamu_google_redirecting');
                    console.error("Redirect fallback error:", redirectErr);
                    throw redirectErr;
                }
            } else {
                throw popupErr;
            }
        }

        if (!gUser) {
            throw new Error("사용자 정보를 불러올 수 없습니다.");
        }

        await window.processGoogleUserLogin(gUser);

    } catch (error) {
        console.error("구글 로그인 실패:", error);
        const errMsg = (error && (error.message || error.code || '')) + '';
        const isStorageIssue = 
            error.code === 'auth/operation-not-supported-in-this-environment' || 
            error.code === 'auth/web-storage-unsupported' ||
            errMsg.includes('web storage') ||
            errMsg.includes('location.protocol') ||
            errMsg.includes('operation-not-supported');

        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            // 사용자가 의도적으로 팝업 닫음 - 경고 불필요
            return;
        } else if (isStorageIssue) {
            window.showGoogleStorageGuidanceModal(error);
        } else if (error.code === 'auth/popup-blocked') {
            window.showAlert("브라우저에서 팝업이 차단되었습니다.\n주소창 설정에서 팝업을 허용해주세요.", "팝업 차단 해제");
        } else if (error.code === 'auth/network-request-failed') {
            window.showAlert("네트워크 연결 상태를 확인하고 다시 시도해주세요.", "연결 확인");
        } else {
            window.showAlert("구글 로그인 중 오류가 발생했습니다:\n" + errMsg);
        }
    } finally {
        if (btn && sessionStorage.getItem('sonamu_google_redirecting') !== '1') {
            btn.disabled = false;
            btn.classList.remove('opacity-70');
            btn.innerHTML = origBtnHtml;
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

window.openGoogleLinkModal = (gUser) => {
    window._pendingGoogleUser = gUser;

    const emailEl = window.$('google-link-email');
    if (emailEl) emailEl.innerText = gUser.email || '인증 완료';

    const avatarEl = window.$('google-link-avatar');
    if (avatarEl) {
        if (gUser.photoURL) {
            avatarEl.src = gUser.photoURL;
        } else {
            avatarEl.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(gUser.displayName || 'G') + '&background=0284c7&color=fff';
        }
    }

    const nameInput = window.$('google-link-name');
    if (nameInput) {
        // 구글 표시명이 한글 2~5글자인 경우 실명으로 추정하여 자동 채움
        const dName = (gUser.displayName || '').trim();
        nameInput.value = (/^[가-힣]{2,5}$/.test(dName)) ? dName : '';
    }

    const phoneInput = window.$('google-link-phone');
    if (phoneInput) phoneInput.value = '';

    const modal = window.$('google-link-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            if (nameInput && !nameInput.value) nameInput.focus();
            else if (phoneInput) phoneInput.focus();
        }, 100);
    }
};

window.closeGoogleLinkModal = () => {
    const modal = window.$('google-link-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    window._pendingGoogleUser = null;
};

window.confirmGoogleAccountLink = async () => {
    if (!window._pendingGoogleUser) {
        return window.showAlert("구글 인증 정보가 만료되었습니다. 다시 시도해주세요.");
    }

    const gUser = window._pendingGoogleUser;
    const inputName = (window.$('google-link-name')?.value || '').trim();
    const inputPhone = (window.$('google-link-phone')?.value || '').trim();

    if (!inputName || !inputPhone) {
        return window.showAlert("성함과 전화번호 뒷자리를 모두 입력해주세요.");
    }

    if (!members || members.length === 0) {
        return window.showAlert("회원 데이터 동기화 중입니다. 잠시 후 다시 시도해주세요.");
    }

    // 이름 및 전화번호 뒷 4자리(또는 loginPw) 매칭
    const cleanPhone = inputPhone.replace(/[^0-9]/g, '');
    let matchedMember = members.find(m => {
        if (m.name !== inputName) return false;
        const mPhoneLast4 = String(m.phone || '').replace(/[^0-9]/g, '').slice(-4);
        const mLoginId = String(m.loginId || '').replace(/[^0-9]/g, '').slice(-4);
        const mLoginPw = String(m.loginPw || '');
        return (cleanPhone && (mPhoneLast4 === cleanPhone || mLoginId === cleanPhone)) || (mLoginPw === inputPhone);
    });

    if (!matchedMember) {
        return window.showAlert(`'${inputName}' 회원 정보를 찾을 수 없거나 인증 정보가 일치하지 않습니다.\n등록된 성함과 전화번호 뒷 4자리를 다시 확인해주세요.`);
    }

    // 다른 회원이 이미 이 구글 계정으로 연동되어 있는지 검사 (다중 계정 방지)
    const alreadyOwner = members.find(m => m.id !== matchedMember.id && m.googleUid === gUser.uid);
    if (alreadyOwner) {
        return window.showAlert(`이 구글 계정은 이미 '${alreadyOwner.name}' 회원님과 연동되어 있습니다.`);
    }

    // 기존 회원이 이미 다른 구글 계정과 연동되어 있던 경우 확인
    if (matchedMember.googleUid && matchedMember.googleUid !== gUser.uid) {
        const confirmed = await new Promise(res => {
            window.showConfirm(
                `'${matchedMember.name}' 회원님은 이미 다른 구글 계정(${matchedMember.googleEmail || '등록됨'})과 연동되어 있습니다.\n새로운 구글 계정(${gUser.email})으로 변경하시겠습니까?`,
                () => res(true),
                "계정 변경 확인"
            );
            const cancelBtn = window.$('dialog-btn-cancel');
            if (cancelBtn) {
                const origClick = cancelBtn.onclick;
                cancelBtn.onclick = () => { if (origClick) origClick(); res(false); };
            }
        });
        if (!confirmed) return;
    }

    try {
        if (window.isSavingData) return;
        window.isSavingData = true;

        matchedMember.googleUid = gUser.uid;
        matchedMember.googleEmail = gUser.email;
        if (gUser.photoURL && !matchedMember.profilePhoto) {
            matchedMember.googlePhoto = gUser.photoURL;
        }

        await window.saveData('members', true);

        window.closeGoogleLinkModal();
        if (window.showToast) {
            window.showToast(`✅ ${matchedMember.name}님 계정이 성공적으로 연동되었습니다!`);
        }

        // 로그인 완료 처리
        window.finalizeMemberLogin(matchedMember, true);

    } catch (err) {
        console.error("구글 연동 저장 실패:", err);
        window.showAlert("연동 저장 중 오류가 발생했습니다: " + err.message);
    } finally {
        window.isSavingData = false;
    }
};

window.unlinkGoogleFromMemberForm = () => {
    if (!editingMemberId) return;
    const m = (members || []).find(x => x.id === editingMemberId);
    if (!m || !m.googleUid) return;

    window.showConfirm(`'${m.name}' 회원님의 구글 계정(${m.googleEmail || ''}) 연동을 해제하시겠습니까?\n해제 후 다시 새로운 구글 계정으로 연동할 수 있습니다.`, async () => {
        if (window.isSavingData) return;
        window.isSavingData = true;
        try {
            delete m.googleUid;
            delete m.googleEmail;
            delete m.googlePhoto;
            await window.saveData('members', true);
            const statusEl = window.$('m-google-link-container');
            if (statusEl) statusEl.classList.add('hidden');
            if (window.showToast) window.showToast("구글 계정 연동이 해제되었습니다.");
        } catch(e) {
            console.error(e);
            window.showAlert("해제 중 오류가 발생했습니다: " + e.message);
        } finally {
            window.isSavingData = false;
        }
    });
};

// 리다이렉트 복귀 시 버튼 즉각 피드백 및 안전망 호출
try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sonamu_google_redirecting') === '1') {
        const gBtn = document.getElementById('btn-google-login');
        if (gBtn) {
            gBtn.disabled = true;
            gBtn.classList.add('opacity-70');
            gBtn.innerHTML = `
                <div class="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin"></div>
                <span>Google 계정 확인 중...</span>
            `;
        }
        setTimeout(() => {
            if (sessionStorage.getItem('sonamu_google_redirecting') === '1' && window.checkGoogleRedirectResult && !sessionStorage.getItem('sonamu_user_role')) {
                window.checkGoogleRedirectResult();
            }
        }, 1500);
    }
} catch(e) {}

