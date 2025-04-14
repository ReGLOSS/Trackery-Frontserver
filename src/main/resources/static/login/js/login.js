import {closeAndOpenElements, togglePasswordVisibility} from "/module/landing/utils.js";

const userNameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");

//로그인 폼 제출
document.getElementById("submit")
    .addEventListener("click", function () {
        fetch("/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                userName: userNameInput.value,
                password: passwordInput.value
            })
        }).then(response => {
            if (response.status === 400) {
                return response.json().then(data => {
                    alert(data.message);
                    throw new Error(data.message);
                })
            } else if (response.status === 500) {
                alert("현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주십시오.");
                throw new Error();
            } else {
                return response.json();
            }
        }).then(data => {
            window.location.replace("/home");
        });
    });

//비밀번호 숨기기 토글
document.getElementById("togglePassword")
    .addEventListener("click", function () {
        const icon = document.getElementById("loginPasswordIcon");
        togglePasswordVisibility(icon, passwordInput)
    });

 // OAuth 로그인 버튼 이벤트 리스너 추가
 setupOAuthButtons();

//회원가입 모달 오픈
document.getElementById("register-guide")
    .addEventListener("click", function () {
            closeAndOpenElements(
                document.getElementById("login-modal-container"),
                document.getElementById("register-modal-container"),
                "flex"
            );
        }
    );

//계정 찾기 모달 오픈
document.getElementById("find-account-guide")
    .addEventListener("click", function () {
        closeAndOpenElements(
            document.getElementById("login-modal-container"),
            document.getElementById("find-account-modal-container"),
            "flex"
        );
    })

//로그인 모달 닫기
document.getElementById("login-modal-close")
    .addEventListener("click", function () {
        closeAndOpenElements(
            document.getElementById("login-modal-container"),
            document.getElementById("content-overlay"),
            "flex"
        );
    });

//로그인 모달 오픈
document.getElementById("startButton")
    .addEventListener("click", function () {
        closeAndOpenElements(
            document.getElementById("content-overlay"),
            document.getElementById("login-modal-container"),
            "flex"
        );
    });

// OAuth 로그인 설정 함수
function setupOAuthButtons() {
    // OAuth 제공자 정의
    const oauthProviders = [
        { id: "google-login", provider: "google" },
        { id: "kakao-login", provider: "kakao" },
        { id: "naver-login", provider: "naver" },
        { id: "github-login", provider: "github" }
    ];

   // 각 OAuth 버튼에 이벤트 리스너 추가
   oauthProviders.forEach(({id, provider}) => {
       const element = document.getElementById(id);
       if (element) {
           element.addEventListener("click", function(e) {
               e.preventDefault();

               // 새 창에서 OAuth 로그인 처리
               const oauthWindow = window.open(
                   `/oauth/${provider}`,
                   `${provider}Login`,
                   'width=600,height=700,top=100,left=100'
               );

               // 창 참조 저장
               window.oauthPopupRef = oauthWindow;

               // 메시지 이벤트 리스너 등록
               window.addEventListener('message', function(event) {
                   if (event.data && event.data.oauthComplete) {
                       // 인증 완료 시 temporal-main 페이지로 이동
                       window.location.href = '/register/temporal-main';
                   }
               });
           });
       }
   });
}

// 페이지 로드 시 OAuth 버튼 설정
document.addEventListener('DOMContentLoaded', function() {
    setupOAuthButtons();
});
