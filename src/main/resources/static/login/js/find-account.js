import {togglePasswordVisibility, validatePassword, closeAndOpenElements, debounce} from "/module/landing/utils.js";
import {sendRequestVerificationEmail, authNumberVerification} from "/module/landing/email-verification.js";

//로그인 모달 닫기
document.getElementById("find-account-modal-close")
    .addEventListener("click", function () {
        window.location.reload();
    });

//인증번호 전송
const pwdEmailCodeSendButton = document.getElementById("find-password-email-verification-code-send-btn");
const authNumberVerifyButton = document.getElementById("find-password-auth-number-verify-btn");

pwdEmailCodeSendButton.addEventListener("click", function () {
    const emailInput = document.getElementById("find-password-email");

    sendRequestVerificationEmail(pwdEmailCodeSendButton, authNumberVerifyButton, emailInput);
})

//인증번호 확인
authNumberVerifyButton.addEventListener("click", function () {
    const authNumberInput = document.getElementById("find-password-auth-number");
    const emailInput = document.getElementById("find-password-email");

    authNumberVerification(pwdEmailCodeSendButton, authNumberVerifyButton, authNumberInput, emailInput, function () {
        closeAndOpenElements(
            document.getElementsByClassName("verify-email")[0],
            document.getElementsByClassName("input-password")[0],
            "block"
        );
    })
})

document.getElementById("toggleNewPassword").addEventListener("click", function () {
    togglePasswordVisibility(this.querySelector("img"), document.getElementById("newPassword"));
})

document.getElementById("toggleNewPasswordConfirm").addEventListener("click", function () {
    togglePasswordVisibility(this.querySelector("img"), document.getElementById("newPasswordConfirm"),);
})

//비밀번호 확인
const newPasswordInput = document.getElementById("newPassword");
const newPasswordConfirmInput = document.getElementById("newPasswordConfirm");

const newPasswordInputGroup = document.querySelector("#newPassword").closest(".input-group.input-group-flat");
const newPasswordConfirmInputGroup = document.querySelector("#newPasswordConfirm").closest(".input-group.input-group-flat");

newPasswordInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordInputGroup, validatePassword(newPasswordInput.value))));
newPasswordConfirmInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordConfirmInputGroup, newPasswordInput.value === newPasswordConfirmInput.value && newPasswordConfirmInput.value !== "")));

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
    fetch("/api/users/me/password/email-token", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
            newPassword: newPasswordInput.value
        })
    })
        .then(response => {
            if (response.ok) {
                closeAndOpenElements(
                    document.getElementsByClassName("input-password")[0],
                    document.getElementsByClassName("result-page")[0],
                    "block"
                );
            } else {
                alert("오류가 발생했습니다. 잠시 후에 다시 시도해주십시오.")
            }
        })
        .catch(error => console.error(error));
})

//로그인 화면으로 돌아가기
const findAccountModal = document.getElementsByClassName("find-account-modal-container")[0];
const loginModal = document.getElementsByClassName("login-modal-container")[0];

document.getElementById("return-to-login-btn").addEventListener("click", function () {
    window.location.reload();
})

//유저명 찾기 이메일 발송
const findUserNameEmailPage = document.getElementsByClassName("find-user-name-email-input")[0];
const findUserNameResultPage = document.getElementsByClassName("find-user-name-result")[0];

const findUsernameEmailSendButton = document.getElementById("findUserNameEmailSendBtn");

function restoreFindUserNameEmailSendBtn(emailInput, button) {
    emailInput.readOnly = false;
    button.disabled = false;
    button.textContent = "이메일 발송";
}

findUsernameEmailSendButton.addEventListener("click", function () {
    const emailInput = document.getElementById("findUserNameEmail");
    const emailValue = emailInput.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(emailValue)) {
        emailInput.readOnly = true;
        findUsernameEmailSendButton.disabled = true;
        findUsernameEmailSendButton.textContent = "..";

        fetch("/api/mail/find-username", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                email: emailValue
            })
        }).then(response => {
            if (response.status === 404) {
                alert("이메일이 존재하지 않습니다.");
                restoreFindUserNameEmailSendBtn(emailInput, this);
                return;
            }
            if (!response.ok) {
                return response.json().then(data => {
                    alert(data.message);
                    restoreFindUserNameEmailSendBtn(emailInput, this);
                    throw new Error(data.message);
                });
            }
            restoreFindUserNameEmailSendBtn(emailInput, this);
            closeAndOpenElements(findUserNameEmailPage, findUserNameResultPage, "block");
        }).catch(error => console.error(error));
    } else {
        alert("이메일이 올바르지 않습니다.");
    }
})

const findUserNameReturnToLoginBtn = document.getElementById("findUserNameReturnToLoginBtn");

findUserNameReturnToLoginBtn.addEventListener("click", function () {
    window.location.reload();
})

