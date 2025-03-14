package com.trackery.trackeryfrontserver.domain.proxy;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy
 * fileName       : ServerException
 * author         : durururuk
 * date           : 25. 3. 14.
 * description    :
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 14.        durururuk      최초 생성
 */
public class ServerException extends RuntimeException {
	public ServerException(String message) {
		super(message);
	}
}
