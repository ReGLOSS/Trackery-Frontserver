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
            const userData = data.data;
            console.log("유저 정보 : {}",data);
            document.getElementById("userName").textContent = "@" + userData.userName;
            document.getElementById("nickname").textContent = userData.nickname;
            document.getElementById("presentUserNameInputForm").value = userData.userName;
            document.getElementById("presentNicknameInputForm").value = userData.nickname;
            document.getElementById("presentEmailInputForm").value = userData.email;

            const activatedOAuthProviders = userData.OAuthList.map(oauth => oauth.provider.toLowerCase());

            activatedOAuthProviders.forEach(provider => {
                const iconElement = document.getElementById(`${provider}-login`);
                if(iconElement) {
                    iconElement.classList.add("active");
                }
            })
        }).catch(error => {
            console.error("유저 정보 가져오기 실패: ", error)
    })

    document.getElementById("update-user-info-btn")
        .addEventListener("click", function() {
            document.getElementsByClassName("update-user-info-modal-container")[0]
                .style.display = "flex";
        })
})