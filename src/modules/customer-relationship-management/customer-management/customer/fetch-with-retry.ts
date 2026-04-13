/**
 * A resilient fetch wrapper that implements retries with exponential backoff.
 * Useful for handling transient network stability issues or server timeouts.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            // If it's a server error (5xx), we might want to retry
            if (response.status >= 500 && attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt);
                console.warn(`[fetchWithRetry] Server error ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            return response;
        } catch (err) {
            lastError = err as Error;
            
            // If it's a network error (like fetch failed or socket closed), retry
            if (attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt);
                console.warn(`[fetchWithRetry] Network error: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            break;
        }
    }
    
    throw lastError || new Error(`Failed to fetch from ${url} after ${maxRetries} attempts`);
}
