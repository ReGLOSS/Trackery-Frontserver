/**
 * 페이지 새로고침 없이 사이드바 사용자 프로필 정보를 새로 고칩니다.
 * 최신 사용자 데이터를 가져와 사이드바 요소를 업데이트합니다.
 */
export async function refreshSidebarProfile() {
    try {
        const response = await fetch("/api/users/details", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const userProfile = data.data;

        // 프로필 이미지 업데이트
        const profileImg = document.querySelector('.sidebar .user-avatar');
        if (profileImg && userProfile.userProfile) {
            profileImg.src = userProfile.userProfile;
        }

        // 닉네임 업데이트
        const nicknameElement = document.querySelector('.sidebar .user-info .fw-bold.text-white');
        if (nicknameElement && userProfile.nickname) {
            nicknameElement.textContent = userProfile.nickname;
        }

        // 사용자 이름 업데이트
        const usernameElement = document.querySelector('.sidebar .user-info .fw-bold.text-muted');
        if (usernameElement && userProfile.userName) {
            usernameElement.textContent = '@' + userProfile.userName;
        }

        console.log('Sidebar profile refreshed successfully');
        return true;
    } catch (error) {
        console.error('Failed to refresh sidebar profile:', error);
        return false;
    }
}

/**
 * 특정 사이드바 프로필 필드를 업데이트합니다.
 * @param {string} field - 업데이트할 필드 ('nickname', 'userName', 'userProfile')
 * @param {string} value - 새로운 값
 */
export function updateSidebarField(field, value) {
    switch (field) {
        case 'nickname':
            const nicknameElement = document.querySelector('.sidebar .user-info .fw-bold.text-white');
            if (nicknameElement) {
                nicknameElement.textContent = value;
            }
            break;
        case 'userName':
            const usernameElement = document.querySelector('.sidebar .user-info .fw-bold.text-muted');
            if (usernameElement) {
                usernameElement.textContent = '@' + value;
            }
            break;
        case 'userProfile':
            const profileImg = document.querySelector('.sidebar .user-avatar');
            if (profileImg) {
                profileImg.src = value || '/images/profile.jpg';
            }
            break;
        default:
            console.warn('Unknown field:', field);
    }
}
