function initModalScript() {
    const submitButton = document.getElementById("submit");
    const userNameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    const togglePassword = document.getElementById("togglePassword");
    const registerGuide = document.getElementById("register-guide");

    //로그인 폼 제출
    submitButton.addEventListener("click", function() {
        console.log("username : %s password : %s", userNameInput.value, passwordInput.value)
        fetch("/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                userName: userNameInput.value,
                password: passwordInput.value
            })
        }).then(response => {
            if (response.status === 401) {
                return response.json().then(data => {
                    alert(data.message);
                    throw new Error(data.message);
                })
            }  else if(response.status === 500) {
                alert("현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주십시오.");
                throw new Error();
            } else {
                return response.json();
            }
        }).then(data => {
            alert("로그인에 성공했습니다.")
        });
    });

    //비밀번호 숨기기 토글
    togglePassword.addEventListener("click", function() {
        const icon = this.querySelector("svg");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.innerHTML = `
                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  
                stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  
                class="icon icon-tabler icons-tabler-outline icon-tabler-eye">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
                </svg>
            `;
        } else {
            passwordInput.type = "password";
            icon.innerHTML = `      
                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-eye-closed">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M21 9c-2.4 2.667 -5.4 4 -9 4c-3.6 0 -6.6 -1.333 -9 -4" />
                    <path d="M3 15l2.5 -3.8" /><path d="M21 14.976l-2.492 -3.776" />
                    <path d="M9 17l.5 -4" /><path d="M15 17l-.5 -4" />
                </svg>    
            `
        }
    });

    //회원가입 모달 오픈
    registerGuide.addEventListener("click", function () {
        console.log("sex");
        document.getElementById("login-modal-container").style.display = "none";
        document.getElementById("register-modal-container").style.display = "flex";
    });
}