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

    if (button.verificationTimer) {
        clearInterval(button.verificationTimer);
    }

    button.verificationTimer = setInterval(function () {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        button.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        timeLeft -= 1;

        if (timeLeft < 0) {
            clearInterval(button.verificationTimer);
            button.verificationTimer = null;
            callbackFunction();
        }
    }, 1000);
}

export function validatePassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])^\S{16,}$/.test(password);
}

export function debounce(callback, delay = 500) {
    let debounceTimer;
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => callback(...args), delay);
    };
}

function checkRequiredFields(requiredInputsGroups, contains, callback) {
    const allValid = requiredInputsGroups.every(requiredInputsGroups => requiredInputsGroups.classList.contains(contains));
    if(allValid) {
        callback();
    }
}