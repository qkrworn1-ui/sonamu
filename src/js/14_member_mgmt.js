// --- [Gallery Functions] ---
window.resizeImage = (file, maxWidth = 1080) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => { resolve(blob || file); }, 'image/jpeg', 0.85);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

let pendingUploadFiles = [];

window.previewSelectedPhotos = async (e) => {
    const files = e.target.files;
    if(!files || files.length === 0) return;
    
    const uRole = sessionStorage.getItem('sonamu_user_role');
    const uName = sessionStorage.getItem('sonamu_user_name');
    if(!uName || uRole === '파트너') return window.showAlert("사진 업로드 권한이 없습니다.");

    pendingUploadFiles = Array.from(files);
    e.target.value = ''; // Reset input so same files can be selected again if canceled
    
    const m = window.$('upload-preview-modal');
    if(!m) return;
    const grid = window.$('upload-preview-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-white/50 animate-pulse font-bold text-sm">사진 미리보기를 불러오는 중...</div>';
    
    m.classList.remove('hidden');
    m.classList.add('flex');
    setTimeout(() => m.classList.add('opacity-100'), 10);
    
    window.setHtml('upload-preview-info', `총 <span class="text-purple-400 font-black">${pendingUploadFiles.length}</span>장의 사진 업로드 대기중`);
    
    let html = '';
    for(let i=0; i<pendingUploadFiles.length; i++) {
        const objUrl = URL.createObjectURL(pendingUploadFiles[i]);
        html += `
            <div id="preview-item-${i}" class="relative group aspect-square rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/10 shadow-lg">
                <img src="${objUrl}" class="w-full h-full object-cover">
                <button onclick="window.removePendingFile(${i}, this)" class="absolute top-2 right-2 bg-rose-500/90 text-white p-1.5 rounded-xl shadow-md hover:bg-rose-400 active:scale-95 transition-all backdrop-blur-sm border border-rose-300/50"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        `;
    }
    grid.innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
};

window.removePendingFile = (idx, btn) => {
    pendingUploadFiles[idx] = null;
    btn.parentElement.classList.add('hidden');
    const rem = pendingUploadFiles.filter(Boolean).length;
    window.setHtml('upload-preview-info', `총 <span class="text-purple-400 font-black">${rem}</span>장의 사진 업로드 대기중`);
    if(rem === 0) window.closeUploadPreview();
};

window.closeUploadPreview = (force = true) => {
    const rem = pendingUploadFiles.filter(Boolean).length;
    if(!force && rem > 0) {
        window.showConfirm("대기 중인 사진이 있습니다. 업로드를 취소하시겠습니까?", () => window.closeUploadPreview(true), "알림");
        return;
    }

    const m = window.$('upload-preview-modal');
    if(!m) return;
    m.classList.remove('opacity-100');
    setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); pendingUploadFiles = []; }, 300);
};

window.confirmPhotoUpload = async () => {
    const filesToUpload = pendingUploadFiles.filter(Boolean);
    if(filesToUpload.length === 0) return window.closeUploadPreview();
    
    const uName = sessionStorage.getItem('sonamu_user_name');
    if(window.isSavingData) return;
    window.isSavingData = true;
    
    const overlay = window.$('upload-preview-overlay');
    const pBar = window.$('upload-preview-progress-bar');
    const pText = window.$('upload-preview-progress-text');
    
    if(overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
    if(pBar) pBar.style.width = '0%';
    if(pText) pText.innerText = '업로드를 준비 중입니다... (0%)';
    
    try {
        let successCount = 0;
        for(let i=0; i<filesToUpload.length; i++) {
            const file = filesToUpload[i];
            const p = Math.round((i / filesToUpload.length) * 100);
            if(pBar) pBar.style.width = p + '%';
            if(pText) pText.innerText = `사진 처리 및 업로드 중... (${p}% - ${i+1}/${filesToUpload.length}장)`;
            
            const blob = await window.resizeImage(file);
            const blobSize = blob.size;
            const fileName = `gallery/${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
            const ref = storage.ref().child(fileName);
            await ref.put(blob);
            const url = await ref.getDownloadURL();
            
            galleryPhotos.push({ id: 'photo_' + Date.now() + i, url: url, path: fileName, uploader: uName, date: window.getTodayString(), timestamp: Date.now(), size: blobSize });
            successCount++;
        }
        
        if(pBar) pBar.style.width = '100%';
        if(pText) pText.innerText = '파이어베이스에 동기화 중... 완료!';
        
        window.galleryPhotos = galleryPhotos;
        await window.saveData('gallery', false, true); // [강제] 저장 락 우회 (업로드 프로세스 내에서 이미 락을 잡고 있음)
        window.updateDashboard();
        currentGalleryPage = 1; // [중요] 업로드 후 최신 사진이 있는 1페이지로 리셋
        window.renderGallery();
        window.showToast(`${successCount}장의 즐거운 추억이 저장되었습니다.`);
        
        setTimeout(() => window.closeUploadPreview(), 800);
    } catch(err) {
        console.error(err);
        if(overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
        window.closeUploadPreview();
        setTimeout(() => {
            window.showAlert(`사진 업로드 실패 (관리자에게 문의하세요!)\n오류 내용: ${err.message || err.code || '권한 부족 또는 알 수 없는 오류'}`);
        }, 500);
    }
    
    setTimeout(() => { if(overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); } }, 1500);
    window.isSavingData = false;
};

window.renderGallery = () => {
    const grid = window.$('gallery-grid'), titleBox = window.$('gallery-title-info');
    if(!grid) return;
    const photos = window.galleryPhotos || galleryPhotos || [];
    const sorted = [...photos].sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
    
    // UI 제목 정보 업데이트 (가시성 확보)
    if(titleBox) titleBox.innerHTML = `우리들의 멋진 순간들을 공유해보세요! <span class="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full ml-1 font-black text-[9px] border border-indigo-100">총 ${sorted.length}장</span>`;
    
    const pagination = window.$('gallery-pagination');
    
    if(!sorted.length) { 
        grid.innerHTML = '<div class="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed rounded-2xl">등록된 추억 사진이 없습니다.</div>'; 
        if(pagination) pagination.classList.add('hidden');
        return; 
    }
    
    const isMobile = window.innerWidth <= 768;
    const maxItems = isMobile ? 20 : 40;
    const totalPages = Math.ceil(sorted.length / maxItems) || 1;
    
    if(currentGalleryPage > totalPages) currentGalleryPage = totalPages;
    if(currentGalleryPage < 1) currentGalleryPage = 1;
    
    const startIdx = (currentGalleryPage - 1) * maxItems;
    const paginated = sorted.slice(startIdx, startIdx + maxItems);
    
    grid.innerHTML = paginated.map(p => {
        const photoUrl = p.url || p.src || p.photoUrl || p.image || p.imageUrl || '';
        const photoId = p.id || ('photo_' + (p.timestamp || Math.random().toString(36).substring(2)));
        const uploader = p.uploader || p.author || p.name || '소나무회원';
        const photoDate = p.date || (p.timestamp ? new Date(p.timestamp).toISOString().slice(0, 10) : '');

        return `
            <div class="relative group aspect-[4/5] object-cover rounded-[1.5rem] overflow-hidden shadow-md bg-slate-100 cursor-pointer border-2 border-white ring-1 ring-slate-200" onclick="window.openImageViewer('${photoId}')">
                <img src="${photoUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 blur-0 bg-slate-200" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22500%22%20viewBox%3D%220%200%20400%20500%22%20fill%3D%22%23f1f5f9%22%3E%3Crect%20width%3D%22400%22%20height%3D%22500%22%20fill%3D%22%23f8fafc%22%2F%3E%3Cpath%20d%3D%22M160%20220h80l15%2020h35a15%2015%200%200%201%2015%2015v80a15%2015%200%200%201-15%2015H110a15%2015%200%200%201-15-15v-80a15%2015%200%200%201%2015-15h35l15-20z%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%20fill%3D%22none%22%2F%3E%3Ccircle%20cx%3D%22200%22%20cy%3D%22285%22%20r%3D%2225%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%20fill%3D%22none%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22370%22%20font-size%3D%2213%22%20font-family%3D%22sans-serif%22%20font-weight%3D%22bold%22%20fill%3D%22%2394a3b8%22%20text-anchor%3D%22middle%22%3E%EC%82%AC%EC%A7%84%20%EB%B6%88%EB%9F%AC%EC%98%A4%EA%B8%B0%20%EC%8B%A4%ED%8C%A8%3C%2Ftext%3E%3C%2Fsvg%3E';">
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-12 pb-3.5 px-3.5 pointer-events-none">
                    <div class="text-white text-xs font-black truncate drop-shadow-md flex items-center gap-1.5"><i data-lucide="user" class="w-4 h-4 text-blue-400"></i> ${window.escapeHtml(uploader)}</div>
                    <div class="text-white/90 text-[10px] font-black mt-1 ml-1 flex items-center gap-1.5 drop-shadow-sm"><i data-lucide="calendar" class="w-3.5 h-3.5 opacity-60"></i> ${photoDate}</div>
                </div>
            </div>
        `;
    }).join('');
    if(window.lucide) window.lucide.createIcons();
    
    if(pagination) {
        if(totalPages > 1) {
            pagination.classList.remove('hidden');
            window.setText('gallery-page-info', `${currentGalleryPage} / ${totalPages}`);
            window.$('btn-gallery-prev').disabled = currentGalleryPage === 1;
            window.$('btn-gallery-next').disabled = currentGalleryPage === totalPages;
        } else {
            pagination.classList.add('hidden');
        }
    }
};

window.changeGalleryPage = (dir) => {
    currentGalleryPage += dir;
    window.renderGallery();
    const g = document.getElementById('gallery');
    if(g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.openImageViewer = (id) => {
    const photos = window.galleryPhotos || galleryPhotos || [];
    const p = photos.find(x => x.id === id || (x.id || ('photo_' + x.timestamp)) === id);
    if(!p) return;
    currentPhotoId = p.id || id;
    const photoUrl = p.url || p.src || p.photoUrl || p.image || p.imageUrl || '';
    const uploader = p.uploader || p.author || p.name || '소나무회원';
    const photoDate = p.date || (p.timestamp ? new Date(p.timestamp).toISOString().slice(0, 10) : '');

    const img = window.$('image-viewer-img');
    if(img) img.src = photoUrl;
    window.setHtml('image-viewer-info', `${window.escapeHtml(uploader)} <span class="text-white/50 text-[10px] ml-1">${photoDate}</span>`);
    
    const uName = sessionStorage.getItem('sonamu_user_name');
    const btnDel = window.$('btn-delete-photo');
    if(btnDel) {
        if(uName === uploader || window.isNoticeAdmin()) btnDel.classList.remove('hidden');
        else btnDel.classList.add('hidden');
    }
    
    const m = window.$('image-viewer-modal');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => { m.classList.add('opacity-100'); window.$('image-viewer-img')?.classList.remove('scale-95'); }, 10); }
};

window.closeImageViewer = () => {
    const m = window.$('image-viewer-modal');
    if(m) {
        m.classList.remove('opacity-100'); window.$('image-viewer-img')?.classList.add('scale-95');
        setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); window.$('image-viewer-img').src = ''; currentPhotoId = null; }, 300);
    }
};

window.navigateImageViewer = (dir) => {
    if(!currentPhotoId) return;
    const photos = window.galleryPhotos || galleryPhotos || [];
    const sorted = [...photos].sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
    const currentIndex = sorted.findIndex(x => x.id === currentPhotoId || (x.id || ('photo_' + x.timestamp)) === currentPhotoId);
    if(currentIndex === -1) return;
    let nextIndex = currentIndex + dir;
    if(nextIndex < 0) nextIndex = sorted.length - 1;
    if(nextIndex >= sorted.length) nextIndex = 0;
    
    const img = window.$('image-viewer-img');
    if(img) img.style.opacity = 0;
    
    setTimeout(() => {
        const nextPhoto = sorted[nextIndex];
        window.openImageViewer(nextPhoto.id || ('photo_' + nextPhoto.timestamp));
        if(img) img.style.opacity = 1;
    }, 150);
};

let swipeStartX = 0;
document.addEventListener('touchstart', e => {
    const m = window.$('image-viewer-modal');
    if(m && !m.classList.contains('hidden')) {
        swipeStartX = e.changedTouches[0].screenX;
    }
}, {passive: true});

document.addEventListener('touchend', e => {
    const m = window.$('image-viewer-modal');
    if(m && !m.classList.contains('hidden')) {
        const endX = e.changedTouches[0].screenX;
        if(swipeStartX - endX > 50) window.navigateImageViewer(1);
        else if(endX - swipeStartX > 50) window.navigateImageViewer(-1);
    }
}, {passive: true});

window.downloadCurrentPhoto = async () => {
    if(!currentPhotoId) return;
    const photos = window.galleryPhotos || galleryPhotos || [];
    const p = photos.find(x => x.id === currentPhotoId || (x.id || ('photo_' + x.timestamp)) === currentPhotoId);
    if(!p) return;
    const photoUrl = p.url || p.src || p.photoUrl || p.image || p.imageUrl || '';
    if(!photoUrl) return;
    
    try {
        const response = await fetch(photoUrl, { mode: 'cors' });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = `소나무족구단_추억사진_${p.timestamp || Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        window.showToast("사진 다운로드가 완료되었습니다.");
    } catch (e) {
        console.error("다운로드 오류:", e);
        window.open(photoUrl, '_blank');
        window.showToast("사진이 새 창에 열리면 원본을 꾹 눌러 '저장'해 주세요.");
    }
};

window.deleteCurrentPhoto = () => {
    if(!currentPhotoId) return;
    const photos = window.galleryPhotos || galleryPhotos || [];
    const p = photos.find(x => x.id === currentPhotoId || (x.id || ('photo_' + x.timestamp)) === currentPhotoId);
    if(!p) return;
    const uName = sessionStorage.getItem('sonamu_user_name');
    const uploader = p.uploader || p.author || p.name;
    if(uName !== uploader && !window.isNoticeAdmin()) { window.showAlert("삭제 권한이 없습니다."); return; }
    window.showConfirm("이 사진을 정말 삭제하시겠습니까?", async () => {
        if(window.isSavingData) return; window.isSavingData = true;
        if(p.path) { try { await storage.ref().child(p.path).delete(); } catch(e) { console.warn("Storage ref delete failed"); } }
        if(!window._deletedPhotoIds) window._deletedPhotoIds = [];
        window._deletedPhotoIds.push(currentPhotoId);
        galleryPhotos = (window.galleryPhotos || galleryPhotos || []).filter(x => x.id !== currentPhotoId && (x.id || ('photo_' + x.timestamp)) !== currentPhotoId);
        window.galleryPhotos = galleryPhotos;
        await window.saveData('gallery', true, true);
        window.closeImageViewer(); 
        window.renderGallery(); 
        window.updateDashboard(); 
        window.showToast("사진이 정상적으로 삭제되었습니다.");
        window.isSavingData = false;
    });
};
