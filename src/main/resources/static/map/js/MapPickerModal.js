const mapPickerModal = document.querySelector('#mapPickerModal');
const modalToggleButton = document.querySelector('#editLocationBtn');
const mapPickSubmitBtn = document.querySelector('#mapPickSubmitBtn');
const cancelMapPickBtn = document.querySelector('#cancelMapPickBtn');
const resultForm = document.querySelector('#mapPickResultForm');

modalToggleButton.addEventListener('click', () => {
    if (mapPickerModal.classList.contains('show') !== true) {
        mapPickerModal.classList.toggle('show');

        window.scrollTo({
            top: document.querySelector('.detail-container').scrollHeight,
            behavior: 'smooth'
        });

        window.dispatchEvent(new Event('resize'));
    }
});

let currentMarker = null;
let utmkcoor = null;

map.on("click", function (e) {
    setTimeout(function () {
        let x_coor = e.utmk.x;
        let y_coor = e.utmk.y;
        utmkcoor = {x: x_coor, y: y_coor};
        console.log(" 지도클릭 좌표 x :" + utmkcoor.x + " , y :" + utmkcoor.y);

        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        let marker = sop.marker(utmkcoor);
        marker.addTo(map);

        fetchLocationName(utmkcoor);

        currentMarker = marker;

    }, 200);
});

function convertUTMKtoWGS84(x, y) {
    const proj4 = window.proj4;
    if (!proj4) {
        console.error("좌표 변환 라이브러리 로드 안 됨.")
        return;
    }

    // UTM-K 좌표계 정의 (EPSG:5179)
    const utmk = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";
    // WGS84 좌표계 정의 (EPSG:4326)
    const wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

    // 변환 실행
    const result = proj4(utmk, wgs84, [x, y]);

    return {
        longitude: result[0],
        latitude: result[1]
    }
}

let foundLocationData = {longitude: 0, latitude: 0, locationName: ""}

function fetchLocationName(utmkcoor) {
    const utmk = utmkcoor;
    const wgs84 = convertUTMKtoWGS84(utmk.x, utmk.y);

    resultForm.classList.remove("valid", "invalid");
    mapPickSubmitBtn.disabled = true;
    resultForm.value = "잠시만 기다려주세요..";

    fetch("/api/location/name", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            longitude: wgs84.longitude,
            latitude: wgs84.latitude
        })
    }).then(response => {
        response.json().then(data => {
            if (response.status === 404) {
                resultForm.value = "위치를 찾을 수 없습니다. 다른 곳으로 시도해주세요.";
                toggleValidationClass(resultForm, false);
                return;
            }
            if (response.status === 200) {
                resultForm.value = data.data;
                toggleValidationClass(resultForm, true);
                mapPickSubmitBtn.disabled = false;
                foundLocationData = {longitude: wgs84.longitude, latitude: wgs84.latitude, locationName: data.data};
            } else {
                alert(data.message);
                console.error(data.message);
            }
        })
    })
}

function toggleValidationClass(element, isValid) {
    element.classList.remove("valid", "invalid");

    if (isValid === true) {
        element.classList.add("valid");
    } else if (isValid === false) {
        element.classList.add("invalid");
    }
}

mapPickSubmitBtn.addEventListener('click', function () {
    const selectedImage = document.querySelector('.selected');
    selectedImage.dataset.longitude = foundLocationData.longitude;
    selectedImage.dataset.latitude = foundLocationData.latitude;
    selectedImage.dataset.location = foundLocationData.locationName;
    document.querySelector('#locationBox').value = foundLocationData.locationName;
    mapPickerModal.classList.remove('show');
    resetVariations();
});

cancelMapPickBtn.addEventListener('click', function () {
    mapPickerModal.classList.remove('show');
    resetVariations();
});

function resetVariations() {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    map.setView(sop.utmk(953820, 1953437), 7);
    currentMarker = null;
    utmkcoor = null;
    foundLocationData = {longitude: 0, latitude: 0, locationName: ""}
    resultForm.value = "";
    resultForm.classList.remove("valid", "invalid");
    mapPickSubmitBtn.disabled = true;
}

