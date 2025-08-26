// Tale Forge - AI Telemetry and Monitoring
// Tracks AI provider usage, performance, and reliability

export interface TelemetryEvent {
  timestamp: string;
  functionName: string;
  provider: string;
  status: 'success' | 'failure' | 'fallback' | 'retry';
  responseTimeMs: number;
  tokenUsage?: number;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
}

export interface ProviderStats {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  fallbackRequests: number;
  retryRequests: number;
  avgResponseTime: number;
  totalTokens: number;
  successRate: number;
}

// In-memory telemetry storage (could be extended to external service)
const telemetryBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

export class AITelemetry {
  private functionName: string;
  
  constructor(functionName: string) {
    this.functionName = functionName;
  }
  
  // Log telemetry event
  log(event: Omit<TelemetryEvent, 'timestamp' | 'functionName'>): void {
    const telemetryEvent: TelemetryEvent = {
      timestamp: new Date().toISOString(),
      functionName: this.functionName,
      ...event
    };
    
    // Add to buffer
    telemetryBuffer.push(telemetryEvent);
    
    // Rotate buffer if it gets too large
    if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
      telemetryBuffer.shift();
    }
    
    // Console log for immediate visibility
    this.logToConsole(telemetryEvent);
    
    // Future: Send to external monitoring
    // await this.sendToExternalService(telemetryEvent);
  }
  
  private logToConsole(event: TelemetryEvent): void {
    const statusEmoji = this.getStatusEmoji(event.status);
    const logLevel = event.status === 'failure' ? 'error' : 'log';
    
    console[logLevel](`${statusEmoji} AI Telemetry [${event.functionName}]`, {
      provider: event.provider,
      status: event.status,
      responseTime: `${event.responseTimeMs}ms`,
      tokens: event.tokenUsage || 'N/A',
      error: event.errorMessage || undefined
    });
  }
  
  private getStatusEmoji(status: TelemetryEvent['status']): string {
    switch (status) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'fallback': return '🔄';
      case 'retry': return '⏰';
      default: return '📊';
    }
  }
}

// Performance timer for measuring AI response times
export class PerformanceTimer {
  private startTime: number;
  private provider: string;
  private telemetry: AITelemetry;
  
  constructor(provider: string, telemetry: AITelemetry) {
    this.startTime = Date.now();
    this.provider = provider;
    this.telemetry = telemetry;
  }
  
  // Stop timer and log success
  success(tokenUsage?: number): number {
    const responseTime = Date.now() - this.startTime;
    
    this.telemetry.log({
      provider: this.provider,
      status: 'success',
      responseTimeMs: responseTime,
      tokenUsage
    });
    
    return responseTime;
  }
  
  // Stop timer and log failure
  failure(error: string): number {
    const responseTime = Date.now() - this.startTime;
    
    this.telemetry.log({
      provider: this.provider,
      status: 'failure',
      responseTimeMs: responseTime,
      errorMessage: error
    });
    
    return responseTime;
  }
  
  // Log fallback usage
  fallback(error: string): number {
    const responseTime = Date.now() - this.startTime;
    
    this.telemetry.log({
      provider: this.provider,
      status: 'fallback',
      responseTimeMs: responseTime,
      errorMessage: error
    });
    
    return responseTime;
  }
  
  // Log retry attempt
  retry(attempt: number): void {
    const currentTime = Date.now() - this.startTime;
    
    this.telemetry.log({
      provider: this.provider,
      status: 'retry',
      responseTimeMs: currentTime,
      errorMessage: `Retry attempt ${attempt}`
    });
  }
}

// Get telemetry statistics
export function getTelemetryStats(timeWindow?: number): ProviderStats[] {
  const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
  
  const relevantEvents = telemetryBuffer.filter(event => {
    return new Date(event.timestamp).getTime() > cutoffTime;
  });
  
  // Group by provider
  const providerGroups = relevantEvents.reduce((acc, event) => {
    if (!acc[event.provider]) {
      acc[event.provider] = [];
    }
    acc[event.provider].push(event);
    return acc;
  }, {} as Record<string, TelemetryEvent[]>);
  
  // Calculate stats for each provider
  return Object.entries(providerGroups).map(([provider, events]) => {
    const totalRequests = events.length;
    const successfulRequests = events.filter(e => e.status === 'success').length;
    const failedRequests = events.filter(e => e.status === 'failure').length;
    const fallbackRequests = events.filter(e => e.status === 'fallback').length;
    const retryRequests = events.filter(e => e.status === 'retry').length;
    
    const avgResponseTime = events.reduce((sum, e) => sum + e.responseTimeMs, 0) / totalRequests;
    const totalTokens = events.reduce((sum, e) => sum + (e.tokenUsage || 0), 0);
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    
    return {
      provider,
      totalRequests,
      successfulRequests,
      failedRequests,
      fallbackRequests,
      retryRequests,
      avgResponseTime: Math.round(avgResponseTime),
      totalTokens,
      successRate: Math.round(successRate * 100) / 100
    };
  });
}

// Log provider health check
export function logProviderHealth(provider: string, isHealthy: boolean, responseTime: number): void {
  console.log(`🏥 Provider Health Check: ${provider}`, {
    status: isHealthy ? 'healthy' : 'unhealthy',
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString()
  });
}

// Clear telemetry buffer (for testing/cleanup)
export function clearTelemetryBuffer(): void {
  telemetryBuffer.length = 0;
  console.log('🧹 Telemetry buffer cleared');
}

// Get current buffer size
export function getTelemetryBufferSize(): number {
  return telemetryBuffer.length;
}