import {togglePasswordVisibility} from "/module/landing/utils.js";

//로그인 모달 닫기
document.getElementById("find-account-modal-close")
    .addEventListener("click", function () {
        document.getElementById("content-overlay").style.display = "flex";
        document.getElementById("find-account-modal-container").style.display = "none";
    });

//인증번호 전송
const pwdEmailCodeSendButton = document.getElementById("find-password-email-verification-code-send-btn");

pwdEmailCodeSendButton.addEventListener("click", function () {
    const emailInput = document.getElementById("find-password-email").value;

    buttonDisableToggle(pwdEmailCodeSendButton, true);
    pwdEmailCodeSendButton.textContent = "잠시만 기다려주십시오";

    if (emailInput) {
        fetch('/api/mail/request-verify/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailInput
            })
        })
            .then(response => {
                if (response.ok) {
                    emailInput.readOnly = true;
                    startCountdown(pwdEmailCodeSendButton);
                } else {
                    return response.json().then(data => {
                        buttonDisableToggle(pwdEmailCodeSendButton, false);
                        pwdEmailCodeSendButton.textContent = "인증 번호 발송";
                        alert(data.message);
                    });
                }
            })
            .catch(error => console.error(error));
    } else {
        buttonDisableToggle(pwdEmailCodeSendButton, false);
        pwdEmailCodeSendButton.textContent = "인증 번호 발송";
        alert('이메일을 입력해주십시오.');
    }
})

function startCountdown(button) {
    let timeLeft = 180;

    const timer = setInterval(function () {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        button.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        timeLeft -= 1;

        if (timeLeft < 0) {
            clearInterval(timer);
            buttonDisableToggle(button, false);
            button.textContent = '인증 번호 발송';
        }
    }, 1000);
}

//인증번호 확인
const authNumberVerifyButton = document.getElementById("find-password-auth-number-verify-btn");

authNumberVerifyButton.addEventListener("click", function () {
    const authNumberInput = document.getElementById("find-password-auth-number").value;
    const emailInput = document.getElementById("find-password-email").value;

    if (authNumberInput) {
        buttonDisableToggle(authNumberVerifyButton, true);
        authNumberVerifyButton.textContent = "잠시만 기다려주십시오";

        fetch('/api/mail/verify/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailInput,
                authNumber: authNumberInput
            })
        })
            .then(response => {
                if (response.ok) {
                    emailInput.readOnly = true;
                    document.getElementsByClassName("verify-email")[0].style.display = "none";
                    document.getElementsByClassName("input-password")[0].style.display = "block";
                } else {
                    return response.json().then(data => {
                        buttonDisableToggle(authNumberVerifyButton, false);
                        authNumberVerifyButton.textContent = "인증 번호 확인";
                        alert(data.message);
                    });
                }
            })
            .catch(error => console.error(error));
    } else {
        alert("인증번호를 입력해주십시오.");
    }
})

//버튼 비활성 토글
function buttonDisableToggle(button, boolean) {
    if (boolean) {
        button.classList.add("disabled", boolean);
    } else {
        button.classList.remove("disabled");
    }
}

document.getElementById("toggleNewPassword").addEventListener("click", function () {
    togglePasswordVisibility(this.querySelector("img"), document.getElementById("newPassword"));
})

document.getElementById("toggleNewPasswordConfirm").addEventListener("click", function () {
    togglePasswordVisibility(this.querySelector("img"), document.getElementById("newPasswordConfirm"), );
})

//비밀번호 확인
const newPasswordInput = document.getElementById("newPassword");
const newPasswordConfirmInput = document.getElementById("newPasswordConfirm");

const newPasswordInputGroup = document.querySelector("#newPassword").closest(".input-group.input-group-flat");
const newPasswordConfirmInputGroup = document.querySelector("#newPasswordConfirm").closest(".input-group.input-group-flat");

function debounce(callback, delay = 500) {
    let debounceTimer;
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => callback(...args), delay);
    };
}

newPasswordInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordInputGroup, validatePassword(newPasswordInput.value))));
newPasswordConfirmInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordConfirmInputGroup, newPasswordInput.value === newPasswordConfirmInput.value && newPasswordConfirmInput.value !== "")));

function validatePassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])^\S{16,}$/.test(password);
}

function toggleValidationClass(input, isValid) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
    checkRequiredFields();
}

const requiredInputsGroups = [newPasswordConfirmInputGroup, newPasswordInputGroup];

function checkRequiredFields() {
    const allValid = requiredInputsGroups.every(inputGroup => inputGroup.classList.contains("is-valid"));
    submitNewPasswordButton.disabled = !allValid;
}

//비밀번호 업데이트 쿼리 전송
const submitNewPasswordButton = document.getElementById("submit-new-password-btn");

submitNewPasswordButton.addEventListener("click", function () {
    fetch("/api/users/password-reset", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
            password: newPasswordInput.value
        })
    })
        .then(response => {
            if (response.ok) {
                document.getElementsByClassName("input-password")[0].style.display = "none";
                document.getElementsByClassName("result-page")[0].style.display = "block";
            } else if (response.status === 400) {
                alert("비밀번호 변경 절차를 처음부터 다시 진행해주시기 바랍니다.");
            } else {
                alert("잠시 후에 다시 시도해주십시오.")
            }
        })
        .catch(error => console.error(error));
})

//로그인 화면으로 돌아가기
document.getElementById("return-to-login-btn").addEventListener("click", function () {
    document.getElementsByClassName("result-page")[0].style.display = "none";
    document.getElementsByClassName("verify-email")[0].style.display = "block";
    document.getElementsByClassName("find-account-modal-container")[0].style.display = "none";
    document.getElementsByClassName("login-modal-container")[0].style.display = "flex";
})