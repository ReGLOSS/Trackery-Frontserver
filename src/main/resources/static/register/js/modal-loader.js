document.addEventListener("DOMContentLoaded", function () {
    // 회원가입 모달 가져오기
    fetch("/register/modal-html")
        .then(response => response.text())
        .then(html => {
            document.getElementById("register-modal-container").innerHTML = html;
            loadModalScript();
        })
        .catch(error => console.error("회원가입 모달을 불러오는 중 오류 발생:", error));

    // 로그인 모달 가져오기
    fetch("/login/login-modal-html")
        .then(response => response.text())
        .then(html => {
            document.getElementById("login-modal-container").innerHTML = html;
            loadLoginModalScript();
        })
        .catch(error => console.error("로그인 모달을 불러오는 중 오류 발생:", error));

    // 계정 찾기 모달 가져오기
    fetch("/login/find-account-modal-html")
        .then(response => response.text())
        .then(html => {
            document.getElementById("find-account-modal-container").innerHTML = html;
        })
        .catch(error => console.error("계정 찾기 모달을 불로오는 중 오류 발생: ", error));
});


function openModal() {
    document.getElementById("register-modal-container").style.display = "flex";
}

function openLoginModal() {
    document.getElementById("login-modal-container").style.display = "flex";
}

function loadModalScript() {
    const script = document.createElement("script");
    script.src = "/register/js/input-form.js";
    script.onload = () => {
        initModalFunctions();
    }
    document.body.appendChild(script);
}

function loadLoginModalScript() {
    console.log("스크립트 로딩중");
    const script = document.createElement("script");
    script.src = "/login/js/login.js";
    script.onload = () => {
        initModalScript();
    }
    document.body.appendChild(script);
}


