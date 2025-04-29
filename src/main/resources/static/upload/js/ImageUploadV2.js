import {parseExif} from "/upload/js/ExifParser.js";

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
    reloadUploadPageBtn: document.querySelector("#reloadUploadPageBtn"),
    confirmBtn: document.querySelector("#confirmBtn"),
    whileUploadingModal: document.querySelector('.while-uploading-modal'),
    uploadingBlock: document.querySelector('#uploadingBlock'),
    resultInfoBlock: document.querySelector('#resultInfoBlock'),
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
            const response = await fetch("/api/location/name", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({latitude, longitude})
            });

            const data = await response.json();
            const location = data.data;

            return {
                location,
                dateTime: formattedDateTime,
                latitude,
                longitude
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
                    isPublic: imageElement.dataset.public
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

        if (DOM.locationBox.value.trim() !== "" && DOM.dateBox.value.trim() !== "") {
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
                if (mutation.type === 'attributes' && mutation.attributeName === 'class' ||
                    mutation.type === 'childList') {
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
            ImageProcessor.extensionToMimeType(fileExtension)
        } catch (error) {
            alert(error.message);
            return;
        }

        // EXIF 파싱 + 위치 요청
        const parsedData = await ApiService.fetchLocation(file);
        const {location = '', dateTime = ''} = parsedData;

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

        if (dateTime && location) {
            img.classList.add("valid");
        }

        if (!dateTime || !location) {
            img.classList.add("invalid");
        }

        DOM.gallery.appendChild(img);
    },

    // 갤러리 이미지 클릭 핸들러
    onGalleryImageClick(event) {
        const target = event.target;
        if (!target.classList.contains("gallery-image")) return;

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
        resetVariations();

        const {preview, location, dateTime, description, tags, public: isPublic} = target.dataset;

        document.querySelector(".image-detail").src = preview;
        DOM.description.value = description;
        DOM.locationBox.value = location;
        DOM.dateBox.value = dateTime;
        DOM.publicCheckbox.checked = isPublic === "true";

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
    onDateChange() {
        ValidationService.validateLocationAndDate();
    },

    // 이미지 업로드 버튼 클릭 핸들러
    async onImageUploadClick() {
        DOM.whileUploadingModal.style.display = "flex";
        const images = document.querySelectorAll(".gallery-image");

        const successImageUUIDs = [];
        const failedImageUUIDs = [];

        for (const img of images) {
            try {
                const url = await ApiService.requestPresignedPutUrl(img);
                await ApiService.uploadImageToS3(img, url);
                await ApiService.fetchImgMetaData(img);

                successImageUUIDs.push(img.dataset.uuid);
            } catch (error) {
                failedImageUUIDs.push(error.message);
            }
        }

        await indicateResult(successImageUUIDs, failedImageUUIDs);

        await console.log("성공한 이미지 : {}", successImageUUIDs);
        await console.log("실패한 이미지 : {}", failedImageUUIDs);

        await addFailedImage(failedImageUUIDs);

        await new Promise(resolve => setTimeout(resolve, 1000));

        await hideUploadingBlockAndShowResultBlock();
    },

    async onReloadPageBtnClick() {
        window.location.reload();
    },

    async onConfirmBtnClick() {
        window.location.href = "/upload/success";
    },
};

async function hideUploadingBlockAndShowResultBlock() {
    DOM.uploadingBlock.style.display = "none";
    DOM.resultInfoBlock.style.display = "flex";
}

async function addFailedImage(failedImageUUIDs = []) {

    if (failedImageUUIDs.length === 0) {
        DOM.failedUploadInfoGroup.style.display = "none";
        return;
    }

    failedImageUUIDs.forEach(uuid => {
        const failedImage = document.querySelector(`.gallery-image[data-uuid="${uuid}"]`);
        if (failedImage) {
            const img = document.createElement("img")
            img.src = failedImage.src;
            img.classList.add("uploading-modal-gallery-image");
            img.alt = "업로드 실패한 이미지";

            DOM.modalGallery.appendChild(img);
        }
    })
}

async function indicateResult(successImageUUIDs = [], failedImageUUIDs = []) {
    DOM.uploadedImageCount.textContent = successImageUUIDs.length + "장의 이미지를 성공적으로 업로드했습니다.";
    DOM.uploadFailedImageCount.textContent = failedImageUUIDs.length + "장의 이미지는 업로드에 실패했습니다.";
}

// 초기화 함수
function initialize() {
    // 유효성 검증 리스너 설정
    ValidationService.setupValidationListeners();

    // 데이트피커 설정
    const fp = flatpickr(DOM.dateBox, {
        dateFormat: "Y / m / d",
        maxDate: "today",
        locale: "ko",
        onClose: function () {
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage) {
                selectedImage.dataset.dateTime = DOM.dateBox.value;

                if (DOM.dateBox.classList.contains("invalid")) {
                    DOM.dateBox.classList.remove("invalid");
                    DOM.dateBox.classList.add("valid");
                }

                ValidationService.validateLocationAndDate();
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
    DOM.description.addEventListener("input", EventHandlers.onDescriptionInput);
    DOM.publicCheckbox.addEventListener("change", EventHandlers.onPublicChange);
    DOM.locationBox.addEventListener("change", EventHandlers.onLocationChange);
    DOM.dateBox.addEventListener("change", EventHandlers.onDateChange);
    DOM.imageUploadBtn.addEventListener("click", EventHandlers.onImageUploadClick);
    DOM.reloadUploadPageBtn.addEventListener("click", EventHandlers.onReloadPageBtnClick);
    DOM.confirmBtn.addEventListener("click", EventHandlers.onConfirmBtnClick);
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', initialize);
