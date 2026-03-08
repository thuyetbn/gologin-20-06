import console from "node:console";
import { tokenService } from "../services/token-service.js";

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain types of errors
      if (error.message?.includes('unauthorized') ||
        error.message?.includes('401') ||
        error.message?.includes('invalid token') ||
        error.message?.includes('Profile name is required')) {
        throw error;
      }

      // Special handling for browser connection errors
      if (error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('EADDRINUSE') ||
        error.message?.includes('port')) {
        console.log(`🔌 Browser connection issue detected: ${error.message}`);

        if (attempt < maxRetries) {
          const extraDelay = 2000;
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000 + extraDelay;
          console.log(`${errorMessage} (attempt ${attempt}/${maxRetries}). Browser needs more time, retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`${errorMessage} (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${errorMessage} after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

/**
 * Retry GoLogin operations with token rotation.
 * Each retry uses a different token from the pool.
 */
export async function retryWithTokenRotation<T>(
  operation: (token: string) => Promise<T>,
  errorMessage: string = 'GoLogin operation failed'
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  await tokenService.resetTokenRotation();

  const tokenCount = await tokenService.getTokenCount();

  if (tokenCount === 0) {
    throw new Error('No GoLogin tokens configured. Please add tokens in Settings.');
  }

  for (let attempt = 1; attempt <= tokenCount; attempt++) {
    const currentToken = await tokenService.getCurrentToken();

    if (!currentToken) {
      throw new Error('No GoLogin tokens available. Please add tokens in Settings.');
    }

    try {
      console.log(`🚀 Attempting: ${errorMessage} (token ${attempt}/${tokenCount})`);
      return await operation(currentToken);
    } catch (error: any) {
      lastError = error;

      console.error(`❌ Token attempt ${attempt} failed:`, error.message);

      if (error.message?.includes('Profile name is required') ||
        error.message?.includes('Invalid profile data')) {
        throw error;
      }

      if (attempt === tokenCount) {
        break;
      }

      await tokenService.rotateToNextToken();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`${errorMessage} after trying all ${tokenCount} tokens. Last error: ${lastError.message}`);
}
