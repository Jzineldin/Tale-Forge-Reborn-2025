// Tale Forge - AI Provider Health Checks
// Monitors AI provider availability and performance on function startup

import { AI_CONFIG, AIProvider, checkProviderAvailability, getAuthHeader } from './ai-config.ts';
import { logProviderHealth } from './telemetry.ts';

export interface HealthCheckResult {
  provider: string;
  isHealthy: boolean;
  responseTimeMs: number;
  error?: string;
  timestamp: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  textProviders: HealthCheckResult[];
  imageProviders: HealthCheckResult[];
  timestamp: string;
}

export class HealthChecker {
  private readonly timeout = 5000; // 5 second timeout for health checks
  
  // Perform comprehensive health check on startup
  async performStartupHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Starting AI provider health checks...');
    
    const textProviders = await Promise.all([
      this.checkProvider(AI_CONFIG.text.primary),
      this.checkProvider(AI_CONFIG.text.fallback)
    ]);
    
    const imageProviders = await Promise.all([
      this.checkProvider(AI_CONFIG.image.primary)
    ]);
    
    const allResults = [...textProviders, ...imageProviders];
    const healthyCount = allResults.filter(r => r.isHealthy).length;
    const totalCount = allResults.length;
    
    let overall: SystemHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    const systemHealth: SystemHealth = {
      overall,
      textProviders,
      imageProviders,
      timestamp: new Date().toISOString()
    };
    
    this.logSystemHealth(systemHealth);
    return systemHealth;
  }
  
  // Check individual provider health
  async checkProvider(provider: AIProvider): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // First check if provider is configured
      if (!checkProviderAvailability(provider)) {
        const result: HealthCheckResult = {
          provider: provider.name,
          isHealthy: false,
          responseTimeMs: 0,
          error: 'API key not configured or invalid',
          timestamp: new Date().toISOString()
        };
        
        logProviderHealth(provider.name, false, 0);
        return result;
      }
      
      // Perform actual health check based on provider type
      const isHealthy = await this.performProviderHealthCheck(provider);
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        provider: provider.name,
        isHealthy,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString()
      };
      
      logProviderHealth(provider.name, isHealthy, responseTime);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        provider: provider.name,
        isHealthy: false,
        responseTimeMs: responseTime,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
      
      logProviderHealth(provider.name, false, responseTime);
      return result;
    }
  }
  
  private async performProviderHealthCheck(provider: AIProvider): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      let response: Response;
      
      // Different health check endpoints for different providers
      switch (provider.name) {
        case 'OpenAI':
          response = await fetch(`${provider.baseUrl}/models`, {
            method: 'GET',
            headers: {
              'Authorization': getAuthHeader(provider),
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          break;
          
        case 'OVH':
          response = await fetch(`${provider.baseUrl}/models`, {
            method: 'GET',
            headers: {
              'Authorization': getAuthHeader(provider),
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          break;
          
        case 'OVH_SDXL':
          // For SDXL, we'll do a simple health check to the base endpoint
          response = await fetch(provider.baseUrl, {
            method: 'GET',
            headers: {
              'Authorization': getAuthHeader(provider)
            },
            signal: controller.signal
          });
          break;
          
        default:
          throw new Error(`Unknown provider type: ${provider.name}`);
      }
      
      clearTimeout(timeoutId);
      
      // Consider provider healthy if it responds with 2xx or even 405 (method not allowed)
      // Some endpoints might not support GET but still indicate the service is running
      return response.status < 500 && response.status !== 401 && response.status !== 403;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Health check timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
  
  private logSystemHealth(health: SystemHealth): void {
    const healthEmoji = this.getHealthEmoji(health.overall);
    console.log(`${healthEmoji} System Health Check Complete - Overall: ${health.overall.toUpperCase()}`);
    
    // Log text providers
    console.log('📝 Text Providers:');
    health.textProviders.forEach(provider => {
      const emoji = provider.isHealthy ? '✅' : '❌';
      const error = provider.error ? ` (${provider.error})` : '';
      console.log(`  ${emoji} ${provider.provider}: ${provider.responseTimeMs}ms${error}`);
    });
    
    // Log image providers
    console.log('🖼️ Image Providers:');
    health.imageProviders.forEach(provider => {
      const emoji = provider.isHealthy ? '✅' : '❌';
      const error = provider.error ? ` (${provider.error})` : '';
      console.log(`  ${emoji} ${provider.provider}: ${provider.responseTimeMs}ms${error}`);
    });
    
    // Provide recommendations based on health
    this.logHealthRecommendations(health);
  }
  
  private logHealthRecommendations(health: SystemHealth): void {
    const unhealthyProviders = [
      ...health.textProviders.filter(p => !p.isHealthy),
      ...health.imageProviders.filter(p => !p.isHealthy)
    ];
    
    if (unhealthyProviders.length === 0) {
      console.log('🎯 All providers healthy - optimal performance expected');
      return;
    }
    
    console.log('💡 Health Recommendations:');
    
    unhealthyProviders.forEach(provider => {
      if (provider.error?.includes('API key')) {
        console.log(`  ⚠️ ${provider.provider}: Check API key configuration`);
      } else if (provider.error?.includes('timeout')) {
        console.log(`  ⚠️ ${provider.provider}: Network or performance issues detected`);
      } else {
        console.log(`  ⚠️ ${provider.provider}: Service may be temporarily unavailable`);
      }
    });
    
    // Warn about fallback scenarios
    const textProvidersHealthy = health.textProviders.filter(p => p.isHealthy).length;
    const imageProvidersHealthy = health.imageProviders.filter(p => p.isHealthy).length;
    
    if (textProvidersHealthy === 0) {
      console.log('🚨 CRITICAL: No text providers available - functions will fail');
    } else if (textProvidersHealthy === 1) {
      console.log('⚠️ WARNING: Only one text provider available - no fallback');
    }
    
    if (imageProvidersHealthy === 0) {
      console.log('🚨 CRITICAL: No image providers available - image generation will fail');
    }
  }
  
  private getHealthEmoji(overall: SystemHealth['overall']): string {
    switch (overall) {
      case 'healthy': return '💚';
      case 'degraded': return '💛';
      case 'unhealthy': return '💔';
      default: return '❓';
    }
  }
}

// Convenience function for startup health checks
export async function performStartupHealthCheck(): Promise<SystemHealth> {
  const checker = new HealthChecker();
  return await checker.performStartupHealthCheck();
}