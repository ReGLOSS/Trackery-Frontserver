import {loadModal} from "/module/modal/ModalUtil.js";

document.addEventListener("DOMContentLoaded", async function() {
    try {
        await loadModal("/mypage/update-user-info-modal", document.getElementsByClassName("update-user-info-modal-container")[0], "/mypage/js/UpdateUserInfo.js");
    } catch (error) {
        console.error("모달 로딩 중 오류 발생:", error)
    }
})

document.addEventListener("DOMContentLoaded", function () {
    fetch("/api/users/details", {
        method: "GET",
        credentials: "include"
    })
        .then(response => response.json())
        .then(data => {
            console.log("유저 정보 : {}",data);
            document.getElementById("username").textContent = "@" + data.data.userName;
            document.getElementById("nickname").textContent = data.data.nickname;
        })
})