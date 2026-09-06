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
