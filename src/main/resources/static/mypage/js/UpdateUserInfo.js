import { togglePasswordVisibility } from "/module/landing/utils.js"

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

    button.addEventListener("click", function(event) {
        event.preventDefault();
        togglePasswordVisibility(icon, passwordInput);
    });
}


