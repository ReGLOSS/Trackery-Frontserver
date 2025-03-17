import {togglePasswordVisibility, closeAndOpenElements, startCountdown, validatePassword, debounce} from "/module/landing/utils.js";

const emailInput = document.getElementById("email");
const usernameInput = document.getElementById("username");
const nicknameInput = document.getElementById("nickname");
const registerPasswordInput = document.getElementById("password");
const registerPasswordConfirmInput = document.getElementById("password-confirm");
const saveButton = document.getElementById("save-btn");
const usernameVerifyButton = document.getElementById("username-verify-btn");

document.getElementById("register-modal-close").addEventListener("click", function () {
    closeAndOpenElements(
        document.getElementById("register-modal-container"),
        document.getElementById("content-overlay"),
        "flex"
    );
})

// 변경 사항 저장 버튼
saveButton.addEventListener("click", function () {
    fetch("/api/users/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            email: emailInput.value,
            userName: usernameInput.value,
            nickname: nicknameInput.value,
            password: registerPasswordInput.value
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    alert(data.message);
                    throw new Error(data.message);
                })
            }
            return response.json();
        })
        .then(data => {
            alert("회원가입이 성공적으로 완료되었습니다!");
            window.location.replace("/register/temporal-main")
        });
});

//유저명 중복확인 버튼
usernameVerifyButton.addEventListener("click", function () {
    fetch("/api/users/exists/username?value=" + encodeURIComponent(usernameInput.value), {
        method: "GET",
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    alert(data.message);
                })
            }
            return response.json();
        })
        .then(data => {
            if (data.data === true) {
                usernameInput.disabled = true;
                usernameVerifyButton.textContent = "확인 완료";
                usernameVerifyButton.classList.add("is-valid");
                usernameVerifyButton.disabled = false;
            } else {
                toggleValidationClass(usernameInput, false)
            }
        })
});

registerPasswordInput.addEventListener("input", debounce(() => applyValidationClass(registerPasswordInput, validatePassword(registerPasswordInput.value))));
registerPasswordConfirmInput.addEventListener("input", debounce(() => checkPasswordMatch(registerPasswordInput, registerPasswordConfirmInput)));
usernameInput.addEventListener("input", debounce(() => applyUsernameValidationClass(usernameInput, validateUsername(usernameInput.value))));
nicknameInput.addEventListener("input", debounce(() => applyValidationClass(nicknameInput, validateNickname(nicknameInput.value))));
emailInput.addEventListener("input", debounce(() => applyValidationClass(emailInput, validateEmail(emailInput.value))));

function applyValidationClass(input, isValid) {
    toggleValidationClass(input, isValid);
    checkRequiredFields();
}

function applyUsernameValidationClass(input, isValid) {
    toggleValidationClass(input, isValid);
    toggleButtonState(usernameVerifyButton, isValid);
}

function toggleValidationClass(input, isValid) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
}

function toggleButtonState(button, isValid) {
    button.disabled = !isValid; // `disabled` 속성 추가/제거
    button.classList.toggle("disabled", !isValid); // `disabled` 클래스 추가/제거
}

function validateUsername(username) {
    return /^\w{4,15}$/.test(username);
}

function validateNickname(nickname) {
    return nickname.trim() !== "";
}

function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

function checkPasswordMatch(origPassword, confirmPassword) {
    applyValidationClass(confirmPassword, origPassword.value === confirmPassword.value && confirmPassword.value !== "");
}

const requiredInputs = [emailInput, usernameInput, registerPasswordInput, registerPasswordConfirmInput, usernameVerifyButton];

function checkRequiredFields() {
    const allValid = requiredInputs.every(input => input.classList.contains("is-valid"));
    toggleButtonState(saveButton, allValid);
}
