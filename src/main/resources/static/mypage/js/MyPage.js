import {loadModal} from "../../module/modal/modalUtil.js";

document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadModal("/mypage/update-user-info-modal", document.getElementsByClassName("update-user-info-modal-container")[0], "/mypage/js/updateUserInfo.js");
    } catch (error) {
        console.error("모달 로딩 중 오류 발생:", error)
    }

    await fetchUserDetail();
})

async function fetchUserDetail() {
    fetch("/api/users/details", {
        method: "GET",
        credentials: "include"
    })
        .then(response => response.json())
        .then(data => {
            const userData = data.data;
            console.log("유저 정보 : {}", data);
            document.getElementById("userName").textContent = "@" + userData.userName;
            document.getElementById("nickname").textContent = userData.nickname;
            document.getElementById("presentUserNameInputForm").value = userData.userName;
            document.getElementById("presentNicknameInputForm").value = userData.nickname;
            document.getElementById("presentEmailInputForm").value = userData.email;

            // 프로필 이미지 설정 (마이페이지 메인)
            const profileImageElement = document.querySelector(".profile-image");
            if (profileImageElement) {
                if (userData.profileImageUrl) {
                    profileImageElement.src = userData.profileImageUrl;
                } else {
                    profileImageElement.src = "/images/profile.jpg";
                }
            }

            // 프로필 이미지 설정 (모달)
            const updateProfileImageElement = document.getElementById("updateProfileImage");
            if (updateProfileImageElement) {
                if (userData.profileImageUrl) {
                    updateProfileImageElement.src = userData.profileImageUrl;
                } else {
                    updateProfileImageElement.src = "/images/profile.jpg";
                }
            }

            const activatedOAuthProviders = userData.OAuthList.map(oauth => oauth.provider.toLowerCase());

            activatedOAuthProviders.forEach(provider => {
                const iconElement = document.getElementById(`${provider}-login`);
                if (iconElement) {
                    iconElement.classList.add("active");
                }
            })

            document.querySelector(".base-container").style.visibility = "visible";
        }).catch(error => {
        console.error("유저 정보 가져오기 실패: ", error)
    })
}

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("updateUserInfoModal") === "true") {
        document.getElementsByClassName("update-user-info-modal-container")[0]
            .classList.add("active");
    }

    document.getElementById("update-user-info-btn")
        .addEventListener("click", function () {
            document.getElementsByClassName("update-user-info-modal-container")[0]
                .classList.add("active");
            localStorage.setItem("updateUserInfoModal", "true");
        })

    document.getElementById("logout-btn")
        .addEventListener("click", handleLogout);
})

async function handleLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    
    try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "로그아웃 중...";
        
        const response = await fetch("/api/users/logout", {
            method: "POST",
            credentials: "include"
        });
        
        if (response.ok) {
            localStorage.clear();
            sessionStorage.clear();
            
            // 사이드바 정보 즉시 초기화
            const profileImg = document.querySelector('.sidebar .user-avatar');
            const nicknameElement = document.querySelector('.sidebar .user-info .fw-bold.text-white');
            const usernameElement = document.querySelector('.sidebar .user-info .fw-bold.text-muted');
            
            if (profileImg) profileImg.src = '/images/profile.jpg';
            if (nicknameElement) nicknameElement.textContent = '유저명';
            if (usernameElement) usernameElement.textContent = '@USER';
            
            window.location.href = "/";
        } else if (response.status === 401) {
            localStorage.clear();
            sessionStorage.clear();
            
            // 사이드바 정보 즉시 초기화
            const profileImg = document.querySelector('.sidebar .user-avatar');
            const nicknameElement = document.querySelector('.sidebar .user-info .fw-bold.text-white');
            const usernameElement = document.querySelector('.sidebar .user-info .fw-bold.text-muted');
            
            if (profileImg) profileImg.src = '/images/profile.jpg';
            if (nicknameElement) nicknameElement.textContent = '유저명';
            if (usernameElement) usernameElement.textContent = '@USER';
            
            window.location.href = "/";
        } else {
            throw new Error(`로그아웃 실패: ${response.status}`);
        }
    } catch (error) {
        console.error("로그아웃 중 오류 발생:", error);
        alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "로그아웃";
    }
}
