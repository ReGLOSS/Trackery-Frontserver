import {parseExif} from "/upload/js/ExifParser.js";

async function fetchLocation(file) {
    const exif = await parseExif(file);

    if (!exif) {
        console.warn("EXIF 위치, 날짜 정보 없음");
        return;
    }

    const { latitude, longitude, dateTime } = exif;

    const formattedDateTime = formatDateFromExif(dateTime);

    if(latitude == null || longitude == null) {
        const dateTime = formatDateFromExif(dateTime);
        console.warn("위치 정보 없음, 날짜 정보 있음");
        console.warn("날짜 정보 : ", dateTime);
        return {dateTime : formattedDateTime};
    }

    try {
        const response = await fetch("/api/location/name", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include", // ← 중요!
            body: JSON.stringify({
                latitude,
                longitude
            })
        });

        const data = await response.json();
        const location = data.data;

        return {location, dateTime : formattedDateTime};
    } catch (err) {
        console.error("위치 정보 요청 실패:", err);
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

    const {location, dateTime} = parsedData;

    // 이미지 UI 추가
    const reader = new FileReader();
    reader.onload = function (e) {

        const result = e.target.result;
        if (typeof result !== "string") {
            console.warn("파일 읽기 결과가 문자열이 아님.")
            return;
        }

        const img = document.createElement("img");
        img.src = result;
        img.classList.add("gallery-image");
        img.alt = "추가된 이미지";

        img.dataset.preview = result;
        img.dataset.location = location;
        img.dataset.dateTime = dateTime;
        img.dataset.description = "";
        img.dataset.public = "false";

        gallery.appendChild(img);
    };
    reader.readAsDataURL(file);
});

document.addEventListener("click", function (event) {
    const target = event.target;
    if(!target.classList.contains("gallery-image")) return;

    const {preview, location, dateTime, description, tags, public:isPublic} = target.dataset;

    document.querySelector(".image-detail").src = preview;
    document.getElementById("description").value = description;
    document.getElementById("locationBox").value = location;
    document.getElementById("dateBox").value = dateTime;
    document.getElementById("public").checked = isPublic;
})



