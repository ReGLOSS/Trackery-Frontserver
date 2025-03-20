import {togglePasswordVisibility, validatePassword, closeAndOpenElements, debounce} from "/module/landing/utils.js";
import {sendRequestVerificationEmail, authNumberVerification} from "/module/landing/email-verification.js";

//로그인 모달 닫기
document.getElementById("find-account-modal-close")
    .addEventListener("click", function () {
        document.getElementById("content-overlay").style.display = "flex";
        document.getElementById("find-account-modal-container").style.display = "none";
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

    authNumberVerification(pwdEmailCodeSendButton, authNumberVerifyButton, authNumberInput, emailInput, function() {
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
    togglePasswordVisibility(this.querySelector("img"), document.getElementById("newPasswordConfirm"), );
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
document.getElementById("return-to-login-btn").addEventListener("click", function () {
    const resultPage = document.getElementsByClassName("result-page")[0];
    const verifyEmail = document.getElementsByClassName("verify-email")[0];
    const findAccountModal = document.getElementsByClassName("find-account-modal-container")[0];
    const loginModal = document.getElementsByClassName("login-modal-container")[0];

    closeAndOpenElements(resultPage, verifyEmail, "block");
    closeAndOpenElements(findAccountModal, loginModal, "flex");
})