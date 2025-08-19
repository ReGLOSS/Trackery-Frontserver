import { parseExif } from "./exifParser.js";
import { tagManager } from "../../module/tags/tagManager.js";
import { UiHelpers } from "../../module/common/uiHelpers.js";
import { ValidationService } from "../../module/common/validationService.js";
import { NotificationHelper } from "../../module/notification/notificationHelper.js";

// DOM 엘리먼트 관리자
const DOM = {
    // 안전한 DOM 조회를 위한 getter 함수들
    get fileInput() { return document.getElementById("imageInput"); },
    get addImageButton() { return document.querySelector(".add-image"); },
    get gallery() { return document.querySelector(".gallery"); },
    get imageNotSelectedBlock() { return document.querySelector(".image-not-selected"); },
    get imageSelectedBlock() { return document.querySelector(".image-selected"); },
    get imageUploadBtn() { return document.querySelector("#imageUploadBtn"); },
    get locationBox() { return document.getElementById("modalLocationBox"); },
    get dateBox() { return document.getElementById("modalDateBox"); },
    get description() { return document.getElementById("modalDescription"); },
    get publicCheckbox() { return document.getElementById("modalPublic"); },
    get whileUploadingModal() { return document.querySelector('.while-uploading-modal'); },
    get tagInput() { return document.querySelector('.tag-input'); },
    get tagAddButton() { return document.querySelector('.tag-add'); },
    get detailModal() { return document.getElementById('detailModal'); },
    get detailModalOverlay() { return document.getElementById('detailModalOverlay'); },

    // 이미지 선택 모달 관련 DOM 요소들
    get imageSelectModal() { return document.getElementById('imageSelectModal'); },
    get imageSelectModalOverlay() { return document.getElementById('imageSelectModalOverlay'); },
    get imageSelectModalClose() { return document.getElementById('imageSelectModalClose'); },
    get dropzoneArea() { return document.getElementById('dropzoneArea'); },
    get browseBtn() { return document.getElementById('browseBtn'); },
    get modalFileInput() { return document.getElementById('modalFileInput'); },
    get selectedFiles() { return document.getElementById('selectedFiles'); },
    get fileGallery() { return document.getElementById('fileGallery'); },
    get cancelBtn() { return document.getElementById('cancelBtn'); },
    get addFilesBtn() { return document.getElementById('addFilesBtn'); },

    // 필수 엘리먼트 검증 함수
    validateRequiredElements() {
        const required = ['fileInput', 'addImageButton', 'gallery', 'imageNotSelectedBlock',
            'imageSelectedBlock', 'description', 'locationBox', 'dateBox'];
        const missing = [];

        for (const elementName of required) {
            if (!this[elementName]) {
                missing.push(elementName);
            }
        }

        if (missing.length > 0) {
            console.error('필수 DOM 엘리먼트가 없습니다:', missing);
            return false;
        }
        return true;
    }
};

// 메모리 관리를 위한 Object URL 추적
const ObjectURLManager = {
    objectUrls: new Set(),

    create(file) {
        const url = URL.createObjectURL(file);
        this.objectUrls.add(url);
        return url;
    },

    revoke(url) {
        if (this.objectUrls.has(url)) {
            URL.revokeObjectURL(url);
            this.objectUrls.delete(url);
        }
    },

    revokeAll() {
        this.objectUrls.forEach(url => URL.revokeObjectURL(url));
        this.objectUrls.clear();
    }
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
    // 위치 정보 가져오기 (TagManager 사용)
    async fetchLocation(file) {
        const exif = await parseExif(file);

        if (!exif) {
            console.warn("EXIF 위치, 날짜 정보 없음");
            return {
                location: '',
                dateTime: '',
                latitude: null,
                longitude: null,
                tags: []
            };
        }

        const { latitude, longitude, dateTime } = exif;
        const formattedDateTime = ImageProcessor.formatDateFromExif(dateTime);

        if (latitude == null || longitude == null) {
            console.warn("위치 정보 없음, 날짜 정보 있음");
            console.warn("날짜 정보 : ", formattedDateTime);
            return {
                location: '',
                dateTime: formattedDateTime,
                latitude: null,
                longitude: null,
                tags: []
            };
        }

        try {
            // TagManager를 사용하여 태그 생성
            const tags = await tagManager.fetchAndCreateTags(latitude, longitude, formattedDateTime);

            // 위치명 생성 (TagManager 사용)
            const displayLocationName = tagManager.extractLocationName(tags);

            return {
                location: displayLocationName,
                dateTime: formattedDateTime,
                latitude,
                longitude,
                tags: tags
            };
        } catch (err) {
            console.error("위치 정보 요청 실패 (CORS 오류 또는 네트워크 오류):", err);
            console.warn("좌표는 있지만 대한민국 범위 밖이거나 네트워크 오류로 인해 위치 정보를 가져올 수 없습니다. EXIF 정보 없음과 동일하게 처리합니다.");
            return {
                location: '',
                dateTime: formattedDateTime,
                latitude: null,
                longitude: null,
                tags: []
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
                headers: { "Content-Type": contentType },
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
                headers: { "Content-Type": "application/json" },
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

// 이벤트 핸들러 모음
const EventHandlers = {
    // 이미지 추가 버튼 클릭 핸들러 - 모달 표시
    onAddImageClick() {
        EventHandlers.showImageSelectModal();
    },

    // 파일 입력 변경 핸들러 (다중 파일 지원)
    async onFileInputChange(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // 파일 개수 제한 (현재 최대 50개)
        const MAX_FILES = 50;
        if (files.length > MAX_FILES) {
            NotificationHelper.showError(`한 번에 최대 ${MAX_FILES}개의 파일만 업로드할 수 있습니다.`);
            return;
        }

        // 각 파일을 순차적으로 처리
        for (const file of files) {
            try {
                // 파일 검증
                const fileExtension = EventHandlers.validateFile(file);

                // EXIF 데이터 파싱 및 위치 정보 요청
                const parsedData = await ApiService.fetchLocation(file);

                // UI 요소 생성 및 추가
                const imageData = EventHandlers.createImageData(file, fileExtension, parsedData);
                const imageElement = EventHandlers.createImageElement(imageData);
                const wrapper = EventHandlers.createImageWrapper(imageElement, imageData.uuid);

                DOM.gallery.appendChild(wrapper);
            } catch (error) {
                NotificationHelper.showError(`${file.name}: ${error.message}`);
            }
        }

        // 파일 입력 초기화 (같은 파일 재선택 가능하도록)
        event.target.value = '';
    },

    // 파일 검증
    validateFile(file) {
        // 파일 크기 검증 (30MB 제한)
        const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`);
        }

        // 파일 타입 검증
        const fileExtension = file.name.split(".").pop().toLowerCase();
        ImageProcessor.extensionToMimeType(fileExtension); // throws error if invalid

        // MIME 타입 검증 (실제 파일 내용 확인)
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.type)) {
            throw new Error("허용되지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드 가능합니다.");
        }

        // 파일명 검증 (보안)
        const fileName = file.name;
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            throw new Error("허용되지 않는 파일명입니다.");
        }

        // 파일명 길이 검증
        if (fileName.length > 255) {
            throw new Error("파일명이 너무 깁니다. 255자 이하로 제한됩니다.");
        }

        return fileExtension;
    },

    // 이미지 데이터 객체 생성
    createImageData(file, fileExtension, parsedData) {
        const { location = '', dateTime = '', tags = [] } = parsedData;
        const objectUrl = ObjectURLManager.create(file);
        const uuid = crypto.randomUUID();

        return {
            objectUrl,
            uuid,
            fileExtension,
            location,
            dateTime,
            tags,
            latitude: parsedData.latitude,
            longitude: parsedData.longitude
        };
    },

    // 이미지 엘리먼트 생성
    createImageElement(imageData) {
        const img = document.createElement("img");
        img.src = imageData.objectUrl;
        img.classList.add("gallery-image");
        img.alt = "추가된 이미지";

        // 데이터셋 설정
        img.dataset.preview = imageData.objectUrl;
        img.dataset.location = imageData.location;
        img.dataset.dateTime = imageData.dateTime;
        img.dataset.description = "";
        img.dataset.public = "false";
        img.dataset.uuid = imageData.uuid;
        img.dataset.fileExtension = imageData.fileExtension;
        img.dataset.latitude = imageData.latitude;
        img.dataset.longitude = imageData.longitude;
        img.dataset.tags = JSON.stringify(imageData.tags);

        // 유효성에 따른 CSS 클래스 추가
        if (imageData.dateTime && imageData.location) {
            img.classList.add("valid");
        } else {
            img.classList.add("invalid");
        }

        return img;
    },

    // 이미지 래퍼 생성
    createImageWrapper(imageElement, uuid) {
        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");
        imageWrapper.dataset.uuid = uuid;

        const closeButton = document.createElement("button");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = "&times;";
        closeButton.title = "업로드 취소";

        imageWrapper.appendChild(imageElement);
        imageWrapper.appendChild(closeButton);
        return imageWrapper;
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

        // 모달 표시
        EventHandlers.showDetailModal();

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

        const { preview, location, dateTime, description, tags, public: isPublic } = target.dataset;

        document.querySelector(".image-detail").src = preview;
        DOM.description.value = description;
        DOM.locationBox.value = location;
        DOM.dateBox.value = dateTime;
        DOM.publicCheckbox.checked = isPublic === "true";

        // 태그 정보 로드 및 UI 업데이트
        if (tags) {
            try {
                const parsedTags = JSON.parse(tags);
                // 일관성을 위해 UiHelpers.addTags() 함수 사용
                UiHelpers.addTags(parsedTags);
            } catch (error) {
                console.error('태그 파싱 오류:', error);
                // 오류 시 빈 태그로 초기화
                UiHelpers.addTags([]);
            }
        } else {
            // 태그가 없을 때도 기존 태그 제거
            UiHelpers.addTags([]);
        }

        // 모달 필드의 유효성 클래스 초기화
        DOM.dateBox.classList.remove("invalid", "valid");
        DOM.locationBox.classList.remove("invalid", "valid");

        // 값에 따라 유효성 클래스 설정
        if (DOM.dateBox.value === "") {
            DOM.dateBox.classList.add("invalid");
        } else {
            DOM.dateBox.classList.add("valid");
        }

        if (DOM.locationBox.value === "") {
            DOM.locationBox.classList.add("invalid");
        } else {
            DOM.locationBox.classList.add("valid");
        }
    },

    // 디테일 모달 표시
    showDetailModal() {
        if (DOM.detailModal) {
            DOM.detailModal.style.display = 'block';
            // 애니메이션을 위해 약간의 지연 후 show 클래스 추가
            setTimeout(() => {
                DOM.detailModal.classList.add('show');
            }, 10);
        }
    },

    // 디테일 모달 숨기기
    hideDetailModal() {
        if (DOM.detailModal) {
            DOM.detailModal.classList.remove('show');
            // 애니메이션 완료 후 display none
            setTimeout(() => {
                DOM.detailModal.style.display = 'none';
                // 선택된 이미지 정보 초기화
                document.querySelectorAll(".gallery-image").forEach(img => {
                    img.classList.remove("selected");
                });
                DOM.imageNotSelectedBlock.style.display = "flex";
                DOM.imageSelectedBlock.style.display = "none";
                // 맵 모달도 닫기
                document.querySelector('#mapPickerModal').classList.remove('show');
            }, 300);
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

        // 날짜 변경 시 계절 태그 업데이트 (TagManager 사용)
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            await EventHandlers.updateSeasonalTags(selectedImage);
        }
    },

    // 계절 태그 업데이트 헬퍼 함수 (TagManager 사용)
    async updateSeasonalTags(selectedImage) {
        const dateTime = selectedImage.dataset.dateTime;

        if (!dateTime) {
            return;
        }

        try {
            // 기존 태그 정보 가져오기
            let existingTags = [];
            try {
                existingTags = JSON.parse(selectedImage.dataset.tags || '[]');
            } catch (error) {
                console.error('기존 태그 파싱 오류:', error);
            }

            // 새로운 계절 태그 가져오기
            const seasonTags = await tagManager.apiService.fetchSeasonTags(dateTime);

            // TagManager를 사용하여 계절 태그 업데이트
            const updatedTags = tagManager.handleSeasonChange(existingTags, seasonTags);

            // UI 업데이트
            UiHelpers.addTags(updatedTags);

            // 선택된 이미지의 태그 정보 업데이트
            selectedImage.dataset.tags = JSON.stringify(updatedTags);

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

        DOM.whileUploadingModal.classList.add("show");
        const imageWrappers = document.querySelectorAll(".image-wrapper");

        // SSE 연결 설정
        const eventSource = new EventSource('/api/sse/connect', {
            withCredentials: true
        });
        const processedImages = new Set();
        const successImageUUIDs = [];
        const failedImageUUIDs = [];

        // SSE 연결 상태 로그
        eventSource.onopen = function (event) {
            console.log('SSE 연결 성공:', event);
        };

        // SSE 메시지 처리 - 이미지 처리 완료 알림을 받으면 결과 표시
        eventSource.onmessage = function (event) {
            console.log('SSE 원본 메시지 수신:', event.data);

            // data: 접두사가 있는 경우만 처리 (SSE 데이터 메시지)
            if (event.data.startsWith('data:')) {
                try {
                    // 'data:' 접두사 제거하고 JSON 파싱
                    const jsonData = event.data.substring(5); // 'data:' 제거
                    console.log('JSON 데이터 추출:', jsonData);

                    const data = JSON.parse(jsonData);
                    console.log('SSE 파싱된 데이터:', data);
                    console.log('메시지 타입:', data.type);

                    if (data.type === 'SINGLE_IMAGE') {
                        console.log('SINGLE_IMAGE 타입 메시지 처리 시작');
                        console.log('batchId:', data.batchId);
                        console.log('imageName:', data.imageName);

                        processedImages.add(data.batchId);
                        successImageUUIDs.push(data.imageName);

                        console.log('현재 처리된 이미지 수:', processedImages.size);
                        console.log('전체 이미지 수:', imageWrappers.length);
                        console.log('처리된 이미지 목록:', Array.from(processedImages));
                        console.log('성공한 이미지 목록:', successImageUUIDs);

                        // 모든 이미지가 처리되었는지 확인
                        if (processedImages.size === imageWrappers.length) {
                            console.log('모든 이미지 처리 완료 - handleAllImagesProcessed 호출');
                            EventHandlers.handleAllImagesProcessed(eventSource, successImageUUIDs, failedImageUUIDs);
                        }
                    } else {
                        console.log('알 수 없는 메시지 타입:', data.type);
                    }
                } catch (error) {
                    console.error('SSE 메시지 파싱 오류:', error);
                    console.error('원본 데이터:', event.data);
                }
            } else {
                console.log('SSE 이벤트 타입 메시지 (무시):', event.data);
            }
        };

        eventSource.onerror = function (event) {
            console.error('SSE 연결 오류:', event);
            console.error('SSE readyState:', eventSource.readyState);
            console.error('SSE url:', eventSource.url);
            eventSource.close();
        };

        // 이미지 업로드만 수행하고, 결과 표시는 SSE를 통해서만 처리
        for (const imageWrapper of imageWrappers) {
            const img = imageWrapper.querySelector(".gallery-image");

            try {
                const url = await ApiService.requestPresignedPutUrl(img);
                await ApiService.uploadImageToS3(img, url);
                await ApiService.fetchImgMetaData(img);
                // 성공/실패 처리 제거 - SSE에서만 처리
            } catch (error) {
                failedImageUUIDs.push(error.message);
                // 실패한 경우에만 즉시 처리하거나, 타임아웃 설정 필요
                console.error("업로드 실패:", error);
            }
        }
    },

    // 모든 이미지 처리 완료 시 처리 함수 (SSE를 통해서만 호출됨)
    async handleAllImagesProcessed(eventSource, successImageUUIDs, failedImageUUIDs) {
        console.log('handleAllImagesProcessed 함수 시작');
        console.log('SSE 연결 종료 시도');
        eventSource.close();

        console.log('UiHelpers.indicateResult 호출 - 성공:', successImageUUIDs.length, '실패:', failedImageUUIDs.length);
        await UiHelpers.indicateResult(successImageUUIDs, failedImageUUIDs);

        console.log("성공한 이미지 : {}", successImageUUIDs);
        console.log("실패한 이미지 : {}", failedImageUUIDs);

        console.log('UiHelpers.addFailedImage 호출');
        await UiHelpers.addFailedImage(failedImageUUIDs);

        console.log('1초 대기 시작');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('UiHelpers.hideUploadingBlockAndShowResultBlock 호출');
        await UiHelpers.hideUploadingBlockAndShowResultBlock();

        // 모든 이미지 업로드 성공 시 홈에서 플래그로 지도 업데이트 처리
        if (failedImageUUIDs.length === 0) {
            // localStorage에 플래그 설정하여 홈 페이지에서 지도 업데이트 처리
            localStorage.setItem('trackery_map_update_needed', Date.now().toString());

            // 5초 후 모달 닫고 새로고침
            setTimeout(() => {
                console.log('모달 닫기 및 페이지 새로고침 실행');
                DOM.whileUploadingModal.classList.remove("show");
                window.location.reload();
            }, 5000);
        }
    },

    // 이미지 삭제 버튼 클릭 핸들러
    onCloseButtonClick(event) {
        const button = event.target;
        const imageWrapper = button.closest(".image-wrapper");
        if (imageWrapper) {
            const img = imageWrapper.querySelector(".gallery-image");

            // Object URL 메모리 정리
            if (img && img.dataset.preview) {
                ObjectURLManager.revoke(img.dataset.preview);
            }

            if (img && img.classList.contains("selected")) {
                // If the deleted image was selected, clear the detail view and close modal
                DOM.imageSelectedBlock.style.display = "none";
                DOM.imageNotSelectedBlock.style.display = "flex";
                DOM.description.value = "";
                DOM.locationBox.value = "";
                DOM.dateBox.value = "";
                DOM.publicCheckbox.checked = false;
                // 태그 정보도 초기화
                UiHelpers.addTags([]);
                // 모달 닫기
                EventHandlers.hideDetailModal();
            }
            imageWrapper.remove();
            ValidationService.updateUploadButtonState(); // Update button state after removal
        }
    },

    // 태그 추가 버튼 클릭 핸들러 (TagUIManager로 위임)
    onTagAddClick() {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        if (tagManager) {
            tagManager.showTagInput();
        }
    },

    // 태그 입력 Enter 키 핸들러 (TagUIManager로 위임)
    onTagInputKeydown(event) {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        if (tagManager) {
            tagManager.handleTagInputKeydown(event);
        }
    },

    // 태그 입력 블러 핸들러 (TagUIManager로 위임)
    onTagInputBlur() {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        if (tagManager) {
            tagManager.hideTagInput();
        }
    },


    // === 이미지 선택 모달 관련 핸들러들 ===

    // 모달 표시
    showImageSelectModal() {
        if (DOM.imageSelectModal) {
            DOM.imageSelectModal.style.display = 'flex';
            // 애니메이션을 위해 약간의 지연 후 클래스 추가
            setTimeout(() => {
                DOM.imageSelectModal.classList.add('show');
            }, 10);
        }
        // 기존 파일 목록 초기화
        ImageSelectModal.clearFileList();
    },

    // 모달 숨기기
    hideImageSelectModal() {
        if (DOM.imageSelectModal) {
            DOM.imageSelectModal.classList.remove('show');
            setTimeout(() => {
                DOM.imageSelectModal.style.display = 'none';
                // 모달 상태 초기화
                ImageSelectModal.resetModal();
            }, 300);
        }
    },

    // 모달 내 파일 선택 버튼 클릭
    onBrowseBtnClick() {
        DOM.modalFileInput.click();
    },

    // 모달 내 파일 입력 변경
    onModalFileInputChange(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            ImageSelectModal.addFilesToList(files);
        }
        // 파일 입력 초기화
        event.target.value = '';
    },

    // 모달 내 드래그 앤 드롭 핸들러들
    onModalDragEnter(event) {
        event.preventDefault();
        event.stopPropagation();
        DOM.dropzoneArea.classList.add('drag-over');
    },

    onModalDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    },

    onModalDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!DOM.dropzoneArea.contains(event.relatedTarget)) {
            DOM.dropzoneArea.classList.remove('drag-over');
        }
    },

    onModalDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        DOM.dropzoneArea.classList.remove('drag-over');

        const files = Array.from(event.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            ImageSelectModal.addFilesToList(imageFiles);
        }

        if (imageFiles.length !== files.length) {
            NotificationHelper.showError(`${files.length - imageFiles.length}개의 파일은 이미지가 아니어서 제외되었습니다.`);
        }
    },

    // 파일 추가 버튼 클릭
    async onAddFilesBtnClick() {
        const files = ImageSelectModal.getSelectedFiles();
        if (files.length === 0) {
            NotificationHelper.showError('선택된 파일이 없습니다.');
            return;
        }

        // 모달 닫기
        EventHandlers.hideImageSelectModal();

        // 처리 중 표시 UI
        const processingIndicator = EventHandlers.showProcessingIndicator();

        // 총 개수 초기화
        EventHandlers.initializeProcessingProgress(processingIndicator, files.length);

        try {
            // 모든 이미지를 처리하고 메모리에 저장
            const processedImages = [];
            const totalFiles = files.length;
            let processedCount = 0;

            for (const file of files) {
                try {
                    // ValidationService를 통한 파일 검증
                    const fileExtension = EventHandlers.validateFile(file);

                    // EXIF 데이터 파싱 및 위치 정보 요청
                    const parsedData = await ApiService.fetchLocation(file);

                    // 이미지 데이터 생성
                    const imageData = EventHandlers.createImageData(file, fileExtension, parsedData);
                    processedImages.push(imageData);

                    processedCount++;
                    EventHandlers.updateProcessingProgress(processingIndicator, processedCount, totalFiles);

                } catch (error) {
                    NotificationHelper.showError(`${file.name}: ${error.message}`);
                    processedCount++;
                    EventHandlers.updateProcessingProgress(processingIndicator, processedCount, totalFiles);
                }
            }

            // 처리 완료 후 모든 이미지를 한번에 base-container에 추가
            for (const imageData of processedImages) {
                const imageElement = EventHandlers.createImageElement(imageData);
                const wrapper = EventHandlers.createImageWrapper(imageElement, imageData.uuid);
                DOM.gallery.appendChild(wrapper);
            }

        } finally {
            // 처리 중 표시 제거
            EventHandlers.hideProcessingIndicator(processingIndicator);
        }
    },

    // 취소 버튼 클릭
    onCancelBtnClick() {
        EventHandlers.hideImageSelectModal();
    },

    // 처리 중 표시 UI 생성 및 표시
    showProcessingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'processing-indicator';
        indicator.innerHTML = `
            <div class="processing-content">
                <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                <h4 class="processing-message">이미지를 처리하는 중입니다...</h4>
                <div class="progress-info">
                    <div class="progress-text">
                        <span class="current-count">0</span> / <span class="total-count">0</span> 완료
                    </div>
                    <div class="progress progress-sm mb-2">
                        <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="progress-percentage text-secondary">0%</div>
                </div>
            </div>
        `;

        document.body.appendChild(indicator);

        // 애니메이션 효과
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
        });

        return indicator;
    },

    // 진행률 업데이트
    updateProcessingProgress(indicator, currentCount, totalCount) {
        if (!indicator) return;

        const percentage = Math.round((currentCount / totalCount) * 100);

        const currentCountElement = indicator.querySelector('.current-count');
        const totalCountElement = indicator.querySelector('.total-count');
        const progressBar = indicator.querySelector('.progress-bar');
        const progressPercentage = indicator.querySelector('.progress-percentage');

        if (currentCountElement) currentCountElement.textContent = currentCount;
        if (totalCountElement) totalCountElement.textContent = totalCount;
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (progressPercentage) progressPercentage.textContent = percentage + '%';
    },

    // 처리 시작 시 총 개수 설정
    initializeProcessingProgress(indicator, totalCount) {
        if (!indicator) return;

        const totalCountElement = indicator.querySelector('.total-count');
        if (totalCountElement) totalCountElement.textContent = totalCount;

        this.updateProcessingProgress(indicator, 0, totalCount);
    },

    // 처리 중 표시 UI 제거
    hideProcessingIndicator(indicator) {
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }
    },

};

// 이미지 선택 모달 관리 객체
const ImageSelectModal = {
    selectedFiles: [],

    // 파일 목록에 파일 추가
    addFilesToList(files) {
        // 파일 개수 제한 확인
        const MAX_FILES = 20;
        const currentCount = this.selectedFiles.length;
        const newFilesCount = files.length;

        if (currentCount + newFilesCount > MAX_FILES) {
            NotificationHelper.showError(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
            return;
        }

        // 중복 파일 확인 및 필터링
        const validFiles = [];
        for (const file of files) {
            try {
                EventHandlers.validateFile(file);
                // 같은 이름의 파일이 이미 있는지 확인
                const isDuplicate = this.selectedFiles.some(existing =>
                    existing.name === file.name && existing.size === file.size
                );
                if (!isDuplicate) {
                    validFiles.push(file);
                } else {
                    NotificationHelper.showError(`${file.name}은 이미 선택된 파일입니다.`);
                }
            } catch (error) {
                NotificationHelper.showError(`${file.name}: ${error.message}`);
            }
        }

        // 유효한 파일들을 목록에 추가
        this.selectedFiles.push(...validFiles);
        this.updateUI();
    },

    // 파일 목록에서 파일 제거
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateUI();
    },

    // UI 업데이트
    updateUI() {
        if (this.selectedFiles.length === 0) {
            DOM.selectedFiles.style.display = 'none';
            DOM.dropzoneArea.style.display = 'block';
        } else {
            DOM.selectedFiles.style.display = 'block';
            DOM.dropzoneArea.style.display = 'none';
            this.renderFileList();
        }
    },

    // 파일 목록을 앨범형식으로 렌더링
    renderFileList() {
        const fileGallery = DOM.fileGallery;
        fileGallery.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const fileSize = this.formatFileSize(file.size);
            const thumbnail = ObjectURLManager.create(file);

            fileItem.innerHTML = `
                <img src="${thumbnail}" alt="${file.name}" class="file-thumbnail" />
                <div class="file-info">
                    <div class="file-details">
                        <h5>${file.name}</h5>
                        <small>${fileSize}</small>
                    </div>
                </div>
                <button class="file-remove" onclick="ImageSelectModal.removeFile(${index})">&times;</button>
            `;

            fileGallery.appendChild(fileItem);
        });
    },

    // 파일 크기 포맷팅
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 선택된 파일들 반환
    getSelectedFiles() {
        return [...this.selectedFiles];
    },

    // 파일 목록 초기화
    clearFileList() {
        this.selectedFiles = [];
        this.updateUI();
    },

    // 모달 상태 초기화
    resetModal() {
        this.clearFileList();
        DOM.dropzoneArea.style.display = 'block';
        DOM.selectedFiles.style.display = 'none';
        DOM.dropzoneArea.classList.remove('drag-over');
    }
};

// 이미지 전체화면 토글 기능
function toggleImageFullscreen() {
    const imageDetail = document.querySelector('.image-container .image-detail');
    if (!imageDetail) return;

    // 기존 전체화면 오버레이가 있는지 확인
    let existingOverlay = document.querySelector('.fullSize-image-overlay');

    if (existingOverlay) {
        // 전체화면 오버레이 제거
        existingOverlay.remove();
    } else {
        // 전체화면 오버레이 생성
        const overlay = document.createElement('div');
        overlay.className = 'fullSize-image-overlay';

        // 전체화면 이미지 생성
        const fullSizeImage = document.createElement('img');
        fullSizeImage.src = imageDetail.src;
        fullSizeImage.className = 'image-detail fullSize';
        fullSizeImage.alt = imageDetail.alt;

        // 클릭 시 오버레이 제거
        overlay.addEventListener('click', () => {
            overlay.remove();
        });

        // ESC 키로도 닫기 가능
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });

        // 오버레이에 이미지 추가하고 body에 삽입
        overlay.appendChild(fullSizeImage);
        document.body.appendChild(overlay);
    }
}

// 초기화 함수
function initialize() {
    // 필수 DOM 엘리먼트 검증
    if (!DOM.validateRequiredElements()) {
        console.error('초기화 실패: 필수 DOM 엘리먼트가 누락되었습니다.');
        return;
    }

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

                // 날짜 변경 시 계절 태그 업데이트 (TagManager 사용)
                await EventHandlers.updateSeasonalTags(selectedImage);
            }
        }
    });

    // 이벤트 리스너 등록 (안전한 방식으로)
    const showDatepicker = document.getElementById('modalEditDateBtn');
    if (showDatepicker) {
        showDatepicker.addEventListener('click', e => {
            e.preventDefault();
            fp.open();
        });
    }

    // 이미지 관련 이벤트 리스너 (null 체크 포함)
    if (DOM.addImageButton) DOM.addImageButton.addEventListener("click", EventHandlers.onAddImageClick);
    if (DOM.fileInput) DOM.fileInput.addEventListener("change", EventHandlers.onFileInputChange);
    document.addEventListener("click", EventHandlers.onGalleryImageClick);
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("close-button")) {
            EventHandlers.onCloseButtonClick(event);
        }
    });
    if (DOM.description) DOM.description.addEventListener("input", EventHandlers.onDescriptionInput);
    if (DOM.publicCheckbox) DOM.publicCheckbox.addEventListener("change", EventHandlers.onPublicChange);
    if (DOM.locationBox) DOM.locationBox.addEventListener("change", EventHandlers.onLocationChange);
    if (DOM.dateBox) DOM.dateBox.addEventListener("change", EventHandlers.onDateChange);
    if (DOM.imageUploadBtn) DOM.imageUploadBtn.addEventListener("click", EventHandlers.onImageUploadClick);

    // 태그 관련 이벤트 리스너 (null 체크 포함)
    if (DOM.tagAddButton) DOM.tagAddButton.addEventListener("click", EventHandlers.onTagAddClick);
    if (DOM.tagInput) DOM.tagInput.addEventListener("keydown", EventHandlers.onTagInputKeydown);
    if (DOM.tagInput) DOM.tagInput.addEventListener("blur", EventHandlers.onTagInputBlur);


    // 이미지 선택 모달 이벤트 리스너들
    if (DOM.imageSelectModalOverlay) {
        DOM.imageSelectModalOverlay.addEventListener("click", EventHandlers.hideImageSelectModal);
    }
    if (DOM.imageSelectModalClose) {
        DOM.imageSelectModalClose.addEventListener("click", EventHandlers.hideImageSelectModal);
    }
    if (DOM.browseBtn) {
        DOM.browseBtn.addEventListener("click", EventHandlers.onBrowseBtnClick);
    }
    if (DOM.modalFileInput) {
        DOM.modalFileInput.addEventListener("change", EventHandlers.onModalFileInputChange);
    }
    if (DOM.dropzoneArea) {
        DOM.dropzoneArea.addEventListener("dragenter", EventHandlers.onModalDragEnter);
        DOM.dropzoneArea.addEventListener("dragover", EventHandlers.onModalDragOver);
        DOM.dropzoneArea.addEventListener("dragleave", EventHandlers.onModalDragLeave);
        DOM.dropzoneArea.addEventListener("drop", EventHandlers.onModalDrop);
        DOM.dropzoneArea.addEventListener("click", EventHandlers.onBrowseBtnClick);
    }
    if (DOM.addFilesBtn) {
        DOM.addFilesBtn.addEventListener("click", EventHandlers.onAddFilesBtnClick);
    }
    if (DOM.cancelBtn) {
        DOM.cancelBtn.addEventListener("click", EventHandlers.onCancelBtnClick);
    }

    // 이미지 컨테이너 클릭 이벤트 (전체화면 보기)
    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) {
        imageContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleImageFullscreen();
        });
    }

    // 디테일 모달 관련 이벤트 리스너
    if (DOM.detailModalOverlay) {
        DOM.detailModalOverlay.addEventListener("click", EventHandlers.hideDetailModal);
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.imageSelectModal && DOM.imageSelectModal.style.display === 'flex') {
                EventHandlers.hideImageSelectModal();
            } else if (DOM.detailModal && DOM.detailModal.classList.contains('show')) {
                EventHandlers.hideDetailModal();
            }
        }
    });
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', initialize);

// 페이지 이탈 시 메모리 정리
window.addEventListener('beforeunload', () => {
    ObjectURLManager.revokeAll();
});
