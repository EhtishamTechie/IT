// Production Logger - Only logs errors and critical info
const logger = {
  info: (message, data = null) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data || '');
    }
  },
  
  warn: (message, data = null) => {
    console.warn(message, data || '');
  },
  
  error: (message, error = null) => {
    console.error(message, error || '');
    
    // In production, you might want to send to error tracking service
    // if (process.env.NODE_ENV === 'production') {
    //   // Send to Sentry, LogRocket, etc.
    // }
  },
  
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 DEBUG: ${message}`, data || '');
    }
  }
};

module.exports = logger;
