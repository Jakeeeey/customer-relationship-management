/**
 * Parses technical API errors into user-friendly messages.
 * Specifically handles Directus error formats.
 */
export function parseApiError(error: unknown): string {
    if (!error) return "An unexpected error occurred.";

    let message = "";
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        return "An unexpected system issue occurred.";
    }

    // 1. Attempt to extract and parse JSON (Directus format)
    const jsonMatch = message.match(/\{.*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
                const firstError = parsed.errors[0];
                return translateError(firstError.extensions?.code, firstError.extensions?.field, firstError.message);
            }
        } catch {
            // Parsing failed, proceed to clean the string message
        }
    }

    // 2. Direct string matching for known error codes (Safety fallback)
    if (message.includes("RECORD_NOT_UNIQUE")) return "A duplicate entry already exists in the system.";
    if (message.includes("FORBIDDEN")) return "You do not have permission to perform this action.";
    if (message.includes("INVALID_PAYLOAD")) return "The information provided is invalid.";
    
    // 3. Final cleaning: Remove technical prefixes (Directus, status codes, etc.)
    const cleanMessage = message
        .replace(/^Directus.*failed: \d+ - /i, '') // Remove API specific prefix
        .replace(/^[a-z_]+ failed: \d+ - /i, '')   // Remove generic "action failed" prefix
        .replace(/\d+ - \{.*/i, '')                // Remove trailing JSON starts
        .trim();

    // 4. Security Check: If it still contains JSON braces or technical symbols, return a generic message
    if (cleanMessage.includes('{') || cleanMessage.includes('[') || cleanMessage.includes(':') && cleanMessage.length > 50) {
        return "An unexpected system error occurred. Please try again later.";
    }

    return cleanMessage || "Operation failed.";
}


function translateError(code: string, field: string, originalMessage: string): string {
    switch (code) {
        case 'RECORD_NOT_UNIQUE':
            if (field === 'customer_tin') return "This TIN is already registered to another customer.";
            if (field === 'customer' || !field) return "This customer is already in the system.";
            return `This ${field.replace(/_/g, ' ')} is already taken.`;
        case 'FORBIDDEN':
            return "You don't have the required permissions to perform this action.";
        case 'INVALID_PAYLOAD':
            return "Some information is missing or incorrect. Please review the form.";
        case 'TOKEN_EXPIRED':
            return "Your security session has expired. Please refresh or log in again.";
        case 'INTERNAL_SERVER_ERROR':
            return "The server encountered an issue. Our team has been notified.";
        default:
            // If the original message looks like JSON, don't show it
            if (originalMessage?.includes('{') || originalMessage?.includes('[')) {
                return "An unexpected system error occurred. Please try again later.";
            }
            return originalMessage || "Something went wrong while processing your request.";
    }
}
