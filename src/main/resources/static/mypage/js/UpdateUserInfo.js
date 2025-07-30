import {debounce, togglePasswordVisibility, validatePassword} from "/module/landing/utils.js"
import {sendRequestVerificationEmail, authNumberVerification} from "/module/landing/email-verification.js"
import {refreshSidebarProfile, updateSidebarField} from "/common/js/sidebar-utils.js"

// 프로필 이미지 업로드 기능
const profileImageBlock = document.querySelector('.profile-image-block');
const profileImageInput = document.getElementById('profileImageInput');
const updateProfileImage = document.getElementById('updateProfileImage');

// 프로필 이미지 섹션 클릭 시 파일 선택 창 열기
profileImageBlock.addEventListener('click', function() {
    profileImageInput.click();
});

// 파일 선택 시 미리보기 처리
profileImageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // 파일 유효성 검사
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }
        
        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하로 업로드해주세요.');
            return;
        }
        
        // 기존 blob URL 해제 (메모리 누수 방지)
        if (updateProfileImage.src.startsWith('blob:')) {
            URL.revokeObjectURL(updateProfileImage.src);
        }
        
        // blob URL로 미리보기 이미지 표시
        const blobUrl = URL.createObjectURL(file);
        updateProfileImage.src = blobUrl;
        
        // presigned URL을 통한 업로드 시작
        uploadImageWithPresignedUrl(file);
    }
});

// UUID 생성 함수
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// presigned URL 요청 함수
async function fetchPresignedPutUrl(filename) {
    try {
        console.log('=== Presigned URL 요청 시작 ===');
        console.log('요청 파일명:', filename);
        
        const response = await fetch("/api/images/presigned-url/put?imageFileName=" + filename, {
            method: "GET",
            credentials: "include"
        });
        
        console.log('Presigned URL 요청 응답 상태:', response.status);
        console.log('Presigned URL 요청 응답 헤더:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const data = await response.json();
            console.error('Presigned URL 요청 실패 응답:', data);
            throw new Error(data.message || '서버 오류');
        }
        
        const data = await response.json();
        console.log('Presigned URL 요청 성공 응답:', data);
        return data;
    } catch (error) {
        console.error('presigned URL 요청 실패:', error);
        throw error;
    }
}

// presigned URL로 이미지 업로드 함수
async function uploadProfileImage(file, presignedPutUrl) {
    try {
        console.log('=== S3 이미지 업로드 시작 ===');
        console.log('파일 정보:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        console.log('업로드 URL:', presignedPutUrl);
        
        const response = await fetch(presignedPutUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        console.log('S3 업로드 응답 상태:', response.status);
        console.log('S3 업로드 응답 헤더:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('S3 업로드 실패 응답 내용:', errorText);
            throw new Error(`이미지 업로드 실패: ${response.status} ${response.statusText}`);
        }
        
        console.log('S3 업로드 성공');
        return response;
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        throw error;
    }
}

// 전체 업로드 프로세스 관리 함수
async function uploadImageWithPresignedUrl(file) {
    try {
        console.log('=== 이미지 업로드 프로세스 시작 ===');
        console.log('선택된 파일:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        // 파일 확장자 추출
        const fileExtension = file.name.split('.').pop();
        const filename = generateUUID() + '.' + fileExtension;
        console.log('생성된 파일명:', filename);
        
        // 1. presigned URL 요청
        console.log('1단계: Presigned URL 요청');
        const presignedData = await fetchPresignedPutUrl(filename);
        const presignedPutUrl = presignedData.data;
        console.log('Presigned URL 획득 완료:', presignedPutUrl);
        
        // 2. presigned URL로 이미지 업로드
        console.log('2단계: S3 이미지 업로드');
        await uploadProfileImage(file, presignedPutUrl);
        
        // 3. 백엔드에 프로필 이미지 업데이트 알림 (확장자 제거한 UUID만 전송)
        console.log('3단계: 백엔드에 프로필 이미지 업데이트 알림');
        const imageNameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
        console.log('전송할 이미지명 (확장자 제거):', imageNameWithoutExtension);
        
        const updateResponse = await fetch('/api/users/me/profile-image', {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageName: imageNameWithoutExtension
            })
        });
        
        console.log('프로필 이미지 업데이트 API 응답 상태:', updateResponse.status);
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('프로필 이미지 업데이트 API 실패:', errorData);
            throw new Error(errorData.message || '프로필 이미지 업데이트 실패');
        }
        
        const updateData = await updateResponse.json();
        console.log('프로필 이미지 업데이트 API 성공:', updateData);
        
        console.log('=== 프로필 이미지 업로드 완료 ===');
        alert('프로필 이미지가 성공적으로 업로드되었습니다.');
        
        // 사이드바 프로필 이미지 업데이트
        console.log('4단계: 사이드바 프로필 이미지 업데이트');
        refreshSidebarProfile().then(() => {
            console.log('사이드바 프로필 이미지 새로고침 완료');
        });
        
    } catch (error) {
        console.error('=== 이미지 업로드 프로세스 실패 ===');
        console.error('에러 세부사항:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        alert('이미지 업로드 중 오류가 발생했습니다: ' + error.message);
        
        // 업로드 실패 시 원래 이미지로 복원
        if (updateProfileImage.src.startsWith('blob:')) {
            URL.revokeObjectURL(updateProfileImage.src);
        }
        updateProfileImage.src = '/images/profile.jpg';
    }
}

//모달 닫기 버튼
document.getElementsByClassName("update-user-info-modal-close")[0]
    .addEventListener("click", function () {
        const modal = document.getElementsByClassName("update-user-info-modal-container")[0];
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
            // 폼 리셋
            resetPasswordForm();
            // 비밀번호 변경은 사이드바에 영향을 주지 않으므로 모달만 닫기
            const modal = document.getElementsByClassName("update-user-info-modal-container")[0];
            const modalContent = modal.getElementsByClassName("modal-content")[0];
            modalContent.style.transform = "translateX(100%)";
            modalContent.addEventListener("transitionend", function handler() {
                modal.classList.remove("active");
                localStorage.removeItem("updateUserInfoModal");
                modalContent.style.transform = "";
                modalContent.removeEventListener("transitionend", handler);
            });
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

updateUserNameSubmitBtn.addEventListener("click", async function () {
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
            // 사이드바 유저명 업데이트 (서버에서 최신 데이터 가져오기)
            refreshSidebarProfile().then(() => {
                console.log('사이드바 새로고침 완료');
            });
            // 세션 새로고침
            refreshUserSession();
            // 메인 페이지 유저명 업데이트
            document.getElementById("userName").textContent = "@" + updateUserNameInputForm.value;
            document.getElementById("presentUserNameInputForm").value = updateUserNameInputForm.value;
            // 폼 리셋
            resetUsernameForm();
            // 모달 닫기
            const modal = document.getElementsByClassName("update-user-info-modal-container")[0];
            const modalContent = modal.getElementsByClassName("modal-content")[0];
            modalContent.style.transform = "translateX(100%)";
            modalContent.addEventListener("transitionend", function handler() {
                modal.classList.remove("active");
                localStorage.removeItem("updateUserInfoModal");
                modalContent.style.transform = "";
                modalContent.removeEventListener("transitionend", handler);
            });
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

updateNicknameSubmitBtn.addEventListener("click", async function () {
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
                    // 사이드바 닉네임 업데이트 (서버에서 최신 데이터 가져오기)
                    refreshSidebarProfile().then(() => {
                        console.log('사이드바 새로고침 완료');
                    });
                    // 세션 새로고침
                    refreshUserSession();
                    // 메인 페이지 닉네임 업데이트
                    document.getElementById("nickname").textContent = updateNicknameInputForm.value;
                    document.getElementById("presentNicknameInputForm").value = updateNicknameInputForm.value;
                    // 폼 리셋
                    resetNicknameForm();
                    // 모달 닫기
                    const modal = document.getElementsByClassName("update-user-info-modal-container")[0];
                    const modalContent = modal.getElementsByClassName("modal-content")[0];
                    modalContent.style.transform = "translateX(100%)";
                    modalContent.addEventListener("transitionend", function handler() {
                        modal.classList.remove("active");
                        localStorage.removeItem("updateUserInfoModal");
                        modalContent.style.transform = "";
                        modalContent.removeEventListener("transitionend", handler);
                    });
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
                // 메인 페이지 이메일 업데이트
                document.getElementById("presentEmailInputForm").value = updateEmailInputForm.value;
                // 폼 리셋
                resetEmailForm();
                // 이메일 변경은 사이드바에 영향을 주지 않으므로 모달만 닫기
                const modal = document.getElementsByClassName("update-user-info-modal-container")[0];
                const modalContent = modal.getElementsByClassName("modal-content")[0];
                modalContent.style.transform = "translateX(100%)";
                modalContent.addEventListener("transitionend", function handler() {
                    modal.classList.remove("active");
                    localStorage.removeItem("updateUserInfoModal");
                    modalContent.style.transform = "";
                    modalContent.removeEventListener("transitionend", handler);
                });
            } else {
                alert(data?.message);
            }
        })
    })
})

// OAuth 연동 기능
const oauthProviders = ['google', 'kakao', 'naver', 'github'];

oauthProviders.forEach(provider => {
    const oauthButton = document.getElementById(provider + '-login');
    if (oauthButton) {
        oauthButton.addEventListener('click', function() {
            // active 상태면 클릭 방지
            if (oauthButton.classList.contains('active')) {
                return;
            }
            linkOAuthAccount(provider);
        });
    }
});

function linkOAuthAccount(provider) {
    console.log('=== OAuth 연동 시작 ===');
    console.log(`${provider} OAuth 연동을 시작합니다.`);
    
    // 1단계: POST /api/users/oauth/link/{provider}/url로 OAuth URL 요청
    fetch(`/api/users/oauth/link/${provider}/url`, {
        method: 'POST',
        credentials: 'include',  // JWT 쿠키 포함
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log(`${provider} OAuth URL 생성 응답 상태:`, response.status);
        if (response.ok) {
            return response.json();
        } else {
            // 409 에러도 포함해서 백엔드 에러 메시지를 파싱
            return response.json().then(errorData => {
                const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }).catch(() => {
                // JSON 파싱 실패 시 기본 에러 메시지
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            });
        }
    })
    .then(data => {
        console.log(`${provider} OAuth URL 응답:`, data);
        if ((data.success || data.code === 200) && data.data && data.data.authUrl) {
            const authUrl = data.data.authUrl;
            
            console.log(`${provider} OAuth URL:`, authUrl);
            
            // 팝업 메시지 리스너 설정
            const messageListener = function(event) {
                console.log('팝업에서 메시지 수신:', event.data);
                
                if (event.data && event.data.type === 'oauth-link-result') {
                    window.removeEventListener('message', messageListener);
                    
                    if (event.data.success) {
                        console.log(`${provider} OAuth 연동 성공`);
                        
                        // OAuth 아이콘을 active 상태로 변경
                        const oauthIcon = document.getElementById(provider + '-login');
                        if (oauthIcon) {
                            oauthIcon.classList.add('active');
                        }
                    } else {
                        console.log(`${provider} OAuth 연동 실패:`, event.data.error);
                        // 팝업에서 이미 오류 메시지가 표시되므로 alert 제거
                        // 콘솔에만 에러 기록
                    }
                    
                    // 사이드바 새로고침 (연동 상태 확인)
                    refreshSidebarProfile();
                }
            };
            
            window.addEventListener('message', messageListener);
            
            // 2단계: OAuth 인증 URL을 팝업으로 열기
            const popup = window.open(authUrl, 'oauth-link-popup', 'width=500,height=600,scrollbars=yes,resizable=yes');
            
            // 팝업 모니터링 (메시지가 안 올 경우 대비)
            const checkPopup = setInterval(function() {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    // 메시지 리스너 정리
                    window.removeEventListener('message', messageListener);
                    
                    // 팝업이 닫혔을 때만 사이드바 새로고침 (메시지로 처리되지 않은 경우)
                    setTimeout(() => {
                        console.log(`${provider} OAuth 팝업이 닫혔습니다. 사이드바를 새로고침합니다.`);
                        refreshSidebarProfile();
                        // 연동 상태 재확인을 위해 유저 정보 다시 불러오기
                        updateOAuthIconsStatus();
                    }, 500);
                }
            }, 1000);
        } else {
            alert(data.message || 'OAuth URL 생성에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('OAuth 연동 오류:', error);
        if (error.message.includes('401')) {
            alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');
        } else {
            // 409 에러 포함 모든 에러는 백엔드 메시지를 그대로 표시
            alert(`OAuth 연동 중 오류가 발생했습니다: ${error.message}`);
        }
    });
}


//로그인 시 간편로그인 기능 (로그인 페이지용)
function startOAuthLogin(provider) {
    console.log(`${provider} 간편로그인을 시작합니다.`);
    
    // OAuth 로그인 URL로 리다이렉트
    window.location.href = `/oauth/${provider}`;
}

// 이메일 중복 시 계정 연동 확인 모달
function showAccountLinkConfirmModal(provider, email, linkToken) {
    const modal = document.createElement('div');
    modal.className = 'account-link-modal';
    modal.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">계정 연동</h5>
                    </div>
                    <div class="modal-body">
                        <p>이미 가입된 이메일 계정이 있습니다:</p>
                        <p><strong>${email}</strong></p>
                        <p>${getProviderDisplayName(provider)} 계정과 연동하시겠습니까?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelLinkBtn">취소</button>
                        <button type="button" class="btn btn-primary" id="confirmLinkBtn">연동하기</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 모달 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .account-link-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
        }
        .modal-backdrop {
            background: rgba(0, 0, 0, 0.5);
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .modal-dialog {
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            width: 90%;
        }
        .modal-header h5 {
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .modal-body {
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .modal-footer {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    
    // 취소 버튼 클릭
    document.getElementById('cancelLinkBtn').addEventListener('click', function() {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        // 로그인 페이지로 이동
        window.location.href = '/login';
    });
    
    // 연동하기 버튼 클릭
    document.getElementById('confirmLinkBtn').addEventListener('click', function() {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        // 링크 토큰과 함께 OAuth 인증 다시 시작
        window.location.href = `/oauth/${provider}?link_token=${linkToken}`;
    });
}

function getProviderDisplayName(provider) {
    const providerNames = {
        'google': '구글',
        'kakao': '카카오',
        'naver': '네이버',
        'github': '깃허브'
    };
    return providerNames[provider] || provider;
}

// OAuth 아이콘 상태 업데이트 함수
function updateOAuthIconsStatus() {
    fetch("/api/users/details", {
        method: "GET",
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        const userData = data.data;
        const activatedOAuthProviders = userData.OAuthList.map(oauth => oauth.provider.toLowerCase());
        
        // 모든 OAuth 아이콘을 일단 비활성화 상태로 초기화
        oauthProviders.forEach(provider => {
            const iconElement = document.getElementById(`${provider}-login`);
            if (iconElement) {
                iconElement.classList.remove("active");
            }
        });
        
        // 연동된 OAuth 제공업체만 활성화
        activatedOAuthProviders.forEach(provider => {
            const iconElement = document.getElementById(`${provider}-login`);
            if (iconElement) {
                iconElement.classList.add("active");
            }
        });
    })
    .catch(error => {
        console.error("OAuth 상태 업데이트 실패:", error);
    });
}

// 회원 탈퇴 기능 - 모달 로드 후 실행되도록 수정
function initDeleteAccountButton() {
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            // 확인 모달 생성
            const modal = document.createElement('div');
            modal.id = 'deleteAccountConfirmModal';
            modal.style.cssText = `
                display: block;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.4);
            `;
            
            modal.innerHTML = `
                <div style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: none; border-radius: 8px; width: 400px; max-width: 90%; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="color: #dc3545; font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 24px; font-weight: bold; color: #dc3545; margin-bottom: 15px;">회원 탈퇴</div>
                    <div style="font-size: 16px; color: #6c757d; margin-bottom: 30px; line-height: 1.5;">
                        정말로 회원 탈퇴를 진행하시겠습니까?<br>
                        <strong>탈퇴시 모든 연동된 간편 로그인은 해제되며,<br>
                        다시 복구할 수 없습니다.</strong>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="cancelDeleteBtn" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">취소</button>
                        <button id="confirmDeleteBtn" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">탈퇴하기</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 취소 버튼
            document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // 탈퇴하기 버튼
            document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
                try {
                    const response = await fetch('/api/users/delete', {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        alert('회원 탈퇴가 완료되었습니다.');
                        window.location.href = '/';
                    } else {
                        alert('회원 탈퇴 중 오류가 발생했습니다.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('회원 탈퇴 중 오류가 발생했습니다.');
                }
                document.body.removeChild(modal);
            });
            
            // 모달 외부 클릭시 닫기
            modal.addEventListener('click', function(event) {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        });
    }
}

// 폼 리셋 함수들
function resetUsernameForm() {
    updateUserNameInputForm.value = "";
    updateUserNameInputForm.disabled = false;
    updateUserNameInputForm.classList.remove("is-valid", "is-invalid");
    updateUserNameVerifyBtn.textContent = "중복 확인";
    updateUserNameVerifyBtn.disabled = true;
    updateUserNameSubmitBtn.disabled = true;
    document.getElementsByClassName("update-username-block")[0].style.display = "none";
}

function resetNicknameForm() {
    updateNicknameInputForm.value = "";
    updateNicknameInputForm.classList.remove("is-valid", "is-invalid");
    updateNicknameSubmitBtn.disabled = true;
    document.getElementsByClassName("update-nickname-block")[0].style.display = "none";
}

function resetEmailForm() {
    updateEmailInputForm.value = "";
    updateEmailInputForm.readOnly = false;
    emailAuthNumberInputForm.value = "";
    requestEmailVerificationBtn.disabled = true;
    verifyAuthNumberBtn.disabled = true;
    updateEmailSubmitBtn.disabled = true;
    document.getElementsByClassName("update-email-block")[0].style.display = "none";
}

function resetPasswordForm() {
    presentPasswordInputForm.value = "";
    updateNewPasswordInputForm.value = "";
    updateNewPasswordConfirmInputForm.value = "";
    
    presentPasswordInputForm.closest(".input-group").classList.remove("is-valid", "is-invalid");
    updateNewPasswordInputForm.closest(".input-group").classList.remove("is-valid", "is-invalid");
    updateNewPasswordConfirmInputForm.closest(".input-group").classList.remove("is-valid", "is-invalid");
    
    updatePasswordSubmitBtn.disabled = true;
    document.getElementsByClassName("update-password-block")[0].style.display = "none";
}

// 세션 새로고침 함수
function refreshUserSession() {
    fetch('/mypage/refresh-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('세션 새로고침 완료:', data.message);
        } else {
            console.warn('세션 새로고침 실패:', data.message);
        }
    })
    .catch(error => {
        console.error('세션 새로고침 중 오류:', error);
    });
}

// 함수 호출
initDeleteAccountButton();
