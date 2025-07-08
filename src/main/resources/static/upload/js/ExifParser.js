export function parseExif(file) {
    return new Promise((resolve, reject) => {
        EXIF.getData(file, function () {
            try {
                const lat = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lng = EXIF.getTag(this, "GPSLongitude");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
                const dateTime = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime");

                // GPS 정보가 모두 있는 경우
                if (lat && lng && latRef && lngRef) {
                    const latitude = convertDMSToDD(lat, latRef);
                    const longitude = convertDMSToDD(lng, lngRef);

                    resolve({
                        latitude,
                        longitude,
                        dateTime: dateTime || null
                    });
                }
                // GPS 정보는 없지만 촬영 날짜가 있는 경우
                else if (dateTime) {
                    resolve({
                        latitude: null,
                        longitude: null,
                        dateTime
                    });
                }
                // 아무 정보도 없는 경우
                else {
                    resolve(null);
                }
            } catch (err) {
                reject(err);
            }
        });
    });
}

function convertDMSToDD(dms, ref) {
    const [degrees, minutes, seconds] = dms;
    let dd = degrees + minutes / 60 + seconds / 3600;
    return ref === "S" || ref === "W" ? -dd : dd;
}