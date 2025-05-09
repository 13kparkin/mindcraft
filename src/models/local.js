import { strictFormat } from '../utils/text.js';
import settings from '../../settings.js';

const DEFAULT_ENDPOINTS = { 
    chat: '/v1/chat/completions', 
    completions: '/v1/completions', 
    embeddings: '/v1/embeddings', 
    models: '/v1/models' 
};

export class Local {
    constructor(model_name, url, params) {
        this.model_name = model_name;
        this.params = params || {};
        
        // Use environment variables if available, otherwise fall back to settings or default
        const localHost = process.env.OLLAMA_HOST || settings.host || 'localhost';
        const localPort = process.env.OLLAMA_PORT || 11434;
        this.url = url || `http://${localHost}:${localPort}`;
        
        // Initialize endpoints with defaults or from params
        const endpoints = (params && params.endpoints) || {};
        this.chat_endpoint = endpoints.chat || DEFAULT_ENDPOINTS.chat;
        this.embedding_endpoint = endpoints.embeddings || DEFAULT_ENDPOINTS.embeddings;
        this.completion_endpoint = endpoints.completions || DEFAULT_ENDPOINTS.completions;
        this.models_endpoint = endpoints.models || DEFAULT_ENDPOINTS.models;
    }

    /**
     * Checks if Ollama is running and the specified model is available
     * @returns {Promise<{available: boolean, error: string|null, models: Array}>} Status object
     */
    async checkOllamaHealth() {
        try {
            const models = await this.listModels();
            const modelIds = models.map(m => m.id || m.name); // Prioritize ID over name
            const modelAvailable = modelIds.includes(this.model_name);
            
            return {
                available: true,
                error: modelAvailable ? null : `Model '${this.model_name}' not found in available models: ${modelIds.join(', ')}`,
                models: modelIds
            };
        } catch (err) {
            return {
                available: false,
                error: `local modal server unreachable at ${this.url}: ${err.message}`,
                models: []
            };
        }
    }

    async sendRequest(turns, systemMessage) {
        let model = this.model_name || 'llama3.1'; // Updated to llama3.1, as it is more performant than llama3
        let messages = strictFormat(turns);
        messages.unshift({ role: 'system', content: systemMessage });
        
        // We'll attempt up to 5 times for models with deepseek-r1-esk reasoning if the <think> tags are mismatched.
        const maxAttempts = 5;
        let attempt = 0;
        let finalRes = null;

        // Check Ollama health before attempting requests
        const healthCheck = await this.checkOllamaHealth();
        if (!healthCheck.available) {
            console.error(`Ollama health check failed: ${healthCheck.error}`);
            return `Ollama server unavailable: ${healthCheck.error}`;
        }
        
        if (healthCheck.error) {
            console.warn(healthCheck.error);
        }

        while (attempt < maxAttempts) {
            attempt++;
            console.log(`Awaiting local response... (model: ${model}, attempt: ${attempt})`);
            let res = null;
            try {
                const data = await this.send(this.chat_endpoint, {
                    model: model,
                    messages: messages,
                    stream: false,
                    ...(this.params || {})
                });
                console.log(data.choices[0].message, "data choices 0 message");
                let content = '';
                if (data.choices && data.choices.length) {
                    // Try multiple possible content fields with fallbacks
                    content = data.choices[0].message?.content || 
                              data.choices[0].content || 
                              data.choices[0].text || '';
                    
                    // Debug log showing which field was extracted
                    console.log(`Response keys available: ${Object.keys(data.choices[0]).join(', ')}`);
                    if (data.choices[0].message?.content) {
                        console.log('Extracted content from data.choices[0].message.content');
                    } else if (data.choices[0].content) {
                        console.log('Extracted content from data.choices[0].content');
                    } else if (data.choices[0].text) {
                        console.log('Extracted content from data.choices[0].text');
                    }
                }
                
                if (content) {
                    res = content;
                } else {
                    console.error('Failed to extract content from response. Raw data:', JSON.stringify(data, null, 2));
                    res = `Ollama error: No content in response`;
                }
            } catch (err) {
                if (err.message.toLowerCase().includes('context length') && turns.length > 1) {
                    console.log('Context length exceeded, trying again with shorter context.');
                    return await this.sendRequest(turns.slice(1), systemMessage);
                } else {
                    console.error(err);
                    res = `Ollama error: ${err.message}`;
                }
            }

            // If the model name includes "deepseek-r1" or "Andy-3.5-reasoning", then handle the <think> block.
                const hasOpenTag = res.includes("<think>");
                const hasCloseTag = res.includes("</think>");

                // If there's a partial mismatch, retry to get a complete response.
                if ((hasOpenTag && !hasCloseTag)) {
                    console.warn("Partial <think> block detected. Re-generating...");
                    continue; 
                }
            
                // If </think> is present but <think> is not, prepend <think>
                if (hasCloseTag && !hasOpenTag) {
                    res = '<think>' + res;
                }
                // Changed this so if the model reasons, using <think> and </think> but doesn't start the message with <think>, <think> ges prepended to the message so no error occur.
            
                // If both tags appear, remove them (and everything inside).
                if (hasOpenTag && hasCloseTag) {
                    res = res.replace(/<think>[\s\S]*?<\/think>/g, '');
                }

            finalRes = res;
            break; // Exit the loop if we got a valid response.
        }

        if (finalRes == null) {
            console.warn("Could not get a valid <think> block or normal response after max attempts.");
            finalRes = 'I thought too hard, sorry, try again.';
        }
        return finalRes;
    }

    async embed(text) {
        let model = 'text-embedding-nomic-embed-text-v1.5';
        let body = { model: model, input: text };
        let res = await this.send(this.embedding_endpoint, body);
        return res['embedding'];
    }

    async send(endpoint, body) {
        const url = new URL(endpoint, this.url);
        let method = 'POST';
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        
        const requestBody = JSON.stringify(body);
        const request = new Request(url, { method, headers, body: requestBody });
        let data = null;
        
        try {
            console.log(`Sending request to ${url.toString()}`);
            const res = await fetch(request);
            
            if (res.ok) {
                data = await res.json();
            } else {
                // Get response body for better error reporting
                let responseText = '';
                try {
                    responseText = await res.text();
                } catch (e) {
                    responseText = 'Could not read response body';
                }
                
                // Log detailed request and response information
                console.error(`Ollama request failed with status ${res.status}:`);
                console.error(`URL: ${url.toString()}`);
                console.error(`Headers: ${JSON.stringify(Object.fromEntries(headers.entries()))}`);
                console.error(`Request body: ${requestBody.substring(0, 500)}${requestBody.length > 500 ? '...' : ''}`);
                console.error(`Response status: ${res.status} ${res.statusText}`);
                console.error(`Response body: ${responseText}`);
                
                throw new Error(`Ollama HTTP ${res.status}: ${responseText}`);
            }
        } catch (err) {
            console.error(`Failed to send Ollama request to ${url.toString()}`);
            console.error(`Error: ${err.message}`);
            throw err; // Re-throw to handle in the calling function
        }
        
        return data;
    }

    async complete(prompt) {
        const response = await this.send(this.completion_endpoint, {
            model: this.model_name,
            prompt,
            ...this.params
        });
        
        // Apply the same fallback logic as in sendRequest
        const content = response.choices && response.choices.length > 0 ? 
            (response.choices[0].text || response.choices[0].content || '') : '';
            
        if (!content) {
            console.error('Failed to extract content from completion response:', response);
        }
        
        return content;
    }

    async listModels() {
        const url = new URL(this.models_endpoint, this.url);
        try {
            console.log(`Fetching models from ${url.toString()}`);
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                console.log(`Models response: ${JSON.stringify(data, null, 2)}`);
                return data.data || [];
            } else {
                let responseText = '';
                try {
                    responseText = await res.text();
                } catch (e) {
                    responseText = 'Could not read response body';
                }
                
                console.error(`Failed to fetch models list. Status: ${res.status} ${res.statusText}`);
                console.error(`Response: ${responseText}`);
                throw new Error(`Ollama HTTP ${res.status}: ${responseText}`);
            }
        } catch (err) {
            console.error(`Failed to fetch models from ${url.toString()}: ${err.message}`);
            throw err; // Re-throw to propagate to caller
        }
    }
}
