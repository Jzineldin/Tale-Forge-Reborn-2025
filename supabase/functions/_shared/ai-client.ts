// Tale Forge - AI Client with Retry Logic
// Handles AI API calls with intelligent retry and fallback mechanisms

import { AIProvider } from './ai-config.ts';
import { AITelemetry, PerformanceTimer } from './telemetry.ts';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface AIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens: number;
  temperature: number;
}

export interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2
};

export class AIClient {
  private telemetry: AITelemetry;
  private retryConfig: RetryConfig;
  
  constructor(functionName: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.telemetry = new AITelemetry(functionName);
    this.retryConfig = retryConfig;
  }
  
  // Make AI request with retry logic
  async makeRequest(
    provider: AIProvider,
    request: AIRequest,
    authHeader: string
  ): Promise<AIResponse> {
    const timer = new PerformanceTimer(provider.name, this.telemetry);
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          timer.retry(attempt);
          
          // Calculate exponential backoff delay
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          
          console.log(`⏰ Retrying ${provider.name} request in ${delay}ms (attempt ${attempt}/${this.retryConfig.maxRetries})`);
          await this.sleep(delay);
        }
        
        const response = await this.makeHttpRequest(provider, request, authHeader);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json() as AIResponse;
        
        // Log success
        const tokenUsage = data.usage?.total_tokens;
        timer.success(tokenUsage);
        
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a retryable error
        if (!this.isRetryableError(error as Error) || attempt === this.retryConfig.maxRetries) {
          timer.failure(lastError.message);
          throw lastError;
        }
        
        console.log(`🔄 ${provider.name} request failed, will retry: ${lastError.message}`);
      }
    }
    
    // This should never be reached, but TypeScript needs it
    timer.failure(lastError?.message || 'Unknown error');
    throw lastError || new Error('Unexpected error in retry logic');
  }
  
  // Make AI request with fallback to secondary provider
  async makeRequestWithFallback(
    primaryProvider: AIProvider,
    fallbackProvider: AIProvider,
    request: AIRequest,
    getPrimaryAuthHeader: () => string,
    getFallbackAuthHeader: () => string
  ): Promise<{ response: AIResponse; usedProvider: AIProvider }> {
    
    try {
      const response = await this.makeRequest(primaryProvider, request, getPrimaryAuthHeader());
      return { response, usedProvider: primaryProvider };
      
    } catch (primaryError) {
      console.log(`⚠️ Primary provider ${primaryProvider.name} failed, trying fallback ${fallbackProvider.name}...`);
      
      // Log the fallback usage
      const primaryTimer = new PerformanceTimer(primaryProvider.name, this.telemetry);
      primaryTimer.fallback((primaryError as Error).message);
      
      try {
        // Adapt request for fallback provider if needed
        const fallbackRequest = this.adaptRequestForProvider(request, fallbackProvider);
        const response = await this.makeRequest(fallbackProvider, fallbackRequest, getFallbackAuthHeader());
        
        console.log(`✅ Fallback provider ${fallbackProvider.name} succeeded`);
        return { response, usedProvider: fallbackProvider };
        
      } catch (fallbackError) {
        console.error(`❌ Both providers failed. Primary: ${(primaryError as Error).message}, Fallback: ${(fallbackError as Error).message}`);
        throw new Error(
          `Both AI providers failed. Primary (${primaryProvider.name}): ${(primaryError as Error).message}. ` +
          `Fallback (${fallbackProvider.name}): ${(fallbackError as Error).message}`
        );
      }
    }
  }
  
  private async makeHttpRequest(
    provider: AIProvider,
    request: AIRequest,
    authHeader: string
  ): Promise<Response> {
    return fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(request)
    });
  }
  
  // Determine if an error is worth retrying
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Rate limiting or temporary server errors - worth retrying
    if (message.includes('429') || message.includes('rate limit')) return true;
    if (message.includes('502') || message.includes('503') || message.includes('504')) return true;
    if (message.includes('timeout') || message.includes('network')) return true;
    if (message.includes('connection')) return true;
    
    // Authentication or client errors - don't retry
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) return false;
    if (message.includes('400') || message.includes('bad request')) return false;
    if (message.includes('404') || message.includes('not found')) return false;
    
    // Unknown errors - be conservative and don't retry
    return false;
  }
  
  // Adapt request parameters for different providers
  private adaptRequestForProvider(request: AIRequest, provider: AIProvider): AIRequest {
    const adapted = { ...request };
    
    // Provider-specific adaptations
    switch (provider.name) {
      case 'OVH':
        // OVH Llama might have different parameter expectations
        adapted.model = provider.model;
        adapted.max_tokens = Math.min(request.max_tokens, provider.maxTokens);
        break;
        
      case 'OpenAI':
        adapted.model = provider.model;
        adapted.max_tokens = Math.min(request.max_tokens, provider.maxTokens);
        break;
        
      default:
        adapted.model = provider.model;
        adapted.max_tokens = provider.maxTokens;
    }
    
    return adapted;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Get telemetry stats for this client
  getTelemetryStats() {
    return this.telemetry;
  }
}