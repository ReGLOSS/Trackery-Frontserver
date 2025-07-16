// 홈 페이지와 업로드 페이지 모두 지원하도록 동적으로 선택
const mapPickerModal = document.querySelector('#mapPickerModal') || document.querySelector('#modalMapPickerModal');
const modalToggleButton = document.querySelector('#editLocationBtn') || document.querySelector('#modalEditLocationBtn');
const mapPickSubmitBtn = mapPickerModal?.querySelector('#mapPickSubmitBtn');
const cancelMapPickBtn = mapPickerModal?.querySelector('#cancelMapPickBtn');
const resultForm = mapPickerModal?.querySelector('#mapPickResultForm');

// 업로드 페이지용 기본 이벤트 리스너 (modalEditLocationBtn이 아닌 경우에만)
if (modalToggleButton && modalToggleButton.id === 'editLocationBtn') {
    modalToggleButton.addEventListener('click', () => {
        if (mapPickerModal && !mapPickerModal.classList.contains('show')) {
            mapPickerModal.classList.toggle('show');

            window.scrollTo({
                top: document.querySelector('.detail-container')?.scrollHeight || 0,
                behavior: 'smooth'
            });

            window.dispatchEvent(new Event('resize'));
            
            // 선택된 이미지의 기존 좌표가 있으면 지도에 표시
            const selectedImage = document.querySelector('.gallery-image.selected');
            if (selectedImage && selectedImage.dataset.latitude && selectedImage.dataset.longitude) {
                const latitude = parseFloat(selectedImage.dataset.latitude);
                const longitude = parseFloat(selectedImage.dataset.longitude);
                const location = selectedImage.dataset.location || "현재 위치";
                
                console.log('Showing existing location on map:', {latitude, longitude, location});
                
                // 지도가 완전히 로드된 후 좌표 표시
                setTimeout(() => {
                    showLocationOnMap(longitude, latitude, location);
                }, 500);
            }
        }
    });
}

let currentMarker = null;
let utmkcoor = null;

// 지도 인스턴스 동적 찾기 (modalMapPickerModal 내부의 지도 또는 기본 map)
function getMapInstance() {
    if (mapPickerModal && mapPickerModal.id === 'modalMapPickerModal') {
        // 홈 페이지의 modalMapPickerModal 내부의 지도 찾기
        const mapElement = mapPickerModal.querySelector('#map');
        if (mapElement && window.sop) {
            // 이미 생성된 지도가 있는지 확인
            if (!window.modalMap) {
                window.modalMap = sop.map(mapElement, {
                    zoomSliderControl: false,
                    measureControl: false,
                    attributionControl: false
                });
                window.modalMap.setView(sop.utmk(953820, 1953437), 9);
            }
            return window.modalMap;
        }
    }
    // 기본 map 인스턴스 반환 (업로드 페이지)
    return window.map;
}

// 지도 클릭 이벤트는 지도 인스턴스가 초기화된 후에 바인딩
function bindMapClickEvent() {
    const mapInstance = getMapInstance();
    if (mapInstance && !mapInstance._mapClickEventBound) {
        mapInstance.on("click", function (e) {
            setTimeout(function () {
                let x_coor = e.utmk.x;
                let y_coor = e.utmk.y;
                utmkcoor = {x: x_coor, y: y_coor};
                console.log(" 지도클릭 좌표 x :" + utmkcoor.x + " , y :" + utmkcoor.y);

                if (currentMarker) {
                    mapInstance.removeLayer(currentMarker);
                }

                let marker = sop.marker(utmkcoor);
                marker.addTo(mapInstance);

                fetchLocationName(utmkcoor);

                currentMarker = marker;

            }, 200);
        });
        mapInstance._mapClickEventBound = true;
    }
}

// 홈 페이지의 modalEditLocationBtn은 map.js에서 처리됩니다.
// bindMapClickEvent 함수를 전역으로 노출 (map.js에서 사용)
window.bindMapClickEvent = bindMapClickEvent;

// 기존 map 변수가 있는 경우 (업로드 페이지) 즉시 바인딩
if (typeof map !== 'undefined' && !map._mapClickEventBound) {
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
    map._mapClickEventBound = true;
}

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

    // 변환 실행 - proj4 result[0] = longitude, result[1] = latitude
    const result = proj4(utmk, wgs84, [x, y]);

    console.log('UTMK to WGS84 conversion:');
    console.log('Input UTMK:', {x, y});
    console.log('Output WGS84 array:', result);
    console.log('Parsed as longitude:', result[0], 'latitude:', result[1]);

    return {
        longitude: result[0],  // result[0] is longitude (East-West, 124-132 for Korea)
        latitude: result[1]    // result[1] is latitude (North-South, 33-43 for Korea)
    }
}

function convertWGS84toUTMK(longitude, latitude) {
    const proj4 = window.proj4;
    if (!proj4) {
        console.error("좌표 변환 라이브러리 로드 안 됨.")
        return;
    }

    // WGS84 좌표계 정의 (EPSG:4326)
    const wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
    // UTM-K 좌표계 정의 (EPSG:5179)
    const utmk = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";

    // 변환 실행 - proj4 result[0] = x, result[1] = y
    const result = proj4(wgs84, utmk, [longitude, latitude]);

    console.log('WGS84 to UTMK conversion:');
    console.log('Input WGS84:', {longitude, latitude});
    console.log('Output UTMK array:', result);
    console.log('Parsed as x:', result[0], 'y:', result[1]);

    return {
        x: result[0],  // result[0] is x (UTMK x coordinate)
        y: result[1]   // result[1] is y (UTMK y coordinate)
    }
}

let foundLocationData = {longitude: 0, latitude: 0, locationName: "", tags: []}

// 전역 변수로 내보내기 (map.js에서 사용)
window.foundLocationData = foundLocationData;

function fetchLocationName(utmkcoor) {
    const utmk = utmkcoor;
    const wgs84 = convertUTMKtoWGS84(utmk.x, utmk.y);

    console.log('=== FETCH LOCATION NAME DEBUG ===');
    console.log('UTMK coordinates:', utmk);
    console.log('Converted WGS84:', wgs84);
    console.log('Sending to API - longitude:', wgs84.longitude, 'latitude:', wgs84.latitude);
    console.log('Korean territory check:');
    console.log('  Latitude (33-43):', wgs84.latitude >= 33 && wgs84.latitude <= 43);
    console.log('  Latitude (124-132):', wgs84.longitude >= 124 && wgs84.longitude <= 132);

    if (resultForm) {
        resultForm.classList.remove("valid", "invalid");
        resultForm.value = "잠시만 기다려주세요..";
    }
    if (mapPickSubmitBtn) {
        mapPickSubmitBtn.disabled = true;
    }

    // 선택된 이미지의 날짜 정보 사용 (없으면 현재 날짜 사용)
    let dateToUse = '';
    const selectedImage = document.querySelector(".gallery-image.selected");
    if (selectedImage && selectedImage.dataset.dateTime) {
        dateToUse = selectedImage.dataset.dateTime;
    } else {
        const now = new Date();
        dateToUse = `${now.getFullYear()} / ${now.getMonth() + 1} / ${now.getDate()}`;
    }

    // 위치 정보만 요청 (계절태그는 유지)
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
    }).then(async (locationResponse) => {
        const locationData = await locationResponse.json();

        console.log('Location API Response status:', locationResponse.status);
        console.log('Location API Response data:', locationData);
        
        if (locationResponse.status === 404) {
            if (resultForm) {
                resultForm.value = "위치를 찾을 수 없습니다. 다른 곳으로 시도해주세요.";
                toggleValidationClass(resultForm, false);
            }
            return;
        }
        if (locationResponse.status === 200) {
            const { sdName, sggName, regionalTags } = locationData.data;
            const displayLocationName = `${sdName} ${sggName}`.trim();

            if (resultForm) {
                resultForm.value = displayLocationName;
                toggleValidationClass(resultForm, true);
            }
            if (mapPickSubmitBtn) {
                mapPickSubmitBtn.disabled = false;
            }

            // 기존 계절태그 유지: 현재 선택된 이미지의 태그에서 계절태그 추출
            let existingSeasonTags = [];
            const selectedImage = document.querySelector(".gallery-image.selected");
            if (selectedImage && selectedImage.dataset.tags) {
                try {
                    const existingTags = JSON.parse(selectedImage.dataset.tags);
                    existingSeasonTags = existingTags.filter(tag => 
                        tag.tagName && (
                            tag.tagName.includes('봄') || tag.tagName.includes('여름') || 
                            tag.tagName.includes('가을') || tag.tagName.includes('겨울')
                        )
                    );
                } catch (e) {
                    console.log('기존 태그 파싱 실패:', e);
                }
            }

            // 위치태그만 새로 구성: sdName, sggName을 최우선으로 추가
            let locationTags = [];
            if (sdName) locationTags.push({ tagName: sdName, tagId: 'sdName' });
            if (sggName) locationTags.push({ tagName: sggName, tagId: 'sggName' });

            if (regionalTags && Array.isArray(regionalTags)) {
                locationTags = [...locationTags, ...regionalTags];
            }

            // 기존 계절태그 + 새로운 위치태그 결합
            const combinedTags = [...existingSeasonTags, ...locationTags];

            foundLocationData = {
                longitude: wgs84.longitude,
                latitude: wgs84.latitude,
                locationName: displayLocationName,
                tags: combinedTags
            };
            window.foundLocationData = foundLocationData;
            console.log('Final foundLocationData (계절태그 유지):', foundLocationData);
        } else {
            console.error('API Error - Status:', locationResponse.status, 'Data:', locationData);
            alert(locationData.message);
        }
        console.log('=== END FETCH LOCATION NAME DEBUG ===');
    }).catch(error => {
        console.error('Fetch error:', error);
        if (resultForm) {
            resultForm.value = "네트워크 오류가 발생했습니다.";
            toggleValidationClass(resultForm, false);
        }
    });
}

function toggleValidationClass(element, isValid) {
    element.classList.remove("valid", "invalid");

    if (isValid === true) {
        element.classList.add("valid");
    } else if (isValid === false) {
        element.classList.add("invalid");
    }
}

mapPickSubmitBtn?.addEventListener('click', function () {
    const selectedImage = document.querySelector('.selected');
    const locationBox = document.querySelector('#locationBox');
    
    // 선택된 이미지가 있는 경우에만 업데이트
    if (selectedImage) {
        selectedImage.dataset.longitude = foundLocationData.longitude;
        selectedImage.dataset.latitude = foundLocationData.latitude;
        selectedImage.dataset.location = foundLocationData.locationName;
        selectedImage.dataset.tags = JSON.stringify(foundLocationData.tags);
    }
    
    if (locationBox) {
        locationBox.value = foundLocationData.locationName;
        
        if (locationBox.classList.contains('invalid')) {
            locationBox.classList.remove('invalid');
            locationBox.classList.add('valid');
        }
    }
    
    // 지역 태그 업데이트
    if (window.UiHelpers && foundLocationData.tags) {
        window.UiHelpers.addTags(foundLocationData.tags);
    }
    
    mapPickerModal.classList.remove('show');
    resetVariations();
});

cancelMapPickBtn?.addEventListener('click', function () {
    mapPickerModal.classList.remove('show');
    resetVariations();
});

// 기존 좌표를 지도 중심으로 설정하고 마커 표시하는 함수
function showLocationOnMap(longitude, latitude, locationName) {
    console.log('=== SHOWING LOCATION ON MAP ===');
    console.log('Input coordinates:', {longitude, latitude, locationName});
    
    if (!longitude || !latitude) {
        console.error('Invalid coordinates provided');
        return;
    }
    
    const mapInstance = getMapInstance();
    if (!mapInstance) {
        console.error('Map instance not found');
        return;
    }
    
    // WGS84 좌표를 UTMK로 변환
    const utmkCoords = convertWGS84toUTMK(longitude, latitude);
    console.log('Converted to UTMK:', utmkCoords);
    
    if (!utmkCoords) {
        console.error('Failed to convert coordinates');
        return;
    }
    
    // 기존 마커 제거
    if (currentMarker) {
        mapInstance.removeLayer(currentMarker);
    }
    
    // 지도 중심을 해당 좌표로 이동
    const utmkPoint = sop.utmk(utmkCoords.x, utmkCoords.y);
    mapInstance.setView(utmkPoint, 15); // 확대 레벨 15로 설정
    
    // 마커 생성 및 표시
    currentMarker = sop.marker(utmkCoords);
    currentMarker.addTo(mapInstance);
    
    // 결과 폼에 위치 이름 표시
    if (resultForm) {
        resultForm.value = locationName || "현재 위치";
        toggleValidationClass(resultForm, true);
    }
    
    // 버튼 활성화
    if (mapPickSubmitBtn) {
        mapPickSubmitBtn.disabled = false;
    }
    
    // foundLocationData 업데이트
    foundLocationData = {
        longitude: longitude,
        latitude: latitude,
        locationName: locationName || "현재 위치",
        tags: []
    };
    window.foundLocationData = foundLocationData;
    
    console.log('Map centered and marker placed successfully');
    console.log('=== END SHOWING LOCATION ON MAP ===');
}

// 전역으로 노출 (다른 스크립트에서 사용 가능)
window.showLocationOnMap = showLocationOnMap;

function resetVariations() {
    const mapInstance = getMapInstance();
    if (currentMarker && mapInstance) {
        mapInstance.removeLayer(currentMarker);
    }
    if (mapInstance) {
        mapInstance.setView(sop.utmk(953820, 1953437), 7);
    }
    currentMarker = null;
    utmkcoor = null;
    foundLocationData = {longitude: 0, latitude: 0, sdName: "", sggName: "", locationName: "", tags: []}
    window.foundLocationData = foundLocationData;
    if (resultForm) {
        resultForm.value = "";
        resultForm.classList.remove("valid", "invalid");
    }
    if (mapPickSubmitBtn) {
        mapPickSubmitBtn.disabled = true;
    }
}
