// OAuth 회원가입 확인 페이지 JavaScript

// HTML 데이터 속성에서 서버 데이터 읽기
const email = document.body.getAttribute('data-email') || '';
const userName = document.body.getAttribute('data-username') || '';
const provider = document.body.getAttribute('data-provider') || '';

// 페이지 로드 시 부모 창에 신규 사용자 확인 메시지 전송
if (window.opener) {
    window.opener.postMessage({
        type: 'oauth-register-required',
        email: email,
        userName: userName,
        provider: provider
    }, window.location.origin);
}

// 폼 제출 시 로딩 상태 표시
document.querySelector('form').addEventListener('submit', function () {
    document.getElementById('buttons').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
});

// 취소 버튼 이벤트 리스너
document.querySelector('.btn-secondary').addEventListener('click', function (e) {
    e.preventDefault();

    // 부모 창이 있는 경우 메시지 전송
    if (window.opener) {
        window.opener.postMessage({oauthCancelled: true}, window.location.origin);
        window.close();
    } else {
        // 일반 창인 경우 홈으로 리다이렉트
        window.location.href = '/';
    }
});