function initModalScript() {
    //로그인 모달 닫기
    document.getElementById("find-account-modal-close")
        .addEventListener("click", function () {
            console.log("click");
            document.getElementById("content-overlay").style.display = "flex";
            document.getElementById("find-account-modal-container").style.display = "none";
        });
}