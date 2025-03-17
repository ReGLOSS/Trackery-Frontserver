document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadModal("/register/modal-html", "register-modal-container", "/register/js/input-form.js");
        await loadModal("/login/login-modal-html", "login-modal-container", "/login/js/login.js");
        await loadModal("/login/find-account-modal-html", "find-account-modal-container", "/login/js/find-account.js");
        await loadScript("/module/landing/utils.js");
    } catch (error) {
        console.error("모달 로딩 중 오류 발생:", error);
    }
});

async function loadModal(htmlUrl, containerId, scriptUrl) {
    try {
        const response = await fetch(htmlUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${htmlUrl}`);
        document.getElementById(containerId).innerHTML = await response.text();

        await loadScript(scriptUrl);
    } catch (error) {
        console.error(`모달을 로드하는 중 오류 발생: ${htmlUrl}`, error);
    }
}

async function loadScript(scriptUrl) {
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