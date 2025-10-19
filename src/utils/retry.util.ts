/**
 * Retry utility with exponential backoff for handling API rate limits and transient errors
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryCondition?: (error: any) => boolean;
}

export class RetryUtil {
    private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffMultiplier: 2,
        retryCondition: (error: any) => {
            // Retry on rate limiting, network errors, and transient errors
            if (error.message) {
                const message = error.message.toLowerCase();
                return (
                    message.includes('rate limit') ||
                    message.includes('request limit') ||
                    message.includes('throttle') ||
                    message.includes('temporary') ||
                    message.includes('transient') ||
                    message.includes('network') ||
                    message.includes('timeout') ||
                    message.includes('econnreset') ||
                    message.includes('enotfound')
                );
            }
            return false;
        }
    };

    /**
     * Execute a function with retry logic and exponential backoff
     */
    static async executeWithRetry<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        let lastError: any;

        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                // Don't retry if it's the last attempt or if retry condition is not met
                if (attempt === opts.maxRetries || !opts.retryCondition(error)) {
                    throw error;
                }

                // Calculate delay with exponential backoff and jitter
                const delay = Math.min(
                    opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt) + Math.random() * 1000,
                    opts.maxDelay
                );

                console.log(`Retry ${attempt + 1}/${opts.maxRetries} after ${Math.round(delay)}ms - ${error instanceof Error ? error.message : String(error)}`);

                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Check if an error is a Facebook API rate limit error
     */
    static isFacebookRateLimitError(error: any): boolean {
        if (!error || typeof error !== 'object' || !error.message) return false;

        const message = error.message.toLowerCase();
        return (
            message.includes('application request limit reached') ||
            message.includes('rate limit') ||
            message.includes('oauth exception') ||
            message.includes('code 4') ||
            message.includes('is_transient')
        );
    }

    /**
     * Check if an error is a Facebook API transient error
     */
    static isFacebookTransientError(error: any): boolean {
        if (!error || typeof error !== 'object' || !error.message) return false;

        const message = error.message.toLowerCase();
        return (
            message.includes('temporary') ||
            message.includes('transient') ||
            message.includes('service unavailable') ||
            message.includes('internal server error')
        );
    }

    /**
     * Get retry delay for Facebook API errors
     */
    static getFacebookRetryDelay(attempt: number, error?: any): number {
        // For rate limit errors, use longer delays
        if (error && this.isFacebookRateLimitError(error)) {
            // Start with 5 seconds for rate limit errors
            return Math.min(5000 * Math.pow(2, attempt) + Math.random() * 2000, 60000);
        }

        // For other errors, use standard exponential backoff
        return Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
    }

    /**
     * Sleep for specified milliseconds
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
