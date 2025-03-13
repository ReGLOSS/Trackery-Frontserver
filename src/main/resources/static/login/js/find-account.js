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
                        return response.json().then(errorData => {
                            buttonDisableToggle(pwdEmailCodeSendButton, false);
                            pwdEmailCodeSendButton.textContent = "인증 번호 발송";
                            alert(errorData.message);
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
                        document.getElementsByClassName("input-password")[0].style.display = "flex";
                    } else {
                        return response.json().then(errorData => {
                            buttonDisableToggle(authNumberVerifyButton, false);
                            authNumberVerifyButton.textContent = "인증 번호 확인";
                            alert(errorData.message);
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
}