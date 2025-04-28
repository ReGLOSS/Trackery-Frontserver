import {parseExif} from "/upload/js/ExifParser.js";

document.addEventListener('DOMContentLoaded', function () {
    setupValidationListeners();

    const showDatepicker = document.getElementById('show-datepicker');
    const dateBox = document.getElementById('dateBox');

    const fp = flatpickr(dateBox, {
        dateFormat: "Y / m / d",
        maxDate: "today",
        locale: "ko",
        onClose: function () {
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage) {
                selectedImage.dataset.dateTime = document.querySelector('#dateBox').value;

                if (dateBox.classList.contains("invalid")) {
                    dateBox.classList.remove("invalid");
                    dateBox.classList.add("valid");
                }
            }
        }
    });

    showDatepicker.addEventListener('click', function (e) {
        e.preventDefault();
        fp.open();
    });
});

async function fetchLocation(file) {
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

    const formattedDateTime = formatDateFromExif(dateTime);

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
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                latitude,
                longitude
            })
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
}


function formatDateFromExif(dateTime) {
    if (!dateTime) return "";

    // 보통 EXIF 날짜 형식은: "YYYY:MM:DD HH:MM:SS"
    const [date] = dateTime.split(" ");
    const [year, month, day] = date.split(":");

    // month와 day는 앞자리 0을 제거해서 정수 처리
    return `${year} / ${parseInt(month)} / ${parseInt(day)}`;
}

// 이미지 input 연결
const fileInput = document.getElementById("imageInput");
const addImageButton = document.querySelector(".add-image");
const gallery = document.querySelector(".gallery");

addImageButton.addEventListener("click", () => {
    fileInput.click(); // 클릭 시 input 동작
});

fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // EXIF 파싱 + 위치 요청
    const parsedData = await fetchLocation(file);

    const {location = '', dateTime = ''} = parsedData;

    // 이미지 UI 추가
    const reader = new FileReader();
    reader.onload = function (e) {

        const result = e.target.result;
        if (typeof result !== "string") {
            console.warn("파일 읽기 결과가 문자열이 아님.")
            return;
        }

        const fileExtension = file.name.split(".").pop().toLowerCase();

        const img = document.createElement("img");
        img.src = result;
        img.classList.add("gallery-image");
        img.alt = "추가된 이미지";

        img.dataset.preview = result;
        img.dataset.location = location;
        img.dataset.dateTime = dateTime;
        img.dataset.description = "";
        img.dataset.public = "false";
        img.dataset.uuid = crypto.randomUUID();
        img.dataset.fileExtension = fileExtension;
        img.dataset.latitude = parsedData.latitude;
        img.dataset.longitude = parsedData.longitude;

        if (dateTime && location) {
            img.classList.add("valid")
        }

        if (!dateTime || !location) {
            img.classList.add("invalid")
        }

        gallery.appendChild(img);
    };
    reader.readAsDataURL(file);
});

const imageNotSelectedBlock = document.querySelector(".image-not-selected");
const imageSelectedBlock = document.querySelector(".image-selected");

document.addEventListener("click", function (event) {
    const target = event.target;
    if (!target.classList.contains("gallery-image")) return;

    const notSelectedImageDisplay = window.getComputedStyle(imageNotSelectedBlock).display;
    console.log(notSelectedImageDisplay);

    if (notSelectedImageDisplay === "flex") {
        imageNotSelectedBlock.style.display = "none";
        imageSelectedBlock.style.display = "flex";
    }

    document.querySelectorAll(".gallery-image").forEach(img => {
        img.classList.remove("selected");
    })

    target.classList.add("selected");

    document.querySelector('#mapPickerModal').classList.remove('show');
    resetVariations();

    const {preview, location, dateTime, description, tags, public: isPublic} = target.dataset;

    document.querySelector(".image-detail").src = preview;
    document.getElementById("description").value = description;
    document.getElementById("locationBox").value = location;
    document.getElementById("dateBox").value = dateTime;
    document.getElementById("public").checked = isPublic === "true";

    const dateBox = document.getElementById("dateBox");
    const locationBox = document.getElementById("locationBox");

    if (dateBox.value === "") {
        dateBox.classList.add("invalid");
    }

    if (locationBox.value === "") {
        locationBox.classList.add("invalid");
    }
})

document.getElementById("description").addEventListener("input", function (event) {
    const selectedImage = document.querySelector(".gallery-image.selected");

    if (selectedImage) {
        selectedImage.dataset.description = event.target.value;
    }
})

document.getElementById("public").addEventListener("change", function (event) {
    const selectedImage = document.querySelector(".gallery-image.selected");

    if (selectedImage) {
        selectedImage.dataset.public = event.target.checked;
    }
})

const imageUploadBtn = document.querySelector("#imageUploadBtn");

imageUploadBtn.addEventListener("click", function () {
    document.querySelectorAll(".gallery-image").forEach(img => {
        requestPresignedPutUrl(img).then(url => {
            console.log(url);
            uploadImageToS3(img, url)
                .then(() => {
                    fetchImgMetaData(img);
                });
        });
    });
});


function requestPresignedPutUrl(imageElement) {
    const fileName = imageElement.dataset.uuid + "." + imageElement.dataset.fileExtension;

    return fetch("/api/images/presigned-url/put?imageFileName=" + fileName, {
        method: "GET",
        credentials: "include"
    }).then(response => {
        if (response.status === 400) {
            return response.json().then(data => {
                console.log("PUT URL 가져오기 실패");
                return "";
            })
        }
        return response.json().then(data => {
            return data.data;
        });
    })
}

function uploadImageToS3(imageElement, url) {
    const binaryData = imageBase64ToBinaryData(imageElement.src);
    const contentType = extensionToMimeType(imageElement.dataset.fileExtension);

    return fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": contentType
        },
        body: binaryData
    }).then(response => {
        if (response.status !== 200) {
            console.log("%s S3 업로드 실패", imageElement.dataset.uuid);
            return Promise.reject("업로드 실패");
        }

        console.log("%s S3 업로드 성공", imageElement.dataset.uuid);
        return response;
    });
}

function imageBase64ToBinaryData(imgUrl) {
    const base64Data = imgUrl.split(',')[1];
    const binaryData = atob(base64Data);

    const arrayBuffer = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
    }
    return arrayBuffer;
}

function extensionToMimeType(extension) {
    let contentType;

    switch (extension) {
        case 'png':
            contentType = 'image/png';
            break;
        case 'gif':
            contentType = 'image/gif';
            break;
        case 'webp':
            contentType = 'image/webp';
            break;
        case 'jpg':
        case 'jpeg':
            contentType = 'image/jpeg';
            break;
        default:
            contentType = 'image/jpeg';
    }

    return contentType;
}

function fetchImgMetaData(imageElement) {
    const fileName = imageElement.dataset.uuid + "." + imageElement.dataset.fileExtension;

    fetch("/api/images", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            imageName: fileName,
            imageType: imageElement.dataset.fileExtension,
            description: imageElement.dataset.description,
            longitude: imageElement.dataset.longitude,
            latitude: imageElement.dataset.latitude,
            dateString: imageElement.dataset.dateTime,
            isPublic: imageElement.dataset.public
        })
    }).then(response => {
        if (response.status !== 200) {
            console.log("%s 이미지 메타데이터 저장 실패", fileName)
        } else {
            console.log("%s 이미지 메타데이터 저장 성공", fileName)
        }
    })
}

const locationBox = document.getElementById("locationBox");
const dateBox = document.getElementById("dateBox");

function validationLocationAndDate() {
    const selectedImage = document.querySelector(".gallery-image.selected");

    if (locationBox.value.trim() !== "" && dateBox.value.trim() !== "") {
        selectedImage.classList.remove("invalid");
        selectedImage.classList.add("valid");
    } else {
        selectedImage.classList.remove("valid");
        selectedImage.classList.add("invalid");
    }
}

locationBox.addEventListener("change", function () {
    validationLocationAndDate();
})

dateBox.addEventListener("change", function () {
    validationLocationAndDate();
})


// 업로드 버튼 상태 변경 부분
function updateUploadButtonState() {
    const images = document.querySelectorAll(".gallery-image");
    const uploadButton = document.getElementById("imageUploadBtn");

    // 이미지가 없는 경우 버튼 비활성화
    if (images.length === 0) {
        uploadButton.disabled = true;
        return;
    }

    // 모든 이미지가 valid인지 확인
    let allValid = true;

    for (const image of images) {
        // valid 클래스가 없거나, invalid 클래스가 있으면 유효하지 않음
        if (!image.classList.contains('valid')) {
            allValid = false;
            break;
        }
    }

    // 모든 이미지가 valid일 때만 버튼 활성화
    uploadButton.disabled = !allValid;
}

function setupValidationListeners() {
    const gallery = document.querySelector(".gallery");

    const observer = new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class' ||
                mutation.type === 'childList') {
                updateUploadButtonState();
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

    updateUploadButtonState();
}