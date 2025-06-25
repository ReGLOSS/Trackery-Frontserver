// ============================================================
// galleryToggle.js - 갤러리 토글 모듈
// ============================================================

import { DOM } from './constants.js';

export const GalleryToggle = {
    // 갤러리 토글 초기화
    initGalleryToggle() {
        const toggleButtons = document.querySelectorAll('.gallery-toggle-btn');

        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const target = button.dataset.target;
                this.toggleGallery(target, button);
            });
        });
    },

    // 갤러리 토글
    toggleGallery(target, button) {
        const toggleIcon = button.querySelector('.toggle-icon');
        let galleryContent;

        if (target === 'my-images') {
            galleryContent = DOM.albumDetailEditMyImagesGallery;
        } else if (target === 'album-images') {
            galleryContent = DOM.albumDetailGallery;
        }

        if (!galleryContent) return;

        const isCollapsed = galleryContent.style.display === 'none';

        if (isCollapsed) {
            // 갤러리 열기
            galleryContent.style.display = 'grid';
            toggleIcon.textContent = '−';
            galleryContent.style.animation = 'slideDown 0.3s ease';
        } else {
            // 갤러리 닫기
            galleryContent.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                galleryContent.style.display = 'none';
            }, 280);
            toggleIcon.textContent = '+';
        }

        console.log(`${target} 갤러리 ${isCollapsed ? '열림' : '닫힘'}`);
    },

    // 내 이미지 섹션 표시/숨김
    showMyImagesSection() {
        if (DOM.myImagesSection) {
            DOM.myImagesSection.style.display = 'block';
            DOM.myImagesSection.style.animation = 'fadeIn 0.3s ease';
        }
    },

    hideMyImagesSection() {
        if (DOM.myImagesSection) {
            DOM.myImagesSection.style.display = 'none';
        }
    }
};
