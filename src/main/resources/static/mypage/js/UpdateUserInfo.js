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
//유저명 변경 인풋 디바운스 관련


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
                    document.getElementsByClassName("update-nickname-block")[0].style.display = "none";
                    document.getElementById("presentNicknameInputForm").value = updateNicknameInputForm.value;
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

function toggleBlock(blockElement) {
    if (blockElement.style.display === "none") {
        blockElement.style.display = "flex";
    } else {
        blockElement.style.display = "none";
    }
}




