import {parseExif} from "./ExifParser.js";

// DOM 엘리먼트 관련 상수들
const DOM = {
    fileInput: document.getElementById("imageInput"),
    addImageButton: document.querySelector(".add-image"),
    gallery: document.querySelector(".gallery"),
    imageNotSelectedBlock: document.querySelector(".image-not-selected"),
    imageSelectedBlock: document.querySelector(".image-selected"),
    imageUploadBtn: document.querySelector("#imageUploadBtn"),
    locationBox: document.getElementById("locationBox"),
    dateBox: document.getElementById("dateBox"),
    description: document.getElementById("description"),
    publicCheckbox: document.getElementById("public"),
    uploadedImageCount: document.querySelector('#uploadedImageCount'),
    uploadFailedImageCount: document.querySelector('#uploadFailedImageCount'),
    modalGallery: document.querySelector(".uploading-modal-gallery"),
    failedUploadInfoGroup: document.querySelector("#failedUploadInfoGroup"),
    whileUploadingModal: document.querySelector('.while-uploading-modal'),
    uploadingBlock: document.querySelector('#uploadingBlock'),
    resultInfoBlock: document.querySelector('#resultInfoBlock'),
    tagBox: document.querySelector('.tag-box'),
    tagInput: document.querySelector('.tag-input'),
    tagAddButton: document.querySelector('.tag-add'),
};

// 이미지 처리 관련 함수들
const ImageProcessor = {
    // 파일 확장자에 따른 MIME 타입 결정
    extensionToMimeType(extension) {
        const mimeTypes = {
            'png': 'image/png',
            'webp': 'image/webp',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg'
        };

        const contrastedResult = mimeTypes[extension.toLowerCase()];

        if (contrastedResult === undefined) {
            throw new Error("허용되지 않는 파일입니다. 현재 jpg, jpeg, png, webp만 지원하고있습니다.");
        }

        return contrastedResult;
    },

    // EXIF에서 날짜 정보 포맷팅
    formatDateFromExif(dateTime) {
        if (!dateTime) return "";

        // 보통 EXIF 날짜 형식은: "YYYY:MM:DD HH:MM:SS"
        const [date] = dateTime.split(" ");
        const [year, month, day] = date.split(":");

        // month와 day는 앞자리 0을 제거해서 정수 처리
        return `${year} / ${parseInt(month)} / ${parseInt(day)}`;
    }
};

// API 통신 관련 함수들
const ApiService = {
    // 위치 정보 가져오기
    async fetchLocation(file) {
        const exif = await parseExif(file);

        if (!exif) {
            console.warn("EXIF 위치, 날짜 정보 없음");
            return {
                location: '',
                dateTime: '',
                latitude: null,
                longitude: null,
            };
        }

        const {latitude, longitude, dateTime} = exif;
        const formattedDateTime = ImageProcessor.formatDateFromExif(dateTime);

        if (latitude == null || longitude == null) {
            console.warn("위치 정보 없음, 날짜 정보 있음");
            console.warn("날짜 정보 : ", formattedDateTime);
            return {
                location: '',
                dateTime: formattedDateTime,
                latitude: null,
                longitude: null
            };
        }

        try {
            // 병렬로 두 API 요청 실행
            const [locationResponse, tagsResponse] = await Promise.all([
                fetch("/api/location/name", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({latitude, longitude})
                }),
                fetch("/api/tags/season", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({
                        date: formattedDateTime
                    })
                })
            ]);

            const locationData = await locationResponse.json();
            const tagsData = await tagsResponse.json();

            console.log('Location API Response:', locationData);
            console.log('Tags API Response:', tagsData);

            const location = locationData.data;
            const displayLocationName = `${location.sdName} ${location.sggName}`.trim();

            // 태그 정보 병합: sdName, sggName을 최우선으로 추가
            let combinedTags = [];
            if (location.sdName) combinedTags.push({ tagName: location.sdName, tagId: 'sdName' });
            if (location.sggName) combinedTags.push({ tagName: location.sggName, tagId: 'sggName' });

            if (location.regionalTags && Array.isArray(location.regionalTags)) {
                combinedTags = [...combinedTags, ...location.regionalTags];
            }

            if (tagsResponse.status === 200 && tagsData.code === 200 && Array.isArray(tagsData.data)) {
                combinedTags = [...combinedTags, ...tagsData.data];
            }

            return {
                location: displayLocationName,
                dateTime: formattedDateTime,
                latitude,
                longitude,
                tags: combinedTags
            };
        } catch (err) {
            console.error("위치 정보 요청 실패:", err);
            return {
                dateTime: formattedDateTime,
                latitude,
                longitude,
                location: ""
            };
        }
    },

    // Presigned URL 요청
    async requestPresignedPutUrl(imageElement) {
        const fileName = imageElement.dataset.uuid + "." + imageElement.dataset.fileExtension;

        try {
            const response = await fetch("/api/images/presigned-url/put?imageFileName=" + fileName, {
                method: "GET",
                credentials: "include"
            });

            if (response.status === 400) {
                throw new Error(imageElement.dataset.uuid);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Presigned URL 요청 실패 :", error);
            throw error;
        }
    },

    // S3에 이미지 업로드
    async uploadImageToS3(imageElement, url) {
        const response = await fetch(imageElement.src);
        if (!response.ok) {
            throw new Error(imageElement.dataset.uuid);
        }
        const blob = await response.blob();
        const contentType = ImageProcessor.extensionToMimeType(imageElement.dataset.fileExtension);

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: {"Content-Type": contentType},
                body: blob
            });

            if (response.status !== 200) {
                throw new Error(imageElement.dataset.uuid);
            }

            console.log("%s S3 업로드 성공", imageElement.dataset.uuid);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 이미지 메타데이터 저장
    async fetchImgMetaData(imageElement) {
        const fileName = imageElement.dataset.uuid + "." + imageElement.dataset.fileExtension;

        // 현재 UI에 표시된 태그 정보 가져오기
        let tags = [];
        try {
            tags = JSON.parse(imageElement.dataset.tags || '[]');
        } catch (error) {
            console.error('태그 파싱 오류:', error);
        }

        try {
            const response = await fetch("/api/images", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    imageName: fileName,
                    imageType: imageElement.dataset.fileExtension,
                    description: imageElement.dataset.description,
                    longitude: imageElement.dataset.longitude,
                    latitude: imageElement.dataset.latitude,
                    dateString: imageElement.dataset.dateTime,
                    isPublic: imageElement.dataset.public,
                    tags: tags.map(tag => tag.tagName)
                })
            });

            if (response.status !== 200) {
                throw new Error(fileName);
            } else {
                console.log("이미지 메타데이터 저장 성공 :", fileName);
            }

            return response;
        } catch (error) {
            console.error("메타데이터 저장 중 오류:", error);
            throw error;
        }
    }
};

// 이미지 유효성 검증 및 UI 업데이트 관련 함수들
const ValidationService = {
    // 위치 및 날짜 유효성 검증
    validateLocationAndDate() {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (!selectedImage) return;

        const hasLocationAndDate = DOM.locationBox.value.trim() !== "" && DOM.dateBox.value.trim() !== "";

        if (hasLocationAndDate) {
            selectedImage.classList.remove("invalid");
            selectedImage.classList.add("valid");
        } else {
            selectedImage.classList.remove("valid");
            selectedImage.classList.add("invalid");
        }
    },

    // 업로드 버튼 상태 업데이트
    updateUploadButtonState() {
        const images = document.querySelectorAll(".gallery-image");

        // 이미지가 없는 경우 버튼 비활성화
        if (images.length === 0) {
            DOM.imageUploadBtn.disabled = true;
            return;
        }

        // 모든 이미지가 valid인지 확인
        const allValid = Array.from(images).every(image => image.classList.contains('valid'));

        // 모든 이미지가 valid일 때만 버튼 활성화
        DOM.imageUploadBtn.disabled = !allValid;
    },

    // 유효성 검증 리스너 설정
    setupValidationListeners() {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                const isClassChange = mutation.type === 'attributes' && mutation.attributeName === 'class';
                const isChildrenChange = mutation.type === 'childList';

                if (isClassChange || isChildrenChange) {
                    this.updateUploadButtonState();
                }
            }
        });

        // gallery의 변화 감지
        observer.observe(DOM.gallery, {
            childList: true,
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });

        this.updateUploadButtonState();
    }
};

// UI 관련 헬퍼 함수들
const UiHelpers = {
    async hideUploadingBlockAndShowResultBlock() {
        DOM.uploadingBlock.style.display = "none";
        DOM.resultInfoBlock.style.display = "flex";
    },

    async addFailedImage(failedImageUUIDs = []) {
        if (failedImageUUIDs.length === 0) {
            DOM.failedUploadInfoGroup.style.display = "none";
            return;
        }

        failedImageUUIDs.forEach(uuid => {
            const failedImage = document.querySelector(`.gallery-image[data-uuid="${uuid}"]`);
            if (failedImage) {
                const img = document.createElement("img");
                img.src = failedImage.src;
                img.classList.add("uploading-modal-gallery-image");
                img.alt = "업로드 실패한 이미지";

                DOM.modalGallery.appendChild(img);
            }
        });
    },

    async indicateResult(successImageUUIDs = [], failedImageUUIDs = []) {
        DOM.uploadedImageCount.textContent = successImageUUIDs.length + "장의 이미지를 성공적으로 업로드했습니다.";
        DOM.uploadFailedImageCount.textContent = failedImageUUIDs.length + "장의 이미지는 업로드에 실패했습니다.";
    },

    // 태그 영역에 지역 태그 추가
    addTags(tags) {
        const existingTags = DOM.tagBox.querySelectorAll('.tag:not(.tag-add)');
        existingTags.forEach(tag => {
            if (tag.classList.contains('regional-tag')) {
                tag.remove();
            }
        });

        const tagAddButton = DOM.tagBox.querySelector('.tag-add');

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
                    this.updateSelectedImageTags();
                }
            });

            tagElement.appendChild(deleteButton);
            DOM.tagBox.insertBefore(tagElement, tagAddButton);
        });
    },

    // 커스텀 태그 추가
    addCustomTag(tagName) {
        if (!tagName || tagName.trim() === '') return;

        // 중복 태그 체크
        const existingTags = DOM.tagBox.querySelectorAll('.tag:not(.tag-add)');
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
                this.updateSelectedImageTags();
            }
        });

        tagElement.appendChild(deleteButton);

        const tagAddButton = DOM.tagBox.querySelector('.tag-add');
        DOM.tagBox.insertBefore(tagElement, tagAddButton);

        // 선택된 이미지의 태그 정보 업데이트
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            this.updateSelectedImageTags();
        }
    },

    // 선택된 이미지의 태그 정보 업데이트
    updateSelectedImageTags() {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (!selectedImage) return;

        const currentTags = DOM.tagBox.querySelectorAll('.tag.regional-tag');
        const updatedTags = Array.from(currentTags).map(tag => ({
            tagId: tag.dataset.tagId,
            tagName: tag.dataset.tagName
        }));

        selectedImage.dataset.tags = JSON.stringify(updatedTags);
    },

};

// 이벤트 핸들러 모음
const EventHandlers = {
    // 이미지 추가 버튼 클릭 핸들러
    onAddImageClick() {
        DOM.fileInput.click();
    },

    // 파일 입력 변경 핸들러
    async onFileInputChange(event) {
        const file = event.target.files[0];

        if (!file) return;

        const fileExtension = file.name.split(".").pop().toLowerCase();

        try {
            ImageProcessor.extensionToMimeType(fileExtension);
        } catch (error) {
            alert(error.message);
            return;
        }

        // EXIF 파싱 + 위치 요청
        const parsedData = await ApiService.fetchLocation(file);
        const {location = '', dateTime = '', tags = []} = parsedData;

        const objectUrl = URL.createObjectURL(file);

        // 이미지 UI 추가
        const img = document.createElement("img");
        img.src = objectUrl;
        img.classList.add("gallery-image");
        img.alt = "추가된 이미지";

        img.dataset.preview = objectUrl;
        img.dataset.location = location;
        img.dataset.dateTime = dateTime;
        img.dataset.description = "";
        img.dataset.public = "false";
        img.dataset.uuid = crypto.randomUUID();
        img.dataset.fileExtension = fileExtension;
        img.dataset.latitude = parsedData.latitude;
        img.dataset.longitude = parsedData.longitude;
        img.dataset.tags = JSON.stringify(tags);

        if (dateTime && location) {
            img.classList.add("valid");
        }

        if (!dateTime || !location) {
            img.classList.add("invalid");
        }

        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");
        imageWrapper.dataset.uuid = img.dataset.uuid; // Propagate uuid to wrapper

        const closeButton = document.createElement("button");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = "&times;"; // 'x' mark
        closeButton.title = "업로드 취소";

        imageWrapper.appendChild(img);
        imageWrapper.appendChild(closeButton);
        DOM.gallery.appendChild(imageWrapper);
    },

    // 갤러리 이미지 클릭 핸들러
    onGalleryImageClick(event) {
        const target = event.target;
        const imageWrapper = target.closest(".image-wrapper");
        if (!imageWrapper || target.classList.contains("close-button")) return;

        // 이전에 선택된 이미지의 태그 정보를 저장
        const previouslySelected = document.querySelector(".gallery-image.selected");
        if (previouslySelected) {
            UiHelpers.updateSelectedImageTags();
        }

        const notSelectedImageDisplay = window.getComputedStyle(DOM.imageNotSelectedBlock).display;

        if (notSelectedImageDisplay === "flex") {
            DOM.imageNotSelectedBlock.style.display = "none";
            DOM.imageSelectedBlock.style.display = "flex";
        }

        document.querySelectorAll(".gallery-image").forEach(img => {
            img.classList.remove("selected");
        });

        target.classList.add("selected");

        document.querySelector('#mapPickerModal').classList.remove('show');

        const {preview, location, dateTime, description, tags, public: isPublic} = target.dataset;

        document.querySelector(".image-detail").src = preview;
        DOM.description.value = description;
        DOM.locationBox.value = location;
        DOM.dateBox.value = dateTime;
        DOM.publicCheckbox.checked = isPublic === "true";

        // 태그 정보 로드 및 UI 업데이트
        DOM.tagBox.querySelectorAll('.tag:not(.tag-add)').forEach(tag => tag.remove()); // Clear all tags first

        if (tags) {
            try {
                const parsedTags = JSON.parse(tags);
                parsedTags.forEach(tag => {
                    if (tag.isCustom) {
                        UiHelpers.addCustomTag(tag.tagName);
                    } else {
                        const tagElement = document.createElement('span');
                        tagElement.classList.add('tag', 'regional-tag');
                        tagElement.textContent = tag.tagName;
                        tagElement.dataset.tagId = tag.tagId || '';
                        tagElement.dataset.tagName = tag.tagName;

                        const deleteButton = document.createElement('button');
                        deleteButton.classList.add('tag-delete');
                        deleteButton.innerHTML = '×';
                        deleteButton.title = '태그 삭제';
                        deleteButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            tagElement.remove();
                            const selectedImage = document.querySelector(".gallery-image.selected");
                            if (selectedImage) {
                                UiHelpers.updateSelectedImageTags();
                            }
                        });
                        tagElement.appendChild(deleteButton);
                        const tagAddButton = DOM.tagBox.querySelector('.tag-add');
                        DOM.tagBox.insertBefore(tagElement, tagAddButton);
                    }
                });
            } catch (error) {
                console.error('태그 파싱 오류:', error);
            }
        }

        if (DOM.dateBox.value === "") {
            DOM.dateBox.classList.add("invalid");
        }

        if (DOM.locationBox.value === "") {
            DOM.locationBox.classList.add("invalid");
        }
    },

    // 설명 입력 핸들러
    onDescriptionInput(event) {
        const selectedImage = document.querySelector(".gallery-image.selected");

        if (selectedImage) {
            selectedImage.dataset.description = event.target.value;
        }
    },

    // 공개 체크박스 변경 핸들러
    onPublicChange(event) {
        const selectedImage = document.querySelector(".gallery-image.selected");

        if (selectedImage) {
            selectedImage.dataset.public = event.target.checked;
        }
    },

    // 위치 변경 핸들러
    onLocationChange() {
        ValidationService.validateLocationAndDate();
    },

    // 날짜 변경 핸들러
    async onDateChange() {
        ValidationService.validateLocationAndDate();
        
        // 날짜 변경 시 계절 태그 업데이트
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            await EventHandlers.updateSeasonalTags(selectedImage);
        }
    },
    
    // 계절 태그 업데이트 헬퍼 함수 (위치태그 유지)
    async updateSeasonalTags(selectedImage) {
        const dateTime = selectedImage.dataset.dateTime;
        const latitude = selectedImage.dataset.latitude;
        const longitude = selectedImage.dataset.longitude;
        
        if (!dateTime) {
            return;
        }
        
        try {
            const response = await fetch("/api/tags/season", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({
                    date: dateTime
                })
            });
            
            if (response.ok) {
                const seasonData = await response.json();
                if (seasonData.code === 200 && Array.isArray(seasonData.data)) {
                    // 1. 기존 계절태그만 제거 (다른 태그는 보존)
                    DOM.tagBox.querySelectorAll('.tag.regional-tag').forEach(tag => {
                        const tagName = tag.dataset.tagName;
                        if (tagName && (tagName.includes('봄') || tagName.includes('여름') || 
                                      tagName.includes('가을') || tagName.includes('겨울'))) {
                            tag.remove();
                        }
                    });

                    // 2. 새로운 계절태그만 추가
                    const tagAddButton = DOM.tagBox.querySelector('.tag-add');
                    seasonData.data.forEach(tag => {
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
                            const selectedImage = document.querySelector(".gallery-image.selected");
                            if (selectedImage) {
                                UiHelpers.updateSelectedImageTags();
                            }
                        });

                        tagElement.appendChild(deleteButton);
                        DOM.tagBox.insertBefore(tagElement, tagAddButton);
                    });
                    
                    // 3. 선택된 이미지의 태그 정보 업데이트
                    UiHelpers.updateSelectedImageTags();
                }
            }
        } catch (error) {
            console.error('계절 태그 업데이트 중 오류:', error);
        }
    },

    // 이미지 업로드 버튼 클릭 핸들러
    async onImageUploadClick() {
        // 업로드 전에 현재 선택된 이미지의 태그 정보를 저장
        const currentlySelected = document.querySelector(".gallery-image.selected");
        if (currentlySelected) {
            UiHelpers.updateSelectedImageTags();
        }
        
        DOM.whileUploadingModal.style.display = "flex";
        const imageWrappers = document.querySelectorAll(".image-wrapper");

        const successImageUUIDs = [];
        const failedImageUUIDs = [];

        for (const imageWrapper of imageWrappers) {
            const img = imageWrapper.querySelector(".gallery-image");
            
            try {
                const url = await ApiService.requestPresignedPutUrl(img);
                await ApiService.uploadImageToS3(img, url);
                await ApiService.fetchImgMetaData(img);

                successImageUUIDs.push(img.dataset.uuid);
            } catch (error) {
                failedImageUUIDs.push(error.message);
            }
        }

        await UiHelpers.indicateResult(successImageUUIDs, failedImageUUIDs);

        await console.log("성공한 이미지 : {}", successImageUUIDs);
        await console.log("실패한 이미지 : {}", failedImageUUIDs);

        await UiHelpers.addFailedImage(failedImageUUIDs);

        await new Promise(resolve => setTimeout(resolve, 1000));

        await UiHelpers.hideUploadingBlockAndShowResultBlock();
        
        // 모든 이미지 업로드 성공 시 2초 후 모달 닫고 페이지 새로고침
        if (failedImageUUIDs.length === 0) {
            setTimeout(() => {
                DOM.whileUploadingModal.style.display = "none";
                window.location.reload();
            }, 2000);
        }
    },

    // 이미지 삭제 버튼 클릭 핸들러
    onCloseButtonClick(event) {
        const button = event.target;
        const imageWrapper = button.closest(".image-wrapper");
        if (imageWrapper) {
            const img = imageWrapper.querySelector(".gallery-image");
            if (img && img.classList.contains("selected")) {
                // If the deleted image was selected, clear the detail view
                DOM.imageSelectedBlock.style.display = "none";
                DOM.imageNotSelectedBlock.style.display = "flex";
                DOM.description.value = "";
                DOM.locationBox.value = "";
                DOM.dateBox.value = "";
                DOM.publicCheckbox.checked = false;
                // 태그 정보도 초기화
                UiHelpers.addTags([]);
            }
            imageWrapper.remove();
            ValidationService.updateUploadButtonState(); // Update button state after removal
        }
    },

    // 태그 추가 버튼 클릭 핸들러
    onTagAddClick() {
        DOM.tagInput.style.display = 'inline-block';
        DOM.tagAddButton.style.display = 'none';
        DOM.tagInput.focus();
    },

    // 태그 입력 Enter 키 핸들러
    onTagInputKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagName = DOM.tagInput.value.trim();
            if (tagName) {
                UiHelpers.addCustomTag(tagName);
                DOM.tagInput.value = '';
            }
            DOM.tagInput.style.display = 'none';
            DOM.tagAddButton.style.display = 'block';
        } else if (event.key === 'Escape') {
            DOM.tagInput.value = '';
            DOM.tagInput.style.display = 'none';
            DOM.tagAddButton.style.display = 'block';
        }
    },

    // 태그 입력 블러 핸들러
    onTagInputBlur() {
        const tagName = DOM.tagInput.value.trim();
        if (tagName) {
            UiHelpers.addCustomTag(tagName);
            DOM.tagInput.value = '';
        }
        DOM.tagInput.style.display = 'none';
        DOM.tagAddButton.style.display = 'block';
    },

};

// 초기화 함수
function initialize() {
    // 유효성 검증 리스너 설정
    ValidationService.setupValidationListeners();

    // 데이트피커 설정
    const fp = flatpickr(DOM.dateBox, {
        dateFormat: "Y / m / d",
        maxDate: "today",
        locale: "ko",
        onClose: async function () {
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage) {
                selectedImage.dataset.dateTime = DOM.dateBox.value;

                if (DOM.dateBox.classList.contains("invalid")) {
                    DOM.dateBox.classList.remove("invalid");
                    DOM.dateBox.classList.add("valid");
                }

                ValidationService.validateLocationAndDate();
                
                // 날짜 변경 시 계절 태그 업데이트
                await EventHandlers.updateSeasonalTags(selectedImage);
            }
        }
    });

    // 이벤트 리스너 등록
    document.getElementById('show-datepicker').addEventListener('click', e => {
        e.preventDefault();
        fp.open();
    });

    // 이미지 관련 이벤트 리스너
    DOM.addImageButton.addEventListener("click", EventHandlers.onAddImageClick);
    DOM.fileInput.addEventListener("change", EventHandlers.onFileInputChange);
    document.addEventListener("click", EventHandlers.onGalleryImageClick);
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("close-button")) {
            EventHandlers.onCloseButtonClick(event);
        }
    });
    DOM.description.addEventListener("input", EventHandlers.onDescriptionInput);
    DOM.publicCheckbox.addEventListener("change", EventHandlers.onPublicChange);
    DOM.locationBox.addEventListener("change", EventHandlers.onLocationChange);
    DOM.dateBox.addEventListener("change", EventHandlers.onDateChange);
    DOM.imageUploadBtn.addEventListener("click", EventHandlers.onImageUploadClick);
    
    // 태그 관련 이벤트 리스너
    DOM.tagAddButton.addEventListener("click", EventHandlers.onTagAddClick);
    DOM.tagInput.addEventListener("keydown", EventHandlers.onTagInputKeydown);
    DOM.tagInput.addEventListener("blur", EventHandlers.onTagInputBlur);
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', initialize);

// 전역으로 노출 (맵 피커 모달에서 사용)
window.UiHelpers = UiHelpers;
