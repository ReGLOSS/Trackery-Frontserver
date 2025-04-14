export async function loadModal(htmlUrl, element, scriptUrl) {
    try {
        const response = await fetch(htmlUrl);
        if (!response.ok) {
            throw new Error(`Html 로드하는 중 오류 발생 ${htmlUrl}`);
        }
        element.innerHTML = await response.text();

        await loadScript(scriptUrl);
    } catch (error) {
        console.error(`모달을 로드하는 중 오류 발생: ${htmlUrl}`, error);
    }
}

export async function loadScript(scriptUrl) {
    try {
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.type = "module";
        script.async = true;
        script.onload = () => console.log(`${scriptUrl} 로딩 완료`);
        document.body.appendChild(script);
    } catch (error) {
        console.error(`JS를 로드하는 중 오류 발생: ${scriptUrl}`, error);
    }
}