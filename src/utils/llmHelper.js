import Groq from 'groq-sdk';

/**
 * LLM Helper for categorizing customer support messages
 * Using Groq API for AI-powered categorization
 */

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser-based calls (not recommended for production!)
});

/**
 * Categorize a customer support message using Groq AI
 * 
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, reasoning: string}>}
 */
export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Analyze this customer support message and provide:
1. Category (Billing Issue, Technical Problem, Feature Request, or General Inquiry)
2. Urgency (High, Medium, or Low)
3. Suggested Response (Draft a reply to the customer)
4. Reasoning (Brief explanation)

Tone Instructions for Suggested Response:
- Warm, empathetic, and strictly non-generic.
- Must convey that we are committed to resolving the issue with them.
- Start with a personalized opening.
- Avoid dismissive phrases like "we will look into it".
- Use assuring language like "I will personally track this until it is resolved".

Format your response exactly like this:
Category: [Category]
Urgency: [Urgency]
Suggested Response: [Suggested Response]
Reasoning: [Reasoning]

Message: ${message}`
        }
      ],
      temperature: 0.3, // Lower temperature for more deterministic formatting
    });

    const content = response.choices[0].message.content;

    // Parse the response
    const categoryMatch = content.match(/Category:\s*(.+)/i);
    const urgencyMatch = content.match(/Urgency:\s*(.+)/i);
    const responseMatch = content.match(/Suggested Response:\s*(.+?)(?=\nReasoning:|$)/s);
    const reasoningMatch = content.match(/Reasoning:\s*(.+)/s);

    let category = categoryMatch ? categoryMatch[1].trim() : "General Inquiry";
    let urgency = urgencyMatch ? urgencyMatch[1].trim() : "Medium";
    let suggestedResponse = responseMatch ? responseMatch[1].trim() : "Thank you for contacting us. We have received your message and will get back to you shortly.";
    let reasoning = reasoningMatch ? reasoningMatch[1].trim() : content;

    // Normalize category if needed
    if (category.toLowerCase().includes('billing')) category = "Billing Issue";
    else if (category.toLowerCase().includes('technical') || category.toLowerCase().includes('bug')) category = "Technical Problem";
    else if (category.toLowerCase().includes('feature')) category = "Feature Request";
    else if (category.toLowerCase().includes('inquiry') || category.toLowerCase().includes('question')) category = "General Inquiry";

    // Normalize urgency
    if (urgency.toLowerCase().includes('high')) urgency = "High";
    else if (urgency.toLowerCase().includes('low')) urgency = "Low";
    else urgency = "Medium";

    return {
      category,
      urgency,
      suggestedResponse,
      reasoning
    };
  } catch (error) {
    console.warn('Groq API failed, using mock response:', error.message);
    return getMockCategorization(message);
  }
}

/**
 * Mock categorization for when API is unavailable
 */
function getMockCategorization(message) {
  const lowerMessage = message.toLowerCase();

  // Array of possible reasoning variations for each category
  const reasoningVariations = {
    billing: [
      "Based on keywords related to payments and billing, this appears to be a billing-related inquiry. The customer may need assistance with account charges or payment issues.",
      "This message contains billing terminology. The customer is likely experiencing issues with payments, invoices, or account charges.",
      "The message references financial matters related to the customer's account. This suggests a billing or payment concern that requires attention.",
    ],
    technical: [
      "This message describes technical difficulties or system errors. The customer is reporting functionality issues that may require engineering review.",
      "Based on error-related keywords, this appears to be a technical support issue. The customer is experiencing problems with product functionality.",
      "The message indicates a technical problem or bug. This requires investigation from the technical support team.",
      "System-related issues are mentioned in this message. The customer needs technical assistance to resolve functionality problems.",
    ],
    feature: [
      "This message suggests improvements or new functionality. The customer is providing product feedback and feature suggestions.",
      "The customer is requesting enhancements to the product. This appears to be a feature request that should be reviewed by the product team.",
      "Based on the language used, this seems to be a suggestion for product improvements rather than a support issue.",
    ],
    inquiry: [
      "This appears to be a general question about the product or service. The customer is seeking information or clarification.",
      "The message contains questions that don't indicate a specific problem. This is likely a general inquiry requiring informational support.",
      "Based on the question format, this seems to be an information request rather than a technical or billing issue.",
    ],
    positive: [
      "This message contains positive sentiment and appreciation. While not a support request, it may warrant acknowledgment.",
      "The customer is expressing satisfaction or gratitude. This doesn't appear to require immediate support action.",
    ],
    ambiguous: [
      "The message content is unclear or doesn't match standard support categories. Manual review may be needed for proper categorization.",
      "This message doesn't contain clear indicators for automatic categorization. Human review recommended.",
    ]
  };

  // Helper to get random reasoning
  const getRandomReasoning = (category) => {
    const reasons = reasoningVariations[category];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  // Helper to get random suggested response
  const getMockResponse = (category) => {
    const responses = {
      billing: [
        "Hi there, thanks for reaching out. I understand how frustrating billing issues can be, and I want to help get this sorted out for you right away. I'm going to personally look into your account details to see exactly what happened here.",
        "Hello! I appreciate you bringing this charge to our attention. I know it's stressful to see unexpected items on your bill. I'm reviewing your transaction history now and will ensure we make this right for you.",
      ],
      technical: [
        "Hello, thanks for reporting this. I'm so sorry you're dealing with these technical difficulties—I know how disruptive that is to your day. I've already flagged this for our engineering team and will personally track its progress until it's fixed.",
        "Hi there. I completely understand your frustration with this error. We are 100% committed to reliability, so I'm making this my top priority. I will work with our tech team to get you back up and running as quickly as possible.",
      ],
      feature: [
        "Hi! Thank you so much for sharing this idea. We love hearing from users who care about making our product better. I've passed this directly to our product team, and I really appreciate you taking the time to help us improve.",
        "Hello! That is a fantastic suggestion. We are always looking for ways to enhance the user experience, and your feedback is incredibly valuable. I've added this to our feature request board for serious consideration.",
      ],
      inquiry: [
        "Hi there! Thanks for asking about this. I'm happy to help clear things up for you. Here is the information you're looking for, and please let me know if there's anything else I can explain!",
        "Hello! I'd be delighted to assist you with your question. We want to make sure you have everything you need to succeed. Here are the details you requested.",
      ],
      positive: [
        "Hi! reading this made my day. Thank you so much for your kind words! We work hard to provide the best service possible, and it means the world to us to know we're hitting the mark. I'll share this with the whole team!",
      ],
      ambiguous: [
        "Hello, thanks for contacting us. I want to make sure I fully understand how to help you best. Could you please provide a little more detail? I'm here to assist you until this is resolved.",
      ]
    };

    // Default to inquiry if category not found
    const categoryResponses = responses[category] || responses['inquiry'];
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  };

  // Billing-related detection
  if (lowerMessage.includes('bill') || lowerMessage.includes('payment') ||
    lowerMessage.includes('charge') || lowerMessage.includes('invoice') ||
    lowerMessage.includes('credit card') || lowerMessage.includes('subscription') ||
    lowerMessage.includes('refund') || lowerMessage.includes('cancel') && lowerMessage.includes('account')) {
    return {
      category: "Billing Issue",
      urgency: "Medium",
      suggestedResponse: getMockResponse('billing'),
      reasoning: getRandomReasoning('billing')
    };
  }

  // Technical problem detection
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') ||
    lowerMessage.includes('broken') || lowerMessage.includes('not working') ||
    lowerMessage.includes('crash') || lowerMessage.includes('down') ||
    lowerMessage.includes('server') || lowerMessage.includes('loading') ||
    lowerMessage.includes('slow') || lowerMessage.includes('issue') ||
    lowerMessage.includes('problem') && !lowerMessage.includes('no problem')) {
    return {
      category: "Technical Problem",
      urgency: lowerMessage.includes('server') || lowerMessage.includes('down') ? "High" : "Medium",
      suggestedResponse: getMockResponse('technical'),
      reasoning: getRandomReasoning('technical')
    };
  }

  // Feature request detection
  if (lowerMessage.includes('feature') || lowerMessage.includes('add') && (lowerMessage.includes('please') || lowerMessage.includes('could')) ||
    lowerMessage.includes('improve') || lowerMessage.includes('would like to see') ||
    lowerMessage.includes('suggestion') || lowerMessage.includes('wish') ||
    lowerMessage.includes('could you') && lowerMessage.includes('add') ||
    lowerMessage.includes('enhancement') || lowerMessage.includes('would be great')) {
    return {
      category: "Feature Request",
      urgency: "Low",
      suggestedResponse: getMockResponse('feature'),
      reasoning: getRandomReasoning('feature')
    };
  }

  // Positive feedback detection
  if ((lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) &&
    !lowerMessage.includes('but') && !lowerMessage.includes('however')) {
    return {
      category: "General Inquiry",
      urgency: "Low",
      suggestedResponse: getMockResponse('positive'),
      reasoning: getRandomReasoning('positive')
    };
  }

  // Question/inquiry detection
  if (lowerMessage.includes('how') || lowerMessage.includes('what') ||
    lowerMessage.includes('when') || lowerMessage.includes('where') ||
    lowerMessage.includes('can i') || lowerMessage.includes('is there') ||
    lowerMessage.includes('?')) {
    return {
      category: "General Inquiry",
      urgency: "Low",
      suggestedResponse: getMockResponse('inquiry'),
      reasoning: getRandomReasoning('inquiry')
    };
  }

  // Fallback for ambiguous messages
  return {
    category: "General Inquiry",
    urgency: "Low",
    suggestedResponse: getMockResponse('ambiguous'),
    reasoning: getRandomReasoning('ambiguous')
  };
}
