package com.trackery.trackeryfrontserver.config;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : CustomErrorController
 * author         : inari
 * date           : 25. 6. 17.
 * description    : 401 Unauthorized 에러를 커스텀 처리하는 컨트롤러
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 6. 17.        inari           최초 생성
 */
@Slf4j
@Controller
public class CustomErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request, HttpServletResponse response) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        
        log.info("CustomErrorController 실행됨 - URI: {}, Status: {}", 
                request.getRequestURI(), status);
        
        if (status != null) {
            int statusCode = Integer.parseInt(status.toString());
            
            // 401 Unauthorized 에러인 경우
            if (statusCode == HttpStatus.UNAUTHORIZED.value()) {
                log.info("401 에러 처리 시작");
                // AJAX 요청 확인 - API 경로로 판별
                String requestUri = request.getRequestURI();
                boolean isAjaxRequest = requestUri != null && requestUri.startsWith("/api/");
                
                log.info("요청 타입 판별 - URI: {}, isAjax: {}", 
                        requestUri, isAjaxRequest);
                
                if (isAjaxRequest) {
                    log.info("AJAX 요청으로 판별 - 스크립트 응답 전송");
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType("text/html;charset=UTF-8");
                    try {
                        response.getWriter().write("""
                            <script>
                                alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                                window.location.href = '/';
                            </script>
                            """);
                    } catch (Exception e) {
                        // 에러 처리
                    }
                    return null;
                } else {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    return "error/unauthorized";
                }
            }
        }
        
        // 기타 에러는 기본 에러 페이지로
        return "error/general";
    }
}
