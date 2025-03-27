package com.trackery.trackeryfrontserver.domain.proxy;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy
 * fileName       : ServerException
 * author         : durururuk
 * date           : 25. 3. 14.
 * description    : 서버 오류 상황을 나타내는 예외 클래스.
 *  				이 클래스는 서버 측에서 발생하는 런타임 예외를 처리하기 위해 사용됩니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 14.        durururuk       최초 생성
 * 25. 3. 17.        inari           주석 추가
 */
public class ServerException extends RuntimeException {
	public ServerException(String message) {
		super(message);
	}
}
