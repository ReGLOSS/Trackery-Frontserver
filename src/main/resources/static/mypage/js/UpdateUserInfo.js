import {debounce, togglePasswordVisibility, validatePassword} from "/module/landing/utils.js"
import {sendRequestVerificationEmail, authNumberVerification} from "/module/landing/email-verification.js"

//모달 닫기 버튼
document.getElementsByClassName("update-user-info-modal-close")[0]
    .addEventListener("click", function () {
        const modal =  document.getElementsByClassName("update-user-info-modal-container")[0];
        const modalContent = modal.getElementsByClassName("modal-content")[0];

        modalContent.style.transform = "translateX(100%)";

        modalContent.addEventListener("transitionend", function handler() {
            modal.classList.remove("active");
            localStorage.removeItem("updateUserInfoModal");
            modalContent.style.transform = "";
            modalContent.removeEventListener("transitionend", handler);
        })
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
            location.reload();
        } else {
            response.json().then(data => {
                alert(data.message);
            })
        }
    })
})
//유저명 변경 인풋 디바운스 관련
const updateUserNameInputForm = document.getElementById("updateUserNameInputForm");
const updateUserNameVerifyBtn = document.getElementById("updateUserNameVerifyBtn");

const updateUserNameRequiredInputs = [updateUserNameInputForm];

const updateUserNameSubmitBtn = document.getElementById("updateUserNameSubmitBtn");

//유저명 디바운스, 조건에 일치하고 사용중인 유저명과 다르면 중복 확인 버튼 열리게
updateUserNameInputForm.addEventListener("input", debounce(
    () => applyValidationClass(updateUserNameInputForm,
        /^\w{4,15}$/.test(updateUserNameInputForm.value) && updateUserNameInputForm.value !== document.getElementById("presentUserNameInputForm").value,
        updateUserNameRequiredInputs,
        updateUserNameVerifyBtn
    )
))

//사용 가능하면 수정 불가능하게 막고 유저명 수정 버튼 활성화
updateUserNameVerifyBtn.addEventListener("click", function () {
    fetch("/api/users/exists/username?value=" + encodeURIComponent(updateUserNameInputForm.value), {
        method: "GET",
        credentials: "include"
    }).then(response => {
        if (!response.ok) {
            response.json().then(data => {
                alert(data.message);
            })
        }
        return response.json();
    }).then(data => {
        if (data.data === true) {
            updateUserNameInputForm.disabled = true;
            updateUserNameVerifyBtn.textContent = "사용 가능";
            updateUserNameVerifyBtn.disabled = true;
            updateUserNameSubmitBtn.disabled = false;
        }
    })
})

updateUserNameSubmitBtn.addEventListener("click", function () {
    fetch("/api/users/me/username", {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "userName": updateUserNameInputForm.value
        })
    }).then(response => {
        if (!response.ok) {
            response.json().then(data => {
                alert(data.message);
            })
        } else {
            alert("유저명이 변경되었습니다.");
            location.reload();
        }
    })
})


//닉네임 변경 인풋 디바운스 관련
const updateNicknameInputForm = document.getElementById("updateNicknameInputForm");
const updateNicknameSubmitBtn = document.getElementById("updateNicknameSubmitBtn");

updateNicknameInputForm.addEventListener("input", debounce(
        () => applyValidationClass(updateNicknameInputForm,
            (updateNicknameInputForm.value.trim() !== "" && updateNicknameInputForm.value !== document.getElementById("presentNicknameInputForm").value),
            updateNicknameRequiredInputs,
            updateNicknameSubmitBtn
        )
    )
);

const updateNicknameRequiredInputs = [updateNicknameInputForm];

updateNicknameSubmitBtn.addEventListener("click", function () {
    console.log(updateNicknameInputForm.value);
    fetch("/api/users/me/nickname",
        {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "nickname": updateNicknameInputForm.value
            })
        })
        .then(response => {
            response.json().then(data => {
                if (response.status === 200) {
                    alert("닉네임이 변경되었습니다.");
                    location.reload();
                } else {
                    alert(data?.message);
                }
            })
        })
})


//비밀번호 변경 인풋 디바운스 관련
const presentPasswordInputForm = document.getElementById("presentPasswordInputForm");
const updateNewPasswordInputForm = document.getElementById("updateNewPasswordInputForm");
const updateNewPasswordConfirmInputForm = document.getElementById("updateNewPasswordConfirmInputForm");
const updatePasswordSubmitBtn = document.getElementById("updatePasswordSubmitBtn");

presentPasswordInputForm
    .addEventListener("input", debounce(
            () => applyValidationClass(presentPasswordInputForm.closest(".input-group"),
                presentPasswordInputForm.value.length > 0,
                updatePasswordRequiredInputs,
                updatePasswordSubmitBtn
            )
        )
    );

updateNewPasswordInputForm
    .addEventListener("input", debounce(
            () => applyValidationClass(
                updateNewPasswordInputForm.closest(".input-group"),
                validatePassword(updateNewPasswordInputForm.value),
                updatePasswordRequiredInputs,
                updatePasswordSubmitBtn)
        )
    );

updateNewPasswordConfirmInputForm
    .addEventListener("input", debounce(
            () => applyValidationClass(
                updateNewPasswordConfirmInputForm.closest(".input-group"),
                updateNewPasswordConfirmInputForm.value === updateNewPasswordInputForm.value,
                updatePasswordRequiredInputs,
                updatePasswordSubmitBtn)
        )
    );


function applyValidationClass(input, isValid, requiredInputs, button) {
    toggleValidationClass(input, isValid);
    checkRequiredFields(requiredInputs, button);
}

function toggleValidationClass(input, isValid) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
}

const updatePasswordRequiredInputs = [presentPasswordInputForm.closest(".input-group"), updateNewPasswordInputForm.closest(".input-group"), updateNewPasswordConfirmInputForm.closest(".input-group")];

function checkRequiredFields(requiredInputs, button) {
    const allValid = requiredInputs.every(input => input.classList.contains("is-valid"));
    button.disabled = !allValid;
}

document.getElementById("editPasswordBtn").addEventListener("click", function () {
    toggleBlock(document.getElementsByClassName("update-password-block")[0]);
})

document.getElementById("editUsernameBtn").addEventListener("click", function () {
    toggleBlock(document.getElementsByClassName("update-username-block")[0]);
})

document.getElementById("editNicknameBtn").addEventListener("click", function () {
    toggleBlock(document.getElementsByClassName("update-nickname-block")[0]);
})

document.getElementById("editEmailBtn").addEventListener("click", function () {
    toggleBlock(document.getElementsByClassName("update-email-block")[0]);
})

function toggleBlock(blockElement) {
    const currentDisplay = window.getComputedStyle(blockElement).display;

    if (currentDisplay === "none") {
        blockElement.style.display = "flex";
    } else {
        blockElement.style.display = "none";
    }
}

const updateEmailInputForm = document.getElementById("updateEmailInputForm");
const emailAuthNumberInputForm = document.getElementById("emailAuthNumberInputForm");

const requestEmailVerificationBtn = document.getElementById("requestEmailVerificationBtn");
const verifyAuthNumberBtn = document.getElementById("verifyEmailAuthNumberBtn");

const updateEmailSubmitBtn = document.getElementById("updateEmailSubmitBtn");

updateEmailInputForm.addEventListener("input", debounce(
    () => {
        requestEmailVerificationBtn.disabled = !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateEmailInputForm.value) && updateEmailInputForm.value !== document.getElementById("presentEmailInputForm").value);
    }
))

requestEmailVerificationBtn.addEventListener("click", function () {
    sendRequestVerificationEmail(requestEmailVerificationBtn, verifyAuthNumberBtn, updateEmailInputForm);
})

verifyAuthNumberBtn.addEventListener("click", function () {
    authNumberVerification(
        requestEmailVerificationBtn,
        verifyAuthNumberBtn, emailAuthNumberInputForm,
        updateEmailInputForm,
        function () {
            updateEmailInputForm.readOnly = true;
            requestEmailVerificationBtn.disabled = true;
            verifyAuthNumberBtn.disabled = true;
            updateEmailSubmitBtn.disabled = false;
        });
})

updateEmailSubmitBtn.addEventListener("click", function () {
    fetch("/api/users/me/email", {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({})
    }).then(response => {
        response.json().then(data => {
            if (response.status === 200) {
                console.log("이메일 변경 확인.");
                alert("이메일이 변경되었습니다.");
                location.reload();
            } else {
                alert(data?.message);
            }
        })
    })
})






