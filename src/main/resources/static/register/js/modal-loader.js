document.addEventListener("DOMContentLoaded", function () {
    fetch("/register/modal-html", {
        method: "GET"
    })
        .then(response => response.text())
        .then(html => {
            document.getElementById("modal-container").innerHTML = html;
            loadModalScript();
        })
        .catch(error => console.error("모달을 불러오는 중 오류 발생:", error));
});

function openModal() {
    document.getElementById("modal-container").style.display = "flex";
}

function closeModal() {
    document.getElementById("modal-container").style.display = "none";
}

function loadModalScript() {
    const script = document.createElement("script");
    script.src = "/register/js/input-form.js";
    script.onload = () => {
        initModalFunctions();
    }
    document.body.appendChild(script);
}
