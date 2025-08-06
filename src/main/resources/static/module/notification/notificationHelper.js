/**
* notificationHelper.js - 공통 노티피케이션 모듈
*/

export const NotificationHelper = {
    // 알림 메시지 표시
    showNotification(message, type = 'info') {
        const notification = this._createNotification('notification', message, type);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            this._hideNotification(notification);
        }, 3000);

        return notification;
    },

    // 성공 알림
    showSuccess(message) {
        return this.showNotification(message, 'success');
    },

    // 에러 알림
    showError(message) {
        return this.showNotification(message, 'error');
    },

    // 정보 알림
    showInfo(message) {
        return this.showNotification(message, 'info');
    },

    // 지도 업데이트 전용 알림 (자동 제거 안됨)
    showMapUpdateNotification(message, type = 'info') {
        const notification = this._createNotification('map-update-notification', message, type);

        // info 타입이 아닌 경우에만 3초 후 자동 제거
        if (type !== 'info') {
            setTimeout(() => {
                this._hideNotification(notification);
            }, 3000);
        }

        return notification;
    },

    // 알림 숨기기
    hideNotification(notification) {
        this._hideNotification(notification);
    },

    // 내부 메서드: 노티피케이션 생성
    _createNotification(className, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = className;
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            border-radius: 6px; color: white; font-weight: 500; z-index: 5000;
            animation: slideInNotification 0.3s ease; max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        // 타입별 배경색 설정
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#007bff'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        // 애니메이션 스타일 추가
        this._addNotificationStyles();

        document.body.appendChild(notification);

        return notification;
    },

    // 내부 메서드: 알림 숨기기
    _hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideInNotification 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    },

    // 내부 메서드: 노티피케이션 스타일 추가
    _addNotificationStyles() {
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInNotification {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
};
