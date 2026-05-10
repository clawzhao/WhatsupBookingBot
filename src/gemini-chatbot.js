const axios = require('axios');

/**
 * Simple wrapper for Google Gemini API
 * Requires: GOOGLE_GEMINI_API_KEY environment variable
 */
class GeminiChatbot {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  /**
   * Send a message to Gemini and get a response
   * @param {string} userMessage - The user's message
   * @param {string} systemPrompt - Optional system prompt with business context
   * @returns {Promise<string>} The AI response
   */
  async chat(userMessage, systemPrompt = '') {
    try {
      const prompt = systemPrompt 
        ? `${systemPrompt}\n\nUser: ${userMessage}`
        : userMessage;

      const response = await axios.post(
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        },
        { timeout: 10000 }
      );

      const candidates = response.data?.candidates;
      if (!candidates || candidates.length === 0) {
        return null;
      }

      const content = candidates[0]?.content?.parts?.[0]?.text;
      return content || null;
    } catch (error) {
      console.error('[Gemini] Error:', error.message);
      if (error.response?.data?.error?.message) {
        console.error('[Gemini] API Error:', error.response.data.error.message);
      }
      return null;
    }
  }

  /**
   * Send a message using Gemini function-calling (tool use).
   * The AI can invoke tool functions to look up live business data before replying.
   *
   * @param {string} userMessage
   * @param {string} systemPrompt
   * @param {Array}  toolDeclarations  - Gemini function_declarations array
   * @param {Function} toolExecutor    - async (name, args) => result
   * @returns {Promise<string|null>}
   */
  async chatWithTools(userMessage, systemPrompt = '', toolDeclarations = [], toolExecutor = null) {
    try {
      // Build initial payload
      const payload = {
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };

      if (systemPrompt) {
        payload.system_instruction = { parts: [{ text: systemPrompt }] };
      }

      if (toolDeclarations.length > 0 && toolExecutor) {
        payload.tools = [{ function_declarations: toolDeclarations }];
      }

      // Function-calling loop (max 5 rounds to prevent infinite loops)
      for (let round = 0; round < 5; round++) {
        const response = await axios.post(
          `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
          payload,
          { timeout: 15000 }
        );

        const candidates = response.data?.candidates;
        if (!candidates || candidates.length === 0) return null;

        const content = candidates[0]?.content;
        if (!content) return null;

        // Check if Gemini wants to call any tools
        const functionCallParts = (content.parts || []).filter(p => p.functionCall);

        if (functionCallParts.length > 0 && toolExecutor) {
          // Execute all requested tool calls in parallel
          const functionResponses = await Promise.all(
            functionCallParts.map(async part => {
              const { name, args } = part.functionCall;
              const result = await toolExecutor(name, args || {});
              return {
                functionResponse: {
                  name,
                  response: result
                }
              };
            })
          );

          // Append model turn + function results to conversation history, then loop
          payload.contents.push({ role: 'model', parts: content.parts });
          payload.contents.push({ role: 'user', parts: functionResponses });
          continue;
        }

        // No function calls — return the final text answer
        const text = (content.parts || []).find(p => p.text)?.text;
        return text || null;
      }

      return null; // Safety: max rounds exceeded
    } catch (error) {
      console.error('[Gemini:chatWithTools] Error:', error.message);
      if (error.response?.data?.error?.message) {
        console.error('[Gemini:chatWithTools] API Error:', error.response.data.error.message);
      }
      return null;
    }
  }

  /**
   * Generate a system prompt from business config
   * @param {object} config - Business config from restaurant.json (or full config object)
   * @returns {string} System prompt with business context and Q&A database
   */
  static generateSystemPrompt(config) {
    const r = config?.restaurant || config || {};
    
    let prompt = 'You are a helpful AI assistant for a booking service. Your primary role is to provide accurate information about the business and answer customer questions.\n';
    
    if (r.name) {
      prompt += `You work for ${r.name}.\n`;
    }
    
    prompt += '\nBusiness Information:\n';
    
    if (r.name) prompt += `- Name: ${r.name}\n`;
    if (r.phone) prompt += `- Phone: ${r.phone}\n`;
    if (r.email) prompt += `- Email: ${r.email}\n`;
    if (r.address) prompt += `- Address: ${r.address}\n`;
    if (r.website) prompt += `- Website: ${r.website}\n`;
    if (r.timezone) prompt += `- Timezone: ${r.timezone}\n`;
    
    if (r.openingHours && Object.keys(r.openingHours).length > 0) {
      prompt += '\nOpening Hours:\n';
      Object.entries(r.openingHours).forEach(([day, hours]) => {
        prompt += `  ${day}: ${hours.open} - ${hours.close}\n`;
      });
    }
    
    if (r.menu && r.menu.length > 0) {
      prompt += '\nServices Offered:\n';
      const byCategory = {};
      r.menu.forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      });
      Object.entries(byCategory).forEach(([cat, items]) => {
        prompt += `  ${cat}:\n`;
        items.forEach(item => {
          prompt += `    - ${item.name}: $${item.price}\n`;
        });
      });
    }

    // Include coaches
    if (r.coaches && r.coaches.length > 0) {
      prompt += '\nCoaches / Trainers:\n';
      r.coaches.forEach(coach => {
        if (coach.status === 'unavailable') return;
        prompt += `  - ${coach.name}`;
        if (coach.phone) prompt += `, Phone: ${coach.phone}`;
        if (coach.email) prompt += `, Email: ${coach.email}`;
        if (coach.specialties && coach.specialties.length > 0) {
          prompt += `, Specialties: ${coach.specialties.join(', ')}`;
        }
        const workDays = Object.entries(coach.availability || {})
          .filter(([, v]) => v === true)
          .map(([d]) => d)
          .join(', ');
        if (workDays) prompt += `, Available on: ${workDays}`;
        prompt += '\n';
      });
    }

    // Include Q&A knowledge base if available
    if (r.qaDatabase && r.qaDatabase.length > 0) {
      prompt += '\nFrequently Asked Questions & Answers (Answer using these when relevant):\n';
      r.qaDatabase.forEach((qa, idx) => {
        prompt += `\n${idx + 1}. Q: ${qa.question}\n   A: ${qa.answer}\n`;
      });
    }
    
    prompt += '\n\nGuidelines:\n';
    prompt += '- Answer questions about the business, coaches, services, hours, pricing, and bookings\n';
    prompt += '- For coach queries, use the Coaches section above OR call the get_coaches/get_coach_details tools for live data\n';
    prompt += '- Reference the Q&A section above when answering similar questions\n';
    prompt += '- Be professional, friendly, and concise (keep responses under 500 characters)\n';
    prompt += '- For specific booking details, suggest using the booking system or contacting directly\n';
    if (r.phone) {
      prompt += `- If you cannot find the answer, politely say so and provide our phone number: ${r.phone}\n`;
    } else {
      prompt += '- If you cannot find the answer, politely say so and suggest the customer contacts us directly\n';
    }
    
    return prompt;
  }
}

module.exports = GeminiChatbot;

