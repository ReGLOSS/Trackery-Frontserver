function initModalFunctions() {

    const emailInput = document.getElementById("email");
    const usernameInput = document.getElementById("username");
    const nicknameInput = document.getElementById("nickname");
    const passwordInput = document.getElementById("password");
    const passwordConfirmInput = document.getElementById("password-confirm");
    const preferredLocationInput = document.getElementById("preferred-location");
    const saveButton = document.getElementById("save-btn");
    const usernameVerifyButton = document.getElementById("username-verify-btn");

    // 버튼 클릭 이벤트

    saveButton.addEventListener("click", function () {
        fetch("/api/users/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email: emailInput.value,
                userName: usernameInput.value,
                nickname: nicknameInput.value,
                password: passwordInput.value
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        alert(data.message || "요청 처리 중 문제가 발생했습니다.");
                        throw new Error(data.message);
                    })
                }
                return response.json();
            })
            .then(data => {
                alert("회원가입이 성공적으로 완료되었습니다!");
                window.location.replace("/register/temporal-main")
            });
    });

    usernameVerifyButton.addEventListener("click", function () {
        fetch("/api/users/exists/username?value=" + encodeURIComponent(usernameInput.value), {
            method: "GET",
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        alert(data.message || "요청 처리 중 문제가 발생했습니다.");
                        throw new Error(data.message);
                    })
                }
                return response.json();
            })
            .then(data => {
                if (data.data === true) {
                    usernameInput.disabled = true;
                    usernameVerifyButton.textContent = "확인 완료";
                    usernameVerifyButton.classList.add("is-valid");
                    toggleButtonState(usernameVerifyButton, false);
                } else {
                    toggleValidationClass(usernameInput, false)
                }
            })
    });

    // 입력폼 디바운싱
    function debounce(callback, delay = 500) {
        let debounceTimer;
        return function (...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => callback(...args), delay);
        };
    }

    passwordInput.addEventListener("input", debounce(() => applyValidationClass(passwordInput, validatePassword(passwordInput.value))));
    passwordConfirmInput.addEventListener("input", debounce(() => checkPasswordMatch(passwordInput, passwordConfirmInput)));
    usernameInput.addEventListener("input", debounce(() => applyUsernameValidationClass(usernameInput, validateUsername(usernameInput.value))));
    nicknameInput.addEventListener("input", debounce(() => applyValidationClass(nicknameInput, validateNickname(nicknameInput.value))));
    emailInput.addEventListener("input", debounce(() => applyValidationClass(emailInput, validateEmail(emailInput.value))));

    function applyValidationClass(input, isValid) {
        toggleValidationClass(input, isValid);
        checkRequiredFields();
    }

    function applyUsernameValidationClass(input, isValid) {
        toggleValidationClass(input, isValid);
        toggleButtonState(usernameVerifyButton, isValid);
    }

    function toggleValidationClass(input, isValid) {
        input.classList.toggle("is-valid", isValid);
        input.classList.toggle("is-invalid", !isValid);
    }

    function toggleButtonState(button, isValid) {
        button.disabled = !isValid; // `disabled` 속성 추가/제거
        button.classList.toggle("disabled", !isValid); // `disabled` 클래스 추가/제거
    }

    function validateUsername(username) {
        return /^\w{4,15}$/.test(username);
    }

    function validatePassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])^\S{16,}$/.test(password);
    }

    function validateNickname(nickname) {
        return nickname.trim() !== "";
    }

    function validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    function checkPasswordMatch(origPassword, confirmPassword) {
        applyValidationClass(confirmPassword, origPassword.value === confirmPassword.value && confirmPassword.value !== "");
    }

    const requiredInputs = [emailInput, usernameInput, passwordInput, passwordConfirmInput, usernameVerifyButton];

    function checkRequiredFields() {
        const allValid = requiredInputs.every(input => input.classList.contains("is-valid"));
        toggleButtonState(saveButton, allValid);
    }
}



