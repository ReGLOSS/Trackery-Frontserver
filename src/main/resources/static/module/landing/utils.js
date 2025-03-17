export function closeAndOpenElements(toClose, toOpen, openStatus) {
        toClose.style.display = "none";
        toOpen.style.display = openStatus;
}

export function togglePasswordVisibility(icon, passwordInput) {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.src = "/icons/password/eye-opened.svg";
    } else {
        passwordInput.type = "password";
        icon.src = "/icons/password/eye-closed.svg";
    }
}

export function startCountdown(button, callbackFunction) {
    let timeLeft = 180;

    const timer = setInterval(function () {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        button.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        timeLeft -= 1;

        if (timeLeft < 0) {
            clearInterval(timer);
            callbackFunction();
        }
    }, 1000);
}

export function validatePassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])^\S{16,}$/.test(password);
}