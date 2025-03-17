import {closeAndOpenElements, togglePasswordVisibility} from "/module/landing/utils.js";

const userNameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");

//로그인 폼 제출
document.getElementById("submit")
    .addEventListener("click", function () {
        console.log("username : %s password : %s", userNameInput.value, passwordInput.value)
        fetch("/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                userName: userNameInput.value,
                password: passwordInput.value
            })
        }).then(response => {
            if (response.status === 401) {
                return response.json().then(data => {
                    alert(data.message);
                    throw new Error(data.message);
                })
            } else if (response.status === 500) {
                alert("현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주십시오.");
                throw new Error();
            } else {
                return response.json();
            }
        }).then(data => {
            window.location.replace("/register/temporal-main");
        });
    });

//비밀번호 숨기기 토글
document.getElementById("togglePassword")
    .addEventListener("click", function () {
        const icon = document.getElementById("loginPasswordIcon");
        togglePasswordVisibility(icon, passwordInput)
    });

//회원가입 모달 오픈
document.getElementById("register-guide")
    .addEventListener("click", function () {
        closeAndOpenElements("login-modal-container", "register--modal-container", "flex");
        }
    );

//계정 찾기 모달 오픈
document.getElementById("find-account-guide")
    .addEventListener("click", function () {
        closeAndOpenElements("login-modal-container", "find-account-modal-container", "flex");
    })

//로그인 모달 닫기
document.getElementById("login-modal-close")
    .addEventListener("click", function () {
        closeAndOpenElements("login-modal-container", "content-overlay", "flex");
    });

//로그인 모달 오픈
document.getElementById("startButton")
    .addEventListener("click", function () {
        closeAndOpenElements("content-overlay", "login-modal-container", "flex");
    });