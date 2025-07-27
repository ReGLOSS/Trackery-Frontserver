// UI 관련 헬퍼 함수들
export const UiHelpers = {
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

    // 태그 영역에 지역 태그 추가
    addTags(tags, tagBoxSelector = '.tag-box') {
        const tagBox = document.querySelector(tagBoxSelector);
        if (!tagBox) return;
        
        const existingTags = tagBox.querySelectorAll('.tag:not(.tag-add)');
        existingTags.forEach(tag => {
            if (tag.classList.contains('regional-tag')) {
                tag.remove();
            }
        });

        const tagAddButton = tagBox.querySelector('.tag-add');

        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag', 'regional-tag');
            tagElement.textContent = tag.tagName;
            tagElement.dataset.tagId = tag.tagId || '';
            tagElement.dataset.tagName = tag.tagName;

            // 태그 삭제 버튼 추가
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('tag-delete');
            deleteButton.innerHTML = '×';
            deleteButton.title = '태그 삭제';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                tagElement.remove();
                // 선택된 이미지의 태그 정보 즉시 업데이트
                const selectedImage = document.querySelector(".gallery-image.selected");
                if (selectedImage) {
                    this.updateSelectedImageTags(tagBoxSelector);
                }
            });

            tagElement.appendChild(deleteButton);
            if (tagAddButton) {
                tagBox.insertBefore(tagElement, tagAddButton);
            } else {
                tagBox.appendChild(tagElement);
            }
        });
    },

    // 커스텀 태그 추가
    addCustomTag(tagName, tagBoxSelector = '.tag-box') {
        if (!tagName || tagName.trim() === '') return;

        const tagBox = document.querySelector(tagBoxSelector);
        if (!tagBox) return;

        // 중복 태그 체크
        const existingTags = tagBox.querySelectorAll('.tag:not(.tag-add)');
        const isDuplicate = Array.from(existingTags).some(tag =>
            tag.textContent.replace('×', '').trim() === tagName.trim()
        );

        if (isDuplicate) {
            alert('이미 추가된 태그입니다.');
            return;
        }

        const tagElement = document.createElement('span');
        tagElement.classList.add('tag', 'regional-tag');
        tagElement.textContent = tagName.trim();
        tagElement.dataset.tagId = 'custom-' + Date.now(); // 임시 ID
        tagElement.dataset.tagName = tagName.trim();

        // 태그 삭제 버튼 추가
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('tag-delete');
        deleteButton.innerHTML = '×';
        deleteButton.title = '태그 삭제';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            tagElement.remove();
            // 선택된 이미지의 태그 정보 즉시 업데이트
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage) {
                this.updateSelectedImageTags(tagBoxSelector);
            }
        });

        tagElement.appendChild(deleteButton);

        const tagAddButton = tagBox.querySelector('.tag-add');
        if (tagAddButton) {
            tagBox.insertBefore(tagElement, tagAddButton);
        } else {
            tagBox.appendChild(tagElement);
        }

        // 선택된 이미지의 태그 정보 업데이트
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            this.updateSelectedImageTags(tagBoxSelector);
        }
    },

    // 선택된 이미지의 태그 정보 업데이트
    updateSelectedImageTags(tagBoxSelector = '.tag-box') {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (!selectedImage) return;

        const tagBox = document.querySelector(tagBoxSelector);
        if (!tagBox) return;

        const currentTags = tagBox.querySelectorAll('.tag.regional-tag');
        const updatedTags = Array.from(currentTags).map(tag => ({
            tagId: tag.dataset.tagId,
            tagName: tag.dataset.tagName
        }));

        selectedImage.dataset.tags = JSON.stringify(updatedTags);
    },
};