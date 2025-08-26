// Tale Forge - Centralized AI Configuration
// Shared AI provider configuration and management

export interface AIProvider {
  name: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIConfig {
  text: {
    primary: AIProvider;
    fallback: AIProvider;
  };
  image: {
    primary: AIProvider;
  };
}

export interface AITelemetry {
  provider: string;
  function: string;
  status: 'success' | 'failure' | 'fallback';
  responseTime: number;
  tokenUsage?: number;
  timestamp: string;
}

// AI Configuration - OpenAI primary, OVH fallback for text
export const AI_CONFIG: AIConfig = {
  text: {
    primary: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      maxTokens: 400,
      temperature: 0.7
    },
    fallback: {
      name: 'OVH',
      baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
      model: 'Meta-Llama-3_3-70B-Instruct',
      maxTokens: 400,
      temperature: 0.7
    }
  },
  image: {
    primary: {
      name: 'OVH_SDXL',
      baseUrl: 'https://stable-diffusion-xl.endpoints.kepler.ai.cloud.ovh.net/api',
      model: 'stable-diffusion-xl',
      maxTokens: 0, // Not applicable for image generation
      temperature: 0 // Not applicable for image generation
    }
  }
};

// Provider availability check
export function checkProviderAvailability(provider: AIProvider): boolean {
  switch (provider.name) {
    case 'OpenAI':
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      return !!(openaiKey && !openaiKey.includes('placeholder'));
      
    case 'OVH':
      const ovhKey = Deno.env.get('OVH_AI_ENDPOINTS_ACCESS_TOKEN');
      return !!(ovhKey && !ovhKey.includes('placeholder'));
      
    case 'OVH_SDXL':
      const ovhSdxlKey = Deno.env.get('OVH_AI_ENDPOINTS_ACCESS_TOKEN');
      return !!(ovhSdxlKey && !ovhSdxlKey.includes('placeholder'));
      
    default:
      return false;
  }
}

// Get authentication header for provider
export function getAuthHeader(provider: AIProvider): string {
  switch (provider.name) {
    case 'OpenAI':
      return `Bearer ${Deno.env.get('OPENAI_API_KEY')}`;
      
    case 'OVH':
    case 'OVH_SDXL':
      return `Bearer ${Deno.env.get('OVH_AI_ENDPOINTS_ACCESS_TOKEN')}`;
      
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

// Provider health check
export async function checkProviderHealth(provider: AIProvider): Promise<boolean> {
  try {
    console.log(`🔍 Checking health of ${provider.name}...`);
    
    // Simple health check - attempt to make a minimal request
    const response = await fetch(`${provider.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(provider),
        'Content-Type': 'application/json'
      }
    });
    
    const isHealthy = response.status === 200;
    console.log(`${isHealthy ? '✅' : '❌'} ${provider.name} health check: ${response.status}`);
    
    return isHealthy;
  } catch (error) {
    console.log(`❌ ${provider.name} health check failed:`, error.message);
    return false;
  }
}

// Telemetry logging
export function logAITelemetry(telemetry: AITelemetry): void {
  const logEntry = {
    timestamp: telemetry.timestamp,
    provider: telemetry.provider,
    function: telemetry.function,
    status: telemetry.status,
    responseTime: `${telemetry.responseTime}ms`,
    tokenUsage: telemetry.tokenUsage || 'N/A'
  };
  
  console.log('📊 AI Telemetry:', JSON.stringify(logEntry));
  
  // Future: Send to external monitoring service
  // await sendToMonitoring(telemetry);
}

// Get available text provider (primary first, fallback if needed)
export function getAvailableTextProvider(): AIProvider {
  const primaryAvailable = checkProviderAvailability(AI_CONFIG.text.primary);
  const fallbackAvailable = checkProviderAvailability(AI_CONFIG.text.fallback);
  
  if (primaryAvailable) {
    console.log(`🎯 Using primary text provider: ${AI_CONFIG.text.primary.name}`);
    return AI_CONFIG.text.primary;
  } else if (fallbackAvailable) {
    console.log(`🔄 Using fallback text provider: ${AI_CONFIG.text.fallback.name}`);
    return AI_CONFIG.text.fallback;
  } else {
    throw new Error('No text providers available - check API keys');
  }
}

// Get image provider
export function getImageProvider(): AIProvider {
  const imageProvider = AI_CONFIG.image.primary;
  
  if (!checkProviderAvailability(imageProvider)) {
    throw new Error(`Image provider ${imageProvider.name} not available - check API keys`);
  }
  
  console.log(`🖼️ Using image provider: ${imageProvider.name}`);
  return imageProvider;
}

// Performance timer utility
export class AITimer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  stop(): number {
    return Date.now() - this.startTime;
  }
}