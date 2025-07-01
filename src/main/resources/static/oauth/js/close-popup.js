// OAuth 팝업 닫기 페이지 JavaScript

// HTML 데이터 속성에서 서버 데이터 읽기
const success = document.body.getAttribute('data-success') === 'true';
const error = document.body.getAttribute('data-error');
const errorDescription = document.body.getAttribute('data-error-description');

console.log('OAuth 처리 완료 페이지 로드:', {success, error, errorDescription});

// 부모 창에 메시지 전송
if (window.opener) {
    if (success) {
        // 연동 성공
        window.opener.postMessage({
            type: 'oauth-link-result',
            success: true
        }, window.location.origin);
    } else if (error) {
        // 연동 실패
        window.opener.postMessage({
            type: 'oauth-link-result',
            success: false,
            error: errorDescription || '알 수 없는 오류가 발생했습니다.'
        }, window.location.origin);
    } else {
        // 일반 로그인 완료 (기존 동작)
        window.opener.postMessage({oauthComplete: true}, window.location.origin);
    }

    // 잠시 후 창 닫기
    setTimeout(function () {
        window.close();
    }, 3000);
} else {
    // 팝업이 아닌 경우 직접 리다이렉트
    if (success || (!error && !errorDescription)) {
        window.location.href = '/home';
    } else {
        // 오류 발생 시 홈페이지로
        window.location.href = '/';
    }
}