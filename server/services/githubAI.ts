import OpenAI from "openai";

const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-4o";

function getClient(apiKey: string): OpenAI {
  return new OpenAI({ baseURL: endpoint, apiKey: apiKey });
}

export async function getChatCompletion(message: string, conversationHistory: Array<{content: string, isUser: boolean}> = [], apiKey?: string) {
  try {
    // Build messages array for the conversation
    const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
      { 
        role: "system", 
        content: `You are an Evangelical Content Creation Assistant AI.  
Your task is to generate comprehensive, powerful, soul-winning video content.  
Follow this format strictly:  

1. **6 Detailed Image Prompts with Split Voiceover**  
- Generate exactly 6 comprehensive AI image prompts that tell a complete story.  
- Each image should be cinematic, realistic, high-quality, 16:9 aspect ratio.  
- Create a complete 30-second motivational evangelical script inspired by the Bible.
- Split this full script across the 6 images (approximately 5 seconds per image).
- End the final voiceover with a strong call-to-action like "Come to Jesus today" or "There is hope for you in Christ."
- Make each image prompt very detailed and complete.  

2. **Background Music Suggestion**  
- Choose a track from **Pixabay Music**.  
- Suggest the **song title**, **genre**, and **link**.  
- Pick emotional, uplifting, inspirational tracks only.  

3. **Final Output Format**  
Respond in **structured sections**:  

---  
🖼 **6 Image Prompts with Split Voiceover:**  

**Image 1:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [First 5 seconds of the complete 30-second script]  

**Image 2:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [Next 5 seconds of the complete 30-second script]  

**Image 3:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [Next 5 seconds of the complete 30-second script]  

**Image 4:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [Next 5 seconds of the complete 30-second script]  

**Image 5:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [Next 5 seconds of the complete 30-second script]  

**Image 6:**  
Visual: [Detailed, comprehensive image prompt - make it very specific and complete]  
Voiceover: [Final 5 seconds with call-to-action]  

🎵 Background Music:  
- Title: [Song Name]  
- Genre: [Genre]  
- Link: [Pixabay URL]  
---  

Your goal: Help create **comprehensive, soul-winning video content** where the 6 voiceovers form one complete 30-second evangelical message. Make each image prompt very specific, detailed, and complete.`
      }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.isUser ? "user" : "assistant", 
        content: msg.content
      });
    });

    // Add current message
    messages.push({ role: "user", content: message });

    // Use provided API key or fallback to environment variable
    const finalApiKey = apiKey || process.env["GITHUB_TOKEN"];
    if (!finalApiKey) {
      throw new Error("GitHub API key is required (either provided or GITHUB_TOKEN environment variable)");
    }

    const response = await getClient(finalApiKey).chat.completions.create({
      messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 3000,
      model: modelName
    });

    const aiResponse = response.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error("No response from GitHub AI");
    }

    return aiResponse;
  } catch (error: any) {
    console.error("GitHub AI API error:", error);
    
    // Provide more specific error information
    if (error?.status === 401 || error?.message?.includes('unauthorized')) {
      throw new Error("GitHub token is invalid or expired. Please check your API key.");
    } else if (error?.status === 429 || error?.message?.includes('rate limit')) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else if (error?.status === 503 || error?.message?.includes('unavailable')) {
      throw new Error("GitHub AI service is temporarily unavailable. Please try again later.");
    } else if (error?.status === 400 || error?.message?.includes('bad request')) {
      throw new Error("Invalid request format or parameters.");
    } else {
      throw new Error(`GitHub AI API error: ${error?.message || 'Unknown error occurred'}`);
    }
  }
}