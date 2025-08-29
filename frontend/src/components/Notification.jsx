import React, { useState, useEffect } from 'react';

const Notification = ({ 
  type = 'info', // 'success', 'error', 'warning', 'info'
  title,
  message,
  isVisible,
  onClose,
  duration = 5000 // Auto close after 5 seconds
}) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(() => {
      onClose();
    }, 300); // Allow animation to complete
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          title: 'text-orange-800',
          message: 'text-orange-700',
          iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'error':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          icon: 'text-red-500',
          title: 'text-black',
          message: 'text-gray-700',
          iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          icon: 'text-orange-600',
          title: 'text-black',
          message: 'text-orange-800',
          iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.936-.833-2.707 0L3.107 16.5c-.77.833.192 2.5 1.732 2.5z'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          title: 'text-black',
          message: 'text-gray-700',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  };

  if (!isVisible) return null;

  const styles = getTypeStyles();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`
        ${isShowing ? 'animate-slide-in-right' : 'animate-slide-out-right'}
        ${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4
      `}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.iconPath} />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-medium ${styles.title}`}>
                {title}
              </h3>
            )}
            {message && (
              <p className={`${title ? 'mt-1' : ''} text-sm ${styles.message}`}>
                {message}
              </p>
            )}
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleClose}
                className={`
                  inline-flex rounded-md p-1.5 transition-colors
                  ${styles.icon} hover:bg-black hover:bg-opacity-10
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-50
                `}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for managing notifications
export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = (type, title, message, duration = 5000) => {
    setNotification({ type, title, message, duration });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const NotificationComponent = () => notification ? (
    <Notification
      type={notification.type}
      title={notification.title}
      message={notification.message}
      isVisible={!!notification}
      onClose={hideNotification}
      duration={notification.duration}
    />
  ) : null;

  return {
    showSuccess: (title, message, duration) => showNotification('success', title, message, duration),
    showError: (title, message, duration) => showNotification('error', title, message, duration),
    showWarning: (title, message, duration) => showNotification('warning', title, message, duration),
    showInfo: (title, message, duration) => showNotification('info', title, message, duration),
    hideNotification,
    NotificationComponent
  };
};

export default Notification;
