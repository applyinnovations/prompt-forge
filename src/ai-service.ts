/**
 * AI Service for handling model queries and chat completions
 */

import { getApiKeys, updateLastUsedModel } from './api-key-service.js';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface AIProvider {
  name: string;
  baseUrl: string;
  apiKey: string | null;
}

/**
 * Get available models from all configured AI providers
 */
export async function getAvailableModels(): Promise<AIModel[]> {
  const providers = await getConfiguredProviders();
  const allModels: AIModel[] = [];

  for (const provider of providers) {
    try {
      const models = await queryProviderModels(provider);
      allModels.push(...models);
    } catch (error) {
      console.warn(`Failed to query models from ${provider.name}:`, error);
      // Continue with other providers
    }
  }

  return allModels;
}

/**
 * Get configured AI providers with API keys
 */
async function getConfiguredProviders(): Promise<AIProvider[]> {
  const providers: AIProvider[] = [];
  const apiKeys = await getApiKeys(['openai', 'anthropic', 'xai']);

  if (apiKeys.openai) {
    providers.push({
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: apiKeys.openai
    });
  }

  if (apiKeys.anthropic) {
    providers.push({
      name: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: apiKeys.anthropic
    });
  }

  if (apiKeys.xai) {
    providers.push({
      name: 'xai',
      baseUrl: 'https://api.x.ai/v1',
      apiKey: apiKeys.xai
    });
  }

  return providers;
}

/**
 * Query models from a specific provider
 */
async function queryProviderModels(provider: AIProvider): Promise<AIModel[]> {
  switch (provider.name) {
    case 'openai':
      return await queryOpenAIModels(provider);
    case 'anthropic':
      return await queryAnthropicModels(provider);
    case 'xai':
      return await queryXAIModels(provider);
    default:
      return [];
  }
}

/**
 * Query OpenAI models
 */
async function queryOpenAIModels(provider: AIProvider): Promise<AIModel[]> {
  const response = await fetch(`${provider.baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data
    .filter((model: any) => model.id.includes('gpt'))
    .map((model: any) => ({
      id: model.id,
      name: model.id,
      provider: 'openai'
    }));
}

/**
 * Query Anthropic models
 */
async function queryAnthropicModels(provider: AIProvider): Promise<AIModel[]> {
  const response = await fetch(`${provider.baseUrl}/models`, {
    headers: {
      'x-api-key': provider.apiKey!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse Anthropic models response format
  return data.data.map((model: any) => ({
    id: model.id,
    name: model.display_name,
    provider: 'anthropic'
  }));
}

/**
 * Query XAI models
 */
async function queryXAIModels(provider: AIProvider): Promise<AIModel[]> {
  const response = await fetch(`${provider.baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`XAI API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse XAI models response format
  return data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    provider: 'xai'
  }));
}

/**
 * Apply methodology to prompt using AI
 */
export async function applyMethodologyToPrompt(
  originalPrompt: string,
  methodology: any,
  selectedModel: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const providers = await getConfiguredProviders();
  const model = await findModelById(selectedModel, providers);

  if (!model) {
    throw new Error('Selected model not found or not available');
  }

  const provider = providers.find(p => p.name === model.provider);
  if (!provider) {
    throw new Error('Provider not configured');
  }

  // Update last used model
  await updateLastUsedModel(model.provider, selectedModel);

  const aiPrompt = buildAIPrompt(originalPrompt, methodology);

  return await sendAIRequest(provider, model, aiPrompt, onChunk);
}

/**
 * Find model by ID across providers
 */
async function findModelById(modelId: string, providers: AIProvider[]): Promise<AIModel | null> {
  const allModels = await getAvailableModels();
  return allModels.find(model => model.id === modelId) || null;
}

/**
 * Build AI prompt for methodology application
 */
function buildAIPrompt(originalPrompt: string, methodology: any): string {
  let prompt = `Apply the ${methodology.name} methodology to improve and enhance the original text.

Methodology Details:
- Name: ${methodology.name}
- Description: ${methodology.description || 'No description available'}
- Type: ${methodology.type}
- Path: ${methodology.path}`;

  if (methodology.examples) {
    prompt += `\n- Examples: ${methodology.examples}`;
  }

  if (methodology.prompt_samples) {
    prompt += `\n- Sample Prompts: ${methodology.prompt_samples}`;
  }

  prompt += `

Instructions:
Apply this methodology to transform the original text into an improved version. Provide only the enhanced text as your response, without any additional explanation or formatting.

Original text:\n${originalPrompt}`;

  return prompt;
}

/**
 * Send AI request to provider
 */
async function sendAIRequest(
  provider: AIProvider,
  model: AIModel,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  switch (provider.name) {
    case 'openai':
      return await sendOpenAIRequest(provider, model, prompt, onChunk);
    case 'anthropic':
      return await sendAnthropicRequest(provider, model, prompt, onChunk);
    case 'xai':
      return await sendXAIRequest(provider, model, prompt, onChunk);
    default:
      throw new Error('Unsupported provider');
  }
}

/**
 * Send request to OpenAI
 */
async function sendOpenAIRequest(
  provider: AIProvider,
  model: AIModel,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      stream: !!onChunk
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  if (onChunk && response.body) {
    return await handleStreamingResponse(response, onChunk);
  } else {
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

/**
 * Send request to Anthropic
 */
async function sendAnthropicRequest(
  provider: AIProvider,
  model: AIModel,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${provider.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': provider.apiKey!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      stream: !!onChunk
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  if (onChunk && response.body) {
    return await handleAnthropicStreaming(response, onChunk);
  } else {
    const data = await response.json();
    return data.content[0].text;
  }
}

/**
 * Send request to XAI
 */
async function sendXAIRequest(
  provider: AIProvider,
  model: AIModel,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      stream: !!onChunk
    })
  });

  if (!response.ok) {
    throw new Error(`XAI API error: ${response.status}`);
  }

  if (onChunk && response.body) {
    return await handleXAISStreaming(response, onChunk);
  } else {
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

/**
 * Handle streaming response from OpenAI
 */
async function handleStreamingResponse(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Handle streaming response from XAI
 */
async function handleXAISStreaming(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Handle streaming response from Anthropic
 */
async function handleAnthropicStreaming(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data.trim() === '') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullResponse += parsed.delta.text;
            onChunk(parsed.delta.text);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  return fullResponse;
}
