export class Logger {
    static info(message: string, data?: any): void {
        console.log(`✅ ${message}`);
    }

    static error(message: string, error?: any): void {
        console.error(`❌ ${message}`);
    }

    static warn(message: string, data?: any): void {
        console.warn(`⚠️ ${message}`);
    }

    static debug(message: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`🔍 ${message}`);
        }
    }
}

