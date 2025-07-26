// 이미지 유효성 검증 및 UI 업데이트 관련 함수들
export const ValidationService = {
    // 위치 및 날짜 유효성 검증
    validateLocationAndDate() {
        const selectedImage = document.querySelector(".gallery-image.selected");
        if (!selectedImage) return;

        const locationBox = document.getElementById("locationBox");
        const dateBox = document.getElementById("dateBox");
        
        if (!locationBox || !dateBox) return;
        
        const hasLocationAndDate = locationBox.value.trim() !== "" && dateBox.value.trim() !== "";

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
        const imageUploadBtn = document.querySelector("#imageUploadBtn");
        
        if (!imageUploadBtn) return;

        // 이미지가 없는 경우 버튼 비활성화
        if (images.length === 0) {
            imageUploadBtn.disabled = true;
            return;
        }

        // 모든 이미지가 valid인지 확인
        const allValid = Array.from(images).every(image => image.classList.contains('valid'));

        // 모든 이미지가 valid일 때만 버튼 활성화
        imageUploadBtn.disabled = !allValid;
    },

    // 유효성 검증 리스너 설정
    setupValidationListeners() {
        const gallery = document.querySelector(".gallery");
        
        if (!gallery) return;
        
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
        observer.observe(gallery, {
            childList: true,
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });

        this.updateUploadButtonState();
    }
};