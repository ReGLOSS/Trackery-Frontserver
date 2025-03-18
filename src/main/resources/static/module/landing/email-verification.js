import {startCountdown} from "./utils.js";

export function sendRequestVerificationEmail(button, emailInput) {
    const emailValue = emailInput.value;
    if (emailValue) {
        button.disabled = true;
        button.textContent = "...";

        fetch('/api/mail/request-verify/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailValue
            })
        })
            .then(response => {
                if (response.ok) {
                    emailInput.readOnly = true;
                    startCountdown(button, function () {
                        restoreSendVerificationEmailButton(button);
                    });
                } else {
                    return response.json().then(data => {
                        restoreSendVerificationEmailButton(button);
                        alert(data.message);
                    });
                }
            })
            .catch(error => console.error(error));
    } else {
        restoreSendVerificationEmailButton(button);
        alert('이메일을 입력해주십시오.');
    }
}

function restoreSendVerificationEmailButton(button) {
    button.disabled = false;
    button.textContent = "인증 번호 발송";
}

export function authNumberVerification(sendEmailButton, authNumberButton, authNumberInput, emailInput, callback) {
    const verifiedText = "인증 완료"
    const emailValue = emailInput.value;
    const authNumberValue = authNumberInput.value;

    if (authNumberValue) {
        authNumberButton.disabled = true;
        authNumberButton.textContent = "...";

        fetch('/api/mail/verify/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailValue,
                authNumber: authNumberValue
            })
        })
            .then(response => {
                if (response.ok) {
                    authNumberButton.disabled = true;
                    authNumberInput.readOnly = true;
                    emailInput.readOnly = true;

                    authNumberButton.textContent = verifiedText;
                    sendEmailButton.textContent = verifiedText;

                    clearInterval(sendEmailButton.verificationTimer);

                    sendEmailButton.disabled = true;
                    authNumberInput.style.display = "none";
                    authNumberButton.style.display = "none";

                    callback();
                } else {
                    return response.text().then(text => {
                        try {
                            const data = JSON.parse(text);
                            restoreAuthNumberVerificationButton(authNumberButton);
                            alert(data.message);
                        } catch (error) {
                            restoreAuthNumberVerificationButton(authNumberButton);
                            alert("응답을 처리하는 중 오류가 발생했습니다.");
                        }
                    });
                }
            })
            .catch(error => {
                restoreAuthNumberVerificationButton(authNumberButton);
                console.error(error);
                alert("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
            });

    } else {
        alert("인증번호를 입력해주십시오.");
    }
}

function restoreAuthNumberVerificationButton(button) {
    console.log("gd");
    button.disabled = false;
    button.textContent = "인증 번호 확인";
}