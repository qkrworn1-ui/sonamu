// --- [Obsolete] updateMileageStartDate removed ---

// [시스템] 마일리지 전수 조사 및 실시간 동기화 (Ongoing + Historical)
window.syncMileageHistory = async () => {
    if (sessionStorage.getItem('sonamu_user_id') !== 'master') return window.showAlert("마스터 계정만 접근 가능합니다.");
    
    window.showConfirm("전체 회원의 마일리지를 활동 이력 기반으로 정밀 재계산하시겠습니까?\n\n(참고: 시작일 이전의 데이터는 합계에서 제외됩니다)", async () => {
        if(window.isSavingData) return; window.isSavingData = true;
        
        try {
            await db.runTransaction(async (tx) => {
                const snapM = await tx.get(docMembers);
                const snapS = await tx.get(docSports);
                const snapB = await tx.get(docBoard);
                if(!snapM.exists || !snapS.exists || !snapB.exists) return;

                const membersList = snapM.data().members || [];
                const evts = snapS.data().teamEvents || [];
                const postsList = snapB.data().posts || [];

                membersList.forEach(m => {
                    if(m.role !== '파트너') {
                        // [중합] 모든 계산 경로를 단일 엔진으로 통일
                        m.score = window.getMemberCalculatedScore(m, evts, postsList);
                        if (m.scoreYear !== undefined) delete m.scoreYear; 
                    }
                });

                tx.update(docMembers, { members: membersList, updatedAt: new Date().toISOString() });
            });
            window.showToast("마일리지 전수 조사가 완료되었습니다.");
            window.updateDashboard();
            window.renderActivities();
        } catch (err) {
            console.error("Sync Error:", err);
            window.showAlert("동기화 중 오류가 발생했습니다.");
        } finally {
            window.isSavingData = false;
        }
    });
};
