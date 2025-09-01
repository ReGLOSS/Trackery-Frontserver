import { parseExif } from "./exifParser.js";
import { tagManager } from "../../module/tags/tagManager.js";
import { UiHelpers } from "../../module/common/uiHelpers.js";
import { ValidationService } from "../../module/common/validationService.js";
import { NotificationHelper } from "../../module/notification/notificationHelper.js";
import { ProcessingIndicator } from "../../module/processingIndicator/js/processingIndicator.js";
import { SideModal } from "../../module/sideModal/js/sideModal.js";

// ===== 상수 정의 =====
/**
 * 이미지 업로드 관련 상수들
 * 파일 크기, 확장자, MIME 타입 등의 제한사항을 정의
 */
const CONSTANTS = {
    MAX_FILES: 50,
    MAX_FILE_SIZE: 30 * 1024 * 1024, // 30MB
    MAX_FILE_NAME_LENGTH: 255,
    ALLOWED_EXTENSIONS: ['png', 'webp', 'jpg', 'jpeg'],
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    MIME_TYPE_MAP: {
        'png': 'image/png',
        'webp': 'image/webp',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg'
    }
};

// ===== 전역 변수 =====
let detailModal = null;

// ===== SideModal 헬퍼 함수들 =====
/**
 * SideModal 안전 접근을 위한 헬퍼 함수들
 */
const SideModalHelper = {
    /**
     * SideModal이 사용 가능한지 확인
     */
    isAvailable() {
        return detailModal && detailModal.isInitialized;
    },

    /**
     * SideModal 내부 요소 안전 접근
     */
    getElement(selector) {
        if (!this.isAvailable()) return null;
        return detailModal.modalBody?.querySelector(selector) || null;
    },

    /**
     * SideModal 열기
     */
    open() {
        if (this.isAvailable()) {
            detailModal.open();
            return true;
        }
        console.error('SideModal을 열 수 없습니다.');
        return false;
    },

    /**
     * SideModal 닫기
     */
    close() {
        if (this.isAvailable()) {
            detailModal.close();
            return true;
        }
        return false;
    }
};

// ===== DOM 관리자 =====
/**
 * DOM 요소 접근을 위한 중앙화된 관리자
 * getter 패턴을 사용하여 동적으로 DOM 요소를 찾아 반환
 */
const DOM = {
    get fileInput() { return document.getElementById("imageInput"); },
    get addImageButton() { return document.querySelector(".add-image"); },
    get gallery() { return document.querySelector(".gallery"); },
    // 기본 업로드 기능
    get imageUploadBtn() { return document.querySelector("#imageUploadBtn"); },

    // 이미지 선택 모달
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

    validateRequiredElements() {
        // 업로드 페이지의 필수 DOM 요소들 확인
        const required = ['fileInput', 'addImageButton', 'gallery', 'imageUploadBtn'];
        const missing = required.filter(name => !this[name]);

        if (missing.length > 0) {
            console.error('필수 DOM 엘리먼트가 없습니다:', missing);
            return false;
        }

        console.log('업로드 페이지 DOM 요소 검증 완료');
        return true;
    }
};

// ===== Object URL 관리자 =====
/**
 * 메모리 누수 방지를 위한 Object URL 관리 클래스
 * 생성된 blob URL들을 추적하고 적절한 시점에 해제
 */
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

// ===== 이미지 처리 유틸리티 =====
/**
 * 이미지 파일 처리 관련 유틸리티 함수들
 * MIME 타입 변환, EXIF 날짜 포맷팅 등의 기능 제공
 */
const ImageProcessor = {
    extensionToMimeType(extension) {
        const mimeType = CONSTANTS.MIME_TYPE_MAP[extension.toLowerCase()];
        if (!mimeType) {
            throw new Error("허용되지 않는 파일입니다. 현재 jpg, jpeg, png, webp만 지원하고있습니다.");
        }
        return mimeType;
    },

    formatDateFromExif(dateTime) {
        if (!dateTime) return "";
        
        const [date] = dateTime.split(" ");
        const [year, month, day] = date.split(":");
        return `${year} / ${parseInt(month)} / ${parseInt(day)}`;
    }
};

// ===== API 서비스 =====
/**
 * 백엔드 API와의 통신을 담당하는 서비스 클래스
 * 위치 정보 요청, S3 업로드, 메타데이터 전송 등의 기능 제공
 */
const ApiService = {
    async fetchLocation(file) {
        const exif = await parseExif(file);

        if (!exif) {
            return { location: '', dateTime: '', latitude: null, longitude: null, tags: [] };
        }

        const { latitude, longitude, dateTime } = exif;
        const formattedDateTime = ImageProcessor.formatDateFromExif(dateTime);

        if (latitude == null || longitude == null) {
            return { location: '', dateTime: formattedDateTime, latitude: null, longitude: null, tags: [] };
        }

        try {
            const tags = await tagManager.fetchAndCreateTags(latitude, longitude, formattedDateTime);
            const displayLocationName = tagManager.extractLocationName(tags);

            return {
                location: displayLocationName,
                dateTime: formattedDateTime,
                latitude,
                longitude,
                tags: tags
            };
        } catch (err) {
            console.error("위치 정보 요청 실패:", err);
            return { location: '', dateTime: formattedDateTime, latitude: null, longitude: null, tags: [] };
        }
    },

    async requestPresignedPutUrl(imageElement) {
        const fileName = `${imageElement.dataset.uuid}.${imageElement.dataset.fileExtension}`;

        try {
            const response = await fetch(`/api/images/presigned-url/put?imageFileName=${fileName}`, {
                method: "GET",
                credentials: "include"
            });

            if (response.status === 400) {
                throw new Error(imageElement.dataset.uuid);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Presigned URL 요청 실패:", error);
            throw error;
        }
    },

    async uploadImageToS3(imageElement, url) {
        const response = await fetch(imageElement.src);
        if (!response.ok) {
            throw new Error(imageElement.dataset.uuid);
        }
        
        const blob = await response.blob();
        const contentType = ImageProcessor.extensionToMimeType(imageElement.dataset.fileExtension);

        const uploadResponse = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: blob
        });

        if (uploadResponse.status !== 200) {
            throw new Error(imageElement.dataset.uuid);
        }

        return uploadResponse;
    },

    async fetchImgMetaData(imageElement) {
        const fileName = `${imageElement.dataset.uuid}.${imageElement.dataset.fileExtension}`;

        let tags = [];
        try {
            tags = JSON.parse(imageElement.dataset.tags || '[]');
        } catch (error) {
            console.error('태그 파싱 오류:', error);
        }

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
        }

        return response;
    }
};

// ===== 파일 검증 유틸리티 =====
/**
 * 업로드 파일의 유효성을 검증하는 유틸리티 클래스
 * 파일 크기, 타입, 이름 등의 보안 검증 수행
 */
const FileValidator = {
    validate(file) {
        this.validateFileSize(file);
        this.validateFileType(file);
        this.validateFileName(file);
        
        return file.name.split(".").pop().toLowerCase();
    },

    validateFileSize(file) {
        if (file.size > CONSTANTS.MAX_FILE_SIZE) {
            throw new Error(`파일 크기가 너무 큽니다. 최대 ${CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`);
        }
    },

    validateFileType(file) {
        const fileExtension = file.name.split(".").pop().toLowerCase();
        
        if (!CONSTANTS.ALLOWED_EXTENSIONS.includes(fileExtension)) {
            throw new Error("허용되지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드 가능합니다.");
        }

        if (!CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error("허용되지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드 가능합니다.");
        }
    },

    validateFileName(file) {
        const fileName = file.name;
        
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\\\')) {
            throw new Error("허용되지 않는 파일명입니다.");
        }

        if (fileName.length > CONSTANTS.MAX_FILE_NAME_LENGTH) {
            throw new Error("파일명이 너무 깁니다. 255자 이하로 제한됩니다.");
        }
    }
};

// ===== 이미지 요소 팩토리 =====
/**
 * 이미지 DOM 요소 생성을 담당하는 팩토리 클래스
 * 이미지 데이터 구조체 생성, DOM 요소 생성, 래퍼 생성 등의 기능 제공
 */
const ImageElementFactory = {
    createImageData(file, fileExtension, parsedData) {
        const { location = '', dateTime = '', tags = [] } = parsedData;
        const objectUrl = ObjectURLManager.create(file);
        const uuid = crypto.randomUUID();

        return {
            objectUrl, uuid, fileExtension, location, dateTime, tags,
            latitude: parsedData.latitude,
            longitude: parsedData.longitude
        };
    },

    createImageElement(imageData) {
        const img = document.createElement("img");
        img.src = imageData.objectUrl;
        img.classList.add("gallery-image");
        img.alt = "추가된 이미지";

        // 데이터셋 설정
        Object.assign(img.dataset, {
            preview: imageData.objectUrl,
            location: imageData.location,
            dateTime: imageData.dateTime,
            description: "",
            public: "false",
            uuid: imageData.uuid,
            fileExtension: imageData.fileExtension,
            latitude: imageData.latitude,
            longitude: imageData.longitude,
            tags: JSON.stringify(imageData.tags)
        });

        // 유효성에 따른 CSS 클래스 추가
        if (imageData.dateTime && imageData.location) {
            img.classList.add("valid");
        } else {
            img.classList.add("invalid");
        }

        return img;
    },

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
    }
};

// ===== 모달 관리자 =====
/**
 * 이미지 선택 모달의 표시/숨김을 관리하는 클래스
 * SideModal은 detailModal 인스턴스를 통해 직접 제어
 */
const ModalManager = {

    /**
     * 이미지 선택 모달 표시
     */
    showImageSelectModal() {
        if (DOM.imageSelectModal) {
            DOM.imageSelectModal.style.display = 'flex';
            setTimeout(() => DOM.imageSelectModal.classList.add('show'), 10);
        }
        ImageSelectModal.clearFileList();
    },

    /**
     * 이미지 선택 모달 숨김
     */
    hideImageSelectModal() {
        if (DOM.imageSelectModal) {
            DOM.imageSelectModal.classList.remove('show');
            setTimeout(() => {
                DOM.imageSelectModal.style.display = 'none';
                ImageSelectModal.resetModal();
            }, 300);
        }
    }
};

// ===== 이벤트 핸들러 =====
/**
 * 사용자 상호작용 이벤트를 처리하는 핸들러 집합
 * 파일 업로드, 모달 제어, 이미지 선택 등의 이벤트 처리
 */
const EventHandlers = {
    onAddImageClick() {
        ModalManager.showImageSelectModal();
    },

    async onFileInputChange(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (files.length > CONSTANTS.MAX_FILES) {
            NotificationHelper.showError(`한 번에 최대 ${CONSTANTS.MAX_FILES}개의 파일만 업로드할 수 있습니다.`);
            return;
        }

        for (const file of files) {
            try {
                const fileExtension = FileValidator.validate(file);
                const parsedData = await ApiService.fetchLocation(file);
                const imageData = ImageElementFactory.createImageData(file, fileExtension, parsedData);
                const imageElement = ImageElementFactory.createImageElement(imageData);
                const wrapper = ImageElementFactory.createImageWrapper(imageElement, imageData.uuid);

                DOM.gallery.appendChild(wrapper);
            } catch (error) {
                NotificationHelper.showError(`${file.name}: ${error.message}`);
            }
        }

        event.target.value = '';
    },

    onGalleryImageClick(event) {
        const target = event.target;
        const imageWrapper = target.closest(".image-wrapper");
        if (!imageWrapper || target.classList.contains("close-button")) return;

        // 이전 선택된 이미지의 태그 정보 저장
        const previouslySelected = document.querySelector(".gallery-image.selected");
        if (previouslySelected) {
            UiHelpers.updateSelectedImageTags();
        }

        // SideModal 열기
        SideModalHelper.open();

        // 모달 내부 상태 변경
        const imageNotSelectedBlock = SideModalHelper.getElement(".image-not-selected");
        const imageSelectedBlock = SideModalHelper.getElement(".image-selected");
        
        if (imageNotSelectedBlock && imageSelectedBlock) {
            const notSelectedImageDisplay = window.getComputedStyle(imageNotSelectedBlock).display;
            if (notSelectedImageDisplay === "flex") {
                imageNotSelectedBlock.style.display = "none";
                imageSelectedBlock.style.display = "flex";
            }
        }

        // 선택 상태 업데이트
        document.querySelectorAll(".gallery-image").forEach(img => img.classList.remove("selected"));
        target.classList.add("selected");

        // 맵 모달 닫기
        document.querySelector('#mapPickerModal')?.classList.remove('show');

        EventHandlers.updateModalContent(target);
        EventHandlers.updateFieldValidation();
    },

    updateModalContent(target) {
        const { preview, location, dateTime, description, tags, public: isPublic } = target.dataset;

        // SideModal 요소들 안전 접근
        const imageDetail = SideModalHelper.getElement(".image-detail");
        const descriptionInput = SideModalHelper.getElement("#modalDescription");
        const locationBox = SideModalHelper.getElement("#modalLocationBox");
        const dateBox = SideModalHelper.getElement("#modalDateBox");
        const publicCheckbox = SideModalHelper.getElement("#modalPublic");

        if (imageDetail) imageDetail.src = preview;
        if (descriptionInput) descriptionInput.value = description;
        if (locationBox) locationBox.value = location;
        if (dateBox) dateBox.value = dateTime;
        if (publicCheckbox) publicCheckbox.checked = isPublic === "true";

        // 태그 정보 로드
        if (tags) {
            try {
                const parsedTags = JSON.parse(tags);
                UiHelpers.addTags(parsedTags);
            } catch (error) {
                console.error('태그 파싱 오류:', error);
                UiHelpers.addTags([]);
            }
        } else {
            UiHelpers.addTags([]);
        }
    },

    updateFieldValidation() {
        const dateBox = SideModalHelper.getElement("#modalDateBox");
        const locationBox = SideModalHelper.getElement("#modalLocationBox");

        if (dateBox) {
            dateBox.classList.remove("invalid", "valid");
            dateBox.classList.add(dateBox.value === "" ? "invalid" : "valid");
        }

        if (locationBox) {
            locationBox.classList.remove("invalid", "valid");
            locationBox.classList.add(locationBox.value === "" ? "invalid" : "valid");
        }
    },

    onDescriptionInput(event) {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            selectedImage.dataset.description = event.target.value;
        }
    },

    onPublicChange(event) {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            selectedImage.dataset.public = event.target.checked;
        }
    },

    onLocationChange() {
        ValidationService.validateLocationAndDate();
    },

    async onDateChange() {
        ValidationService.validateLocationAndDate();

        const selectedImage = document.querySelector(".gallery-image.selected");
        if (selectedImage) {
            await EventHandlers.updateSeasonalTags(selectedImage);
        }
    },

    async updateSeasonalTags(selectedImage) {
        const dateTime = selectedImage.dataset.dateTime;
        if (!dateTime) return;

        try {
            let existingTags = [];
            try {
                existingTags = JSON.parse(selectedImage.dataset.tags || '[]');
            } catch (error) {
                console.error('기존 태그 파싱 오류:', error);
            }

            const seasonTags = await tagManager.apiService.fetchSeasonTags(dateTime);
            const updatedTags = tagManager.handleSeasonChange(existingTags, seasonTags);

            UiHelpers.addTags(updatedTags);
            selectedImage.dataset.tags = JSON.stringify(updatedTags);
        } catch (error) {
            console.error('계절 태그 업데이트 중 오류:', error);
        }
    },

    async onImageUploadClick() {
        const currentlySelected = document.querySelector(".gallery-image.selected");
        if (currentlySelected) {
            UiHelpers.updateSelectedImageTags();
        }

        const imageWrappers = document.querySelectorAll(".image-wrapper");
        const uploadIndicator = ProcessingIndicator.showWithResult("이미지를 업로드하는 중입니다...", "upload");
        ProcessingIndicator.initializeProgress(uploadIndicator, imageWrappers.length);

        const sseHandler = new SSEHandler(imageWrappers.length, uploadIndicator);
        await EventHandlers.processImageUploads(imageWrappers, uploadIndicator, sseHandler);
    },

    async processImageUploads(imageWrappers, uploadIndicator, sseHandler) {
        let uploadedCount = 0;

        for (const imageWrapper of imageWrappers) {
            const img = imageWrapper.querySelector(".gallery-image");

            try {
                const url = await ApiService.requestPresignedPutUrl(img);
                await ApiService.uploadImageToS3(img, url);
                await ApiService.fetchImgMetaData(img);

                uploadedCount++;
                ProcessingIndicator.updateProgress(uploadIndicator, uploadedCount, imageWrappers.length);
            } catch (error) {
                sseHandler.addFailedImage(error.message);
                uploadedCount++;
                ProcessingIndicator.updateProgress(uploadIndicator, uploadedCount, imageWrappers.length);
                console.error("업로드 실패:", error);
            }
        }
    },

    onCloseButtonClick(event) {
        const imageWrapper = event.target.closest(".image-wrapper");
        if (!imageWrapper) return;

        const img = imageWrapper.querySelector(".gallery-image");

        if (img?.dataset.preview) {
            ObjectURLManager.revoke(img.dataset.preview);
        }

        if (img?.classList.contains("selected")) {
            this.clearDetailView();
            SideModalHelper.close();
        }
        
        imageWrapper.remove();
        ValidationService.updateUploadButtonState();
    },

    clearDetailView() {
        const imageSelectedBlock = SideModalHelper.getElement(".image-selected");
        const imageNotSelectedBlock = SideModalHelper.getElement(".image-not-selected");
        const description = SideModalHelper.getElement("#modalDescription");
        const locationBox = SideModalHelper.getElement("#modalLocationBox");
        const dateBox = SideModalHelper.getElement("#modalDateBox");
        const publicCheckbox = SideModalHelper.getElement("#modalPublic");

        if (imageSelectedBlock) imageSelectedBlock.style.display = "none";
        if (imageNotSelectedBlock) imageNotSelectedBlock.style.display = "flex";
        if (description) description.value = "";
        if (locationBox) locationBox.value = "";
        if (dateBox) dateBox.value = "";
        if (publicCheckbox) publicCheckbox.checked = false;
        UiHelpers.addTags([]);
    },

    onTagAddClick() {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        tagManager?.showTagInput();
    },

    onTagInputKeydown(event) {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        tagManager?.handleTagInputKeydown(event);
    },

    onTagInputBlur() {
        const tagManager = UiHelpers.getTagManager('.tag-box');
        tagManager?.hideTagInput();
    },

    // 이미지 선택 모달 핸들러들
    onBrowseBtnClick() {
        DOM.modalFileInput.click();
    },

    onModalFileInputChange(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            ImageSelectModal.addFilesToList(files);
        }
        event.target.value = '';
    },

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

    async onAddFilesBtnClick() {
        const files = ImageSelectModal.getSelectedFiles();
        if (files.length === 0) {
            NotificationHelper.showError('선택된 파일이 없습니다.');
            return;
        }

        ModalManager.hideImageSelectModal();

        const processingIndicator = ProcessingIndicator.show("이미지를 처리하는 중입니다...");
        ProcessingIndicator.initializeProgress(processingIndicator, files.length);

        try {
            const processedImages = [];
            let processedCount = 0;

            for (const file of files) {
                try {
                    const fileExtension = FileValidator.validate(file);
                    const parsedData = await ApiService.fetchLocation(file);
                    const imageData = ImageElementFactory.createImageData(file, fileExtension, parsedData);
                    processedImages.push(imageData);

                    processedCount++;
                    ProcessingIndicator.updateProgress(processingIndicator, processedCount, files.length);
                } catch (error) {
                    NotificationHelper.showError(`${file.name}: ${error.message}`);
                    processedCount++;
                    ProcessingIndicator.updateProgress(processingIndicator, processedCount, files.length);
                }
            }

            for (const imageData of processedImages) {
                const imageElement = ImageElementFactory.createImageElement(imageData);
                const wrapper = ImageElementFactory.createImageWrapper(imageElement, imageData.uuid);
                DOM.gallery.appendChild(wrapper);
            }
        } finally {
            ProcessingIndicator.hide(processingIndicator);
        }
    },

    onCancelBtnClick() {
        ModalManager.hideImageSelectModal();
    }
};

// ===== SSE 핸들러 =====
/**
 * Server-Sent Events를 통한 실시간 업로드 진행상황 처리 클래스
 * 업로드 완료 알림, 실패한 이미지 추적 등의 기능 제공
 */
class SSEHandler {
    constructor(totalImages, uploadIndicator) {
        this.totalImages = totalImages;
        this.uploadIndicator = uploadIndicator;
        this.processedImages = new Set();
        this.successImageUUIDs = [];
        this.failedImageUUIDs = [];
        this.eventSource = null;
        
        this.initializeSSE();
    }

    initializeSSE() {
        this.eventSource = new EventSource('/api/sse/connect', { withCredentials: true });
        
        this.eventSource.onopen = () => console.log('SSE 연결 성공');
        this.eventSource.onmessage = this.handleMessage.bind(this);
        this.eventSource.onerror = this.handleError.bind(this);
    }

    handleMessage(event) {
        if (!event.data.startsWith('data:')) return;

        try {
            const jsonData = event.data.substring(5);
            const data = JSON.parse(jsonData);

            if (data.type === 'SINGLE_IMAGE') {
                this.processedImages.add(data.batchId);
                this.successImageUUIDs.push(data.imageName);

                if (this.processedImages.size === this.totalImages) {
                    this.handleAllImagesProcessed();
                }
            }
        } catch (error) {
            console.error('SSE 메시지 파싱 오류:', error);
        }
    }

    handleError(event) {
        console.error('SSE 연결 오류:', event);
        this.eventSource.close();
    }

    addFailedImage(uuid) {
        this.failedImageUUIDs.push(uuid);
    }

    async handleAllImagesProcessed() {
        this.eventSource.close();

        const failedImages = this.failedImageUUIDs
            .map(uuid => document.querySelector(`[data-uuid="${uuid}"]`))
            .filter(img => img?.src)
            .map(img => ({ src: img.src }));

        ProcessingIndicator.showResult(this.uploadIndicator, 
            this.successImageUUIDs.length, 
            this.failedImageUUIDs.length, 
            failedImages, 
            {
                successMessage: `${this.successImageUUIDs.length}장의 이미지를 성공적으로 업로드했습니다.`,
                failedMessage: `${this.failedImageUUIDs.length}장의 이미지는 업로드에 실패했습니다.`
            }
        );

        if (this.failedImageUUIDs.length === 0) {
            localStorage.setItem('trackery_map_update_needed', Date.now().toString());
            NotificationHelper.showSuccess('이미지 업로드가 완료되었습니다. 지도가 업데이트됩니다.');

            setTimeout(() => {
                ProcessingIndicator.hide(this.uploadIndicator);
                window.location.reload();
            }, 5000);
        }
    }
}

// ===== 이미지 선택 모달 관리 =====
/**
 * 드래그 앤 드롭 이미지 선택 모달의 상태와 UI를 관리하는 클래스
 * 파일 목록 관리, UI 업데이트, 중복 파일 검사 등의 기능 제공
 */
const ImageSelectModal = {
    selectedFiles: [],

    addFilesToList(files) {
        const currentCount = this.selectedFiles.length;
        const newFilesCount = files.length;

        if (currentCount + newFilesCount > CONSTANTS.MAX_FILES) {
            NotificationHelper.showError(`최대 ${CONSTANTS.MAX_FILES}개의 파일만 선택할 수 있습니다.`);
            return;
        }

        const validFiles = [];
        for (const file of files) {
            try {
                FileValidator.validate(file);
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

        this.selectedFiles.push(...validFiles);
        this.updateUI();
    },

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateUI();
    },

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
                <button class="file-remove" data-index="${index}">&times;</button>
            `;

            const removeButton = fileItem.querySelector('.file-remove');
            removeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fileIndex = parseInt(e.target.dataset.index);
                this.removeFile(fileIndex);
            });

            fileGallery.appendChild(fileItem);
        });
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getSelectedFiles() {
        return [...this.selectedFiles];
    },

    clearFileList() {
        this.selectedFiles = [];
        this.updateUI();
    },

    resetModal() {
        this.clearFileList();
        DOM.dropzoneArea.style.display = 'block';
        DOM.selectedFiles.style.display = 'none';
        DOM.dropzoneArea.classList.remove('drag-over');
    }
};

// ===== 전체화면 이미지 토글 =====
/**
 * 이미지 전체화면 보기 토글 기능
 * 모달 내의 이미지를 전체화면 오버레이로 표시
 */
function toggleImageFullscreen() {
    const imageDetail = SideModalHelper.getElement('.image-container .image-detail');
    if (!imageDetail) return;

    let existingOverlay = document.querySelector('.fullSize-image-overlay');

    if (existingOverlay) {
        existingOverlay.remove();
    } else {
        const overlay = document.createElement('div');
        overlay.className = 'fullSize-image-overlay';

        const fullSizeImage = document.createElement('img');
        fullSizeImage.src = imageDetail.src;
        fullSizeImage.className = 'image-detail fullSize';
        fullSizeImage.alt = imageDetail.alt;

        overlay.addEventListener('click', () => overlay.remove());

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });

        overlay.appendChild(fullSizeImage);
        document.body.appendChild(overlay);
    }
}

// ===== SideModal 초기화 =====
/**
 * SideModal 인스턴스 생성 및 초기화
 * 상세 정보 입력을 위한 우측 사이드 모달 설정
 */
function initializeSideModal() {
    detailModal = new SideModal({
        showCloseButton: false,
        customClass: 'upload-detail-modal'
    });

    detailModal.init('#detailModal');

    // SideModal 이벤트 콜백 등록
    detailModal.on('onClose', () => {
        // 선택된 이미지 상태 초기화
        document.querySelectorAll(".gallery-image").forEach(img => img.classList.remove("selected"));
        
        // 모달 내부 상태 초기화
        const imageNotSelectedBlock = SideModalHelper.getElement(".image-not-selected");
        const imageSelectedBlock = SideModalHelper.getElement(".image-selected");
        if (imageNotSelectedBlock) imageNotSelectedBlock.style.display = "flex";
        if (imageSelectedBlock) imageSelectedBlock.style.display = "none";

        // 기타 모달 닫기
        document.querySelector('#mapPickerModal')?.classList.remove('show');
    });

    detailModal.on('onOpen', () => {
        console.log('업로드 페이지 사이드모달 열림');
    });

    setupModalEventListeners();
}

// ===== 모달 이벤트 리스너 설정 =====
/**
 * SideModal 내부 요소들에 이벤트 리스너 등록
 * 설명, 공개 설정, 위치/날짜 변경, 태그 관리 등
 */
function setupModalEventListeners() {
    if (!SideModalHelper.isAvailable()) return;

    // 모달 내부 요소들에 이벤트 리스너 등록
    const description = SideModalHelper.getElement('#modalDescription');
    const publicCheckbox = SideModalHelper.getElement('#modalPublic');
    const locationBox = SideModalHelper.getElement('#modalLocationBox');
    const dateBox = SideModalHelper.getElement('#modalDateBox');
    const tagAddButton = SideModalHelper.getElement('.tag-add');
    const tagInput = SideModalHelper.getElement('.tag-input');

    description?.addEventListener("input", EventHandlers.onDescriptionInput);
    publicCheckbox?.addEventListener("change", EventHandlers.onPublicChange);
    locationBox?.addEventListener("change", EventHandlers.onLocationChange);
    dateBox?.addEventListener("change", EventHandlers.onDateChange);
    tagAddButton?.addEventListener("click", EventHandlers.onTagAddClick);
    tagInput?.addEventListener("keydown", EventHandlers.onTagInputKeydown);
    tagInput?.addEventListener("blur", EventHandlers.onTagInputBlur);

    // 위치 편집 버튼
    SideModalHelper.getElement('#modalEditLocationBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#mapPickerModal')?.classList.add('show');
    });

    // 날짜 편집 버튼
    SideModalHelper.getElement('#modalEditDateBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.uploadPageFlatpickr?.open();
    });
}

// ===== 초기화 함수 =====
/**
 * 이미지 업로드 페이지 전체 초기화
 * SideModal 설정, DOM 요소 검증, 이벤트 리스너 등록 등
 */
function initialize() {
    console.log('이미지 업로드 페이지 초기화 시작');

    // DOM 요소 검증
    if (!DOM.validateRequiredElements()) {
        console.error('초기화 실패: 필수 DOM 엘리먼트가 누락되었습니다.');
        return;
    }

    // SideModal 초기화
    try {
        initializeSideModal();
        console.log('SideModal 초기화 성공');
    } catch (error) {
        console.error('SideModal 초기화 실패:', error);
        // SideModal 없이도 기본 기능은 사용 가능
        detailModal = null;
    }

    ValidationService.setupValidationListeners();

    // 데이트피커 설정
    const dateBox = SideModalHelper.getElement("#modalDateBox");
    if (dateBox) {
        window.uploadPageFlatpickr = flatpickr(dateBox, {
            dateFormat: "Y / m / d",
            maxDate: "today",
            locale: "ko",
            onClose: async function () {
                const selectedImage = document.querySelector(".gallery-image.selected");
                if (selectedImage && dateBox) {
                    selectedImage.dataset.dateTime = dateBox.value;

                    if (dateBox.classList.contains("invalid")) {
                        dateBox.classList.remove("invalid");
                        dateBox.classList.add("valid");
                    }

                    ValidationService.validateLocationAndDate();
                    await EventHandlers.updateSeasonalTags(selectedImage);
                }
            }
        });
    }

    // 이벤트 리스너 등록
    DOM.addImageButton?.addEventListener("click", EventHandlers.onAddImageClick);
    DOM.fileInput?.addEventListener("change", EventHandlers.onFileInputChange);
    DOM.imageUploadBtn?.addEventListener("click", EventHandlers.onImageUploadClick);
    
    document.addEventListener("click", EventHandlers.onGalleryImageClick);
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("close-button")) {
            EventHandlers.onCloseButtonClick(event);
        }
    });

    // 이미지 선택 모달 이벤트
    DOM.imageSelectModalOverlay?.addEventListener("click", ModalManager.hideImageSelectModal);
    DOM.imageSelectModalClose?.addEventListener("click", ModalManager.hideImageSelectModal);
    DOM.browseBtn?.addEventListener("click", EventHandlers.onBrowseBtnClick);
    DOM.modalFileInput?.addEventListener("change", EventHandlers.onModalFileInputChange);
    DOM.addFilesBtn?.addEventListener("click", EventHandlers.onAddFilesBtnClick);
    DOM.cancelBtn?.addEventListener("click", EventHandlers.onCancelBtnClick);

    if (DOM.dropzoneArea) {
        DOM.dropzoneArea.addEventListener("dragenter", EventHandlers.onModalDragEnter);
        DOM.dropzoneArea.addEventListener("dragover", EventHandlers.onModalDragOver);
        DOM.dropzoneArea.addEventListener("dragleave", EventHandlers.onModalDragLeave);
        DOM.dropzoneArea.addEventListener("drop", EventHandlers.onModalDrop);
        DOM.dropzoneArea.addEventListener("click", EventHandlers.onBrowseBtnClick);
    }

    // 이미지 전체화면 토글
    SideModalHelper.getElement('.image-container')?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleImageFullscreen();
    });

    // 이미지 선택 모달의 ESC 키 이벤트 (SideModal과 별도로 처리)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.imageSelectModal?.style.display === 'flex') {
            ModalManager.hideImageSelectModal();
        }
    });

    console.log('이미지 업로드 페이지 초기화 완료');
}

// ===== 이벤트 등록 =====
window.addEventListener('load', initialize);
window.addEventListener('beforeunload', () => ObjectURLManager.revokeAll());
