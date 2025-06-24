import {debounce, togglePasswordVisibility, validatePassword} from "/module/landing/utils.js"
import {sendRequestVerificationEmail, authNumberVerification} from "/module/landing/email-verification.js"
import {refreshSidebarProfile, updateSidebarField} from "/common/js/sidebar-utils.js"

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
            // 사이드바 유저명 업데이트
            updateSidebarField('userName', updateUserNameInputForm.value);
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
                    // 사이드바 닉네임 업데이트
                    updateSidebarField('nickname', updateNicknameInputForm.value);
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
                        alert(`${getProviderDisplayName(provider)} 연동이 완료되었습니다.`);
                    } else {
                        console.log(`${provider} OAuth 연동 실패:`, event.data.error);
                        alert(`${getProviderDisplayName(provider)} 연동에 실패했습니다: ${event.data.error || '알 수 없는 오류'}`);
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
            alert('OAuth 연동 중 오류가 발생했습니다.');
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
