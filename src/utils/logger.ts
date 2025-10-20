export const info = (message: string, data?: any): void => {
    console.log(`✅ ${message}`);
};

export const error = (message: string, error?: any): void => {
    console.error(`❌ ${message}`);
};

export const warn = (message: string, data?: any): void => {
    console.warn(`⚠️ ${message}`);
};

export const debug = (message: string, data?: any): void => {
    if (process.env.NODE_ENV === 'development') {
        console.debug(`🔍 ${message}`);
    }
};

// Also export as Logger object for backward compatibility
export const Logger = {
    info,
    error,
    warn,
    debug
};

