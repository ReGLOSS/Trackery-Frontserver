export function parseExif(file) {
    return new Promise((resolve, reject) => {
        EXIF.getData(file, function () {
            try {
                const lat = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lng = EXIF.getTag(this, "GPSLongitude");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
                const dateTime = EXIF.getTag(this, "DateTimeOriginal");

                if (lat && lng && latRef && lngRef && dateTime) {
                    const latitude = convertDMSToDD(lat, latRef);
                    const longitude = convertDMSToDD(lng, lngRef);

                    resolve({
                        latitude,
                        longitude,
                        dateTime
                    });
                } else {
                    resolve(null); // 값이 없을 경우 null 반환
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