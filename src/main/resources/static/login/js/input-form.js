function initModalScript() {
    const submitButton = document.getElementById("submit");
    const userNameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");

    submitButton.addEventListener("click", function() {
        console.log("username : %s password : %s", userNameInput.value, passwordInput.value)
        fetch("/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                userName: userNameInput.value,
                password: passwordInput.value
            })
        }).then(response => {
            if (response.status === 401) {
                return response.json().then(data => {
                    alert(data.message);
                    throw new Error(data.message);
                })
            }  else if(response.status === 500) {
                alert("현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주십시오.");
                throw new Error();
            } else {
                return response.json();
            }
        }).then(data => {
            alert("로그인에 성공했습니다.")
        });
    })
}