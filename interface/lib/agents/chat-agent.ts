export async function chatAgent(prompt: string) {
    return {
        response: "I can help you with building and customizing your landing page. You can ask me about specific components, available commands, or how to make changes. What would you like to know? Here are some examples of what you can do: - \"update hero headline to 'My New Headline'\" - \"add a FAQ section\" - \"what templates are available for the features section?\"",
        reasoning: 'The user asked a general question, so I am responding as a chatbot.',
        success: true,
    };
} 