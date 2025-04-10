import {debounce, togglePasswordVisibility, validatePassword} from "/module/landing/utils.js"

//모달 닫기 버튼
document.getElementsByClassName("update-user-info-modal-close")[0]
    .addEventListener("click", function () {
        document.getElementsByClassName("update-user-info-modal-container")[0]
            .style.display = "none";
    });

//비밀번호 보기 토글
const togglePasswordVisibilityBtns = document.getElementsByClassName("toggle-password-btn");

for (let i = 0; i < togglePasswordVisibilityBtns.length; i++) {
    const button = togglePasswordVisibilityBtns[i];
    const container = button.closest(".input-group");
    const passwordInput = container.querySelector(".form-control");
    const icon = button.querySelector('img');

    button.addEventListener("click", function (event) {
        event.preventDefault();
        togglePasswordVisibility(icon, passwordInput);
    });
}

document.getElementById("updatePasswordSubmitBtn").addEventListener("click", function () {
    fetch("/api/users/me/password", {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "oldPassword": document.getElementById("presentPasswordInputForm").value,
            "newPassword": document.getElementById("updateNewPasswordInputForm").value
        })
    }).then(response => {
        if (response.status === 200) {
            alert("비밀번호가 변경되었습니다.");
            document.getElementsByClassName("update-password-block")[0].style.display = "none";
        } else {
            response.json().then(data => {
                alert(data.message);
            })
        }
    })
})
const presentPasswordInputForm = document.getElementById("presentPasswordInputForm");
const updateNewPasswordInputForm = document.getElementById("updateNewPasswordInputForm");
const updateNewPasswordConfirmInputForm = document.getElementById("updateNewPasswordConfirmInputForm");
const updatePasswordSubmitBtn = document.getElementById("updatePasswordSubmitBtn");

presentPasswordInputForm
    .addEventListener("input", debounce(
            () => applyValidationClass(presentPasswordInputForm.closest(".input-group"), presentPasswordInputForm.value.length > 0
            )));

updateNewPasswordInputForm
    .addEventListener("input", debounce(
        () => applyValidationClass(updateNewPasswordInputForm.closest(".input-group"), validatePassword(updateNewPasswordInputForm.value)
        )));

updateNewPasswordConfirmInputForm
    .addEventListener("input", debounce(
        () => applyValidationClass(updateNewPasswordConfirmInputForm.closest(".input-group"), updateNewPasswordConfirmInputForm.value === updateNewPasswordInputForm.value
        )));


function applyValidationClass(input, isValid) {
    toggleValidationClass(input, isValid);
    checkRequiredFields();
}

function toggleValidationClass(input, isValid) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
}

const requiredInputs = [presentPasswordInputForm.closest(".input-group"), updateNewPasswordInputForm.closest(".input-group"), updateNewPasswordConfirmInputForm.closest(".input-group")];

function checkRequiredFields() {
    const allValid = requiredInputs.every(input => input.classList.contains("is-valid"));
    updatePasswordSubmitBtn.disabled = !allValid;
}




