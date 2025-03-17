export function closeAndOpenElements(toClose, toOpen, openStatus) {
        document.getElementById(toClose).style.display = "none";
        document.getElementById(toOpen).style.display = openStatus;
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