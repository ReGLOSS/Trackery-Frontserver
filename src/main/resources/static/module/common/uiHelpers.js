import { TagUIManager } from '../tags/tagUiManager.js';

// UI 관련 헬퍼 함수들
export const UiHelpers = {
    // TagUIManager 인스턴스 캐시
    _tagManagers: new Map(),
    async hideUploadingBlockAndShowResultBlock() {
        const uploadingBlock = document.querySelector('#uploadingBlock');
        const resultInfoBlock = document.querySelector('#resultInfoBlock');
        
        if (uploadingBlock) uploadingBlock.style.display = "none";
        if (resultInfoBlock) resultInfoBlock.style.display = "flex";
    },

    async addFailedImage(failedImageUUIDs = []) {
        const failedUploadInfoGroup = document.querySelector("#failedUploadInfoGroup");
        const modalGallery = document.querySelector(".uploading-modal-gallery");
        
        if (failedImageUUIDs.length === 0) {
            if (failedUploadInfoGroup) failedUploadInfoGroup.style.display = "none";
            return;
        }

        failedImageUUIDs.forEach(uuid => {
            const failedImage = document.querySelector(`.gallery-image[data-uuid="${uuid}"]`);
            if (failedImage && modalGallery) {
                const img = document.createElement("img");
                img.src = failedImage.src;
                img.classList.add("uploading-modal-gallery-image");
                img.alt = "업로드 실패한 이미지";

                modalGallery.appendChild(img);
            }
        });
    },

    async indicateResult(successImageUUIDs = [], failedImageUUIDs = []) {
        const uploadedImageCount = document.querySelector('#uploadedImageCount');
        const uploadFailedImageCount = document.querySelector('#uploadFailedImageCount');
        
        if (uploadedImageCount) {
            uploadedImageCount.textContent = successImageUUIDs.length + "장의 이미지를 성공적으로 업로드했습니다.";
        }
        if (uploadFailedImageCount) {
            uploadFailedImageCount.textContent = failedImageUUIDs.length + "장의 이미지는 업로드에 실패했습니다.";
        }
    },

    /**
     * TagUIManager 인스턴스 가져오기 또는 생성
     * @param {string} containerSelector - 태그 컨테이너 선택자
     * @param {Object} options - TagUIManager 옵션
     * @returns {TagUIManager} TagUIManager 인스턴스
     */
    getTagManager(containerSelector, options = {}) {
        // DOM 엘리먼트 존재 확인
        const container = document.querySelector(containerSelector);
        if (!container) {
            return null;
        }

        if (!this._tagManagers.has(containerSelector)) {
            try {
                const manager = new TagUIManager(containerSelector, {
                    editMode: true,
                    allowCustomTags: true,
                    onTagsChange: (tags) => {
                        // 선택된 이미지의 태그 정보 업데이트
                        const selectedImage = document.querySelector(".gallery-image.selected");
                        if (selectedImage) {
                            selectedImage.dataset.tags = JSON.stringify(tags);
                        }
                    },
                    ...options
                });
                this._tagManagers.set(containerSelector, manager);
            } catch (error) {
                console.warn(`TagUIManager 생성 실패: ${error.message}`);
                return null;
            }
        }
        return this._tagManagers.get(containerSelector);
    },

    /**
     * 태그 표시 (새로운 TagUIManager 사용)
     * @param {Array} tags - 표시할 태그 배열
     * @param {string} containerSelector - 태그 컨테이너 선택자
     */
    addTags(tags, containerSelector = '.tag-box') {
        const tagManager = this.getTagManager(containerSelector);
        if (tagManager) {
            tagManager.displayTags(tags);
        }
    },

    /**
     * 선택된 이미지의 태그 정보 업데이트
     * @param {string} containerSelector - 태그 컨테이너 선택자
     */
    updateSelectedImageTags(containerSelector = '.tag-box') {
        const tagManager = this.getTagManager(containerSelector);
        if (tagManager) {
            const currentTags = tagManager.getCurrentTags();
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage) {
                selectedImage.dataset.tags = JSON.stringify(currentTags);
            }
        }
    },
};
