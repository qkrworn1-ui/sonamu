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

window._pendingGoogleUser = null;

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
        
        const result = await firebase.auth().signInWithPopup(provider);
        const gUser = result.user;

        if (!gUser) {
            throw new Error("사용자 정보를 불러올 수 없습니다.");
        }

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

    } catch (error) {
        console.error("구글 로그인 실패:", error);
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            // 사용자가 의도적으로 팝업 닫음 - 경고 불필요
            return;
        } else if (error.code === 'auth/popup-blocked') {
            window.showAlert("브라우저에서 팝업이 차단되었습니다.\n주소창 설정에서 팝업을 허용해주세요.", "팝업 차단 해제");
        } else if (error.code === 'auth/network-request-failed') {
            window.showAlert("네트워크 연결 상태를 확인하고 다시 시도해주세요.", "연결 확인");
        } else {
            window.showAlert("구글 로그인 중 오류가 발생했습니다:\n" + (error.message || error.code));
        }
    } finally {
        if (btn) {
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
