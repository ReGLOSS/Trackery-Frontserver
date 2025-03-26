import {startCountdown} from "./utils.js";

export function sendRequestVerificationEmail(sendEmailButton, authNumberButton, emailInput) {
    const emailValue = emailInput.value;
    if (emailValue) {
        sendEmailButton.disabled = true;
        sendEmailButton.textContent = "...";

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
                    startCountdown(sendEmailButton, function () {
                        restoreSendVerificationEmailButton(sendEmailButton);
                    });
                    authNumberButton.disabled = false;
                } else {
                    return response.json().then(data => {
                        restoreSendVerificationEmailButton(sendEmailButton);
                        alert(data.message);
                    });
                }
            })
            .catch(error => console.error(error));
    } else {
        restoreSendVerificationEmailButton(sendEmailButton);
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

    console.log("emailValue: {}", emailValue);
    console.log("authNumberValue: {}", authNumberValue);

    if (!emailValue) {
        alert("이메일을 입력해주십시오.");
        return;
    }

    if (!authNumberValue) {
        alert("인증 번호를 입력해주십시오.");
        return;
    }

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
            } else if (response.status === 400) {
                restoreAuthNumberVerificationButton(authNumberButton);
                alert("인증번호가 올바르지 않습니다.");
            } else {
                return response.json().then(data => {
                    restoreAuthNumberVerificationButton(authNumberButton);
                    alert(data.message);
                });
            }
        })
}

function restoreAuthNumberVerificationButton(button) {
    button.disabled = false;
    button.textContent = "인증 번호 확인";
}