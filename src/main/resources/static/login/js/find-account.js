function initModalScript() {
    //로그인 모달 닫기
    document.getElementById("find-account-modal-close")
        .addEventListener("click", function () {
            console.log("click");
            document.getElementById("content-overlay").style.display = "flex";
            document.getElementById("find-account-modal-container").style.display = "none";
        });

    //인증번호 전송
    const pwdEmailCodeSendButton = document.getElementById("find-password-email-verification-code-send-btn");

    pwdEmailCodeSendButton.addEventListener("click", function () {
        const emailInput = document.getElementById("find-password-email").value;

        buttonDisableToggle(pwdEmailCodeSendButton,true);
        pwdEmailCodeSendButton.textContent = "잠시만 기다려주십시오";

        if (emailInput) {
            fetch('/api/mail/request-verify/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailInput
                })
            })
                .then(response => {
                    if (response.ok) {
                        emailInput.readOnly = true;
                        startCountdown(pwdEmailCodeSendButton);
                    } else {
                        return response.json().then(data => {
                            buttonDisableToggle(pwdEmailCodeSendButton, false);
                            pwdEmailCodeSendButton.textContent = "인증 번호 발송";
                            alert(data.message);
                        });
                    }
                })
                .catch(error => console.log(error));
        } else {
            buttonDisableToggle(pwdEmailCodeSendButton, false);
            pwdEmailCodeSendButton.textContent = "인증 번호 발송";
            alert('이메일을 입력해주십시오.');
        }
    })

    function startCountdown(button) {
        let timeLeft = 180;

        const timer = setInterval(function () {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            button.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            timeLeft -= 1;

            if (timeLeft < 0) {
                clearInterval(timer);
                buttonDisableToggle(button, false);
                button.textContent = '인증 번호 발송';
            }
        }, 1000);
    }

    //인증번호 확인
    const authNumberVerifyButton = document.getElementById("find-password-auth-number-verify-btn");

    authNumberVerifyButton.addEventListener("click", function() {
        const authNumberInput = document.getElementById("find-password-auth-number").value;
        const emailInput = document.getElementById("find-password-email").value;

        if(authNumberInput) {
            buttonDisableToggle(authNumberVerifyButton, true);
            authNumberVerifyButton.textContent = "잠시만 기다려주십시오";

            fetch('/api/mail/verify/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailInput,
                    authNumber: authNumberInput
                })
            })
                .then(response => {
                    if (response.ok) {
                        emailInput.readOnly = true;
                        document.getElementsByClassName("verify-email")[0].style.display = "none";
                        document.getElementsByClassName("input-password")[0].style.display = "block";
                    } else {
                        return response.json().then(data => {
                            buttonDisableToggle(authNumberVerifyButton, false);
                            authNumberVerifyButton.textContent = "인증 번호 확인";
                            alert(data.message);
                        });
                    }
                })
                .catch(error => console.log(error));
        } else {
            alert("인증번호를 입력해주십시오.");
        }
    })

    //버튼 비활성 토글
    function buttonDisableToggle(button, boolean) {
        if(boolean) {
            button.classList.add("disabled", boolean);
        } else {
            button.classList.remove("disabled");
        }
    }

    //비밀번호 입력창 토글
    function togglePasswordVisibility(passwordInput, toggleButton) {
        const icon = toggleButton.querySelector("svg");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.innerHTML = `
                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  
                stroke="black"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  
                class="icon icon-tabler icons-tabler-outline icon-tabler-eye">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
                </svg>
            `;
        } else {
            passwordInput.type = "password";
            icon.innerHTML = `      
                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="black"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-eye-closed">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M21 9c-2.4 2.667 -5.4 4 -9 4c-3.6 0 -6.6 -1.333 -9 -4" />
                    <path d="M3 15l2.5 -3.8" /><path d="M21 14.976l-2.492 -3.776" />
                    <path d="M9 17l.5 -4" /><path d="M15 17l-.5 -4" />
                </svg>    
            `
        }
    }

    document.getElementById("toggleNewPassword").addEventListener("click", function () {
        togglePasswordVisibility(document.getElementById("newPassword"), this);
    })

    document.getElementById("toggleNewPasswordConfirm").addEventListener("click", function () {
        togglePasswordVisibility(document.getElementById("newPasswordConfirm"), this);
    })

    //비밀번호 확인
    const newPasswordInput = document.getElementById("newPassword");
    const newPasswordConfirmInput = document.getElementById("newPasswordConfirm");

    const newPasswordInputGroup = document.querySelector("#newPassword").closest(".input-group.input-group-flat");
    const newPasswordConfirmInputGroup = document.querySelector("#newPasswordConfirm").closest(".input-group.input-group-flat");

    function debounce(callback, delay = 500) {
        let debounceTimer;
        return function (...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => callback(...args), delay);
        };
    }

    newPasswordInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordInputGroup, validatePassword(newPasswordInput.value))));
    newPasswordConfirmInput.addEventListener("input", debounce(() => toggleValidationClass(newPasswordConfirmInputGroup, newPasswordInput.value === newPasswordConfirmInput.value && newPasswordConfirmInput.value !== "")));

    function validatePassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])^\S{16,}$/.test(password);
    }

    function toggleValidationClass(input, isValid) {
        input.classList.toggle("is-valid", isValid);
        input.classList.toggle("is-invalid", !isValid);
    }

    //비밀번호 업데이트 쿼리 전송
    const submitNewPasswordButton = document.getElementById("submit-new-password-btn");

    submitNewPasswordButton.addEventListener("click", function() {
        console.log("버튼 클릭");
        console.log(newPasswordInput.value);
        fetch("/api/users/password-reset", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                password:newPasswordInput.value
            })
        })
            .then(response => {
                if (response.ok) {
                    document.getElementsByClassName("input-password")[0].style.display = "none";
                    document.getElementsByClassName("result-page")[0].style.display = "block";
                } else {
                    return response.json().then(data => {
                        alert(data.message);
                    });
                }
            })
            .catch(error => console.log(error));
    })

    //로그인 화면으로 돌아가기
    document.getElementById("return-to-login-btn").addEventListener("click", function() {
        document.getElementsByClassName("result-page")[0].style.display = "none";
        document.getElementsByClassName("verify-email")[0].style.display = "block";
        document.getElementsByClassName("find-account-modal-container")[0].style.display = "none";
        document.getElementsByClassName("login-modal-container")[0].style.display = "flex";
    })
}