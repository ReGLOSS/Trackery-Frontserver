document.addEventListener("DOMContentLoaded", function () {
    fetch("/api/users/details", {
        method: "GET",
        credentials: "include"
    })
        .then(response => response.json())
        .then(data => {
            console.log("유저 정보 : {}",data);
            document.getElementById("username").textContent = "@" + data.data.userName;
            document.getElementById("nickname").textContent = data.data.nickname;
        })
})