import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
);

export async function POST(req: Request) {
  try {
    const { messages, role, description } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are Rehan, an elite Technical Interviewer.
        Context: ${role} position. ${description}

        STRICT FLOW PROTOCOL:
        1. First message: Ask "Are you ready to begin?"
        2. If user says No/Negative: Respond kindly, "No issue, just let me know when you're ready to begin." and STOP.
        3. If user says Yes/Positive: Respond with "Great! Before we dive into the technicals, tell me a bit about yourself—your name and a brief background."
        4. After they intro: Acknowledge it warmly, say "I'm your interviewer today, you can call me Rehan," then transition into the first technical question.
        5. Keep track of progress. After 10 technical questions, wrap up.`,
    });

    // FILTER: Remove the very first 'model' welcome message from the history
    // because Gemini requires history to start with 'user'.
    const history = messages
      .filter((m: any, index: number) => !(index === 0 && m.role === "model"))
      .map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    // The current prompt is the last message sent by the user
    const lastUserMessage = messages[messages.length - 1].content;

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(lastUserMessage);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ content: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check if it's a Quota/Exhaustion error
    if (error.message?.includes("429") || error.status === 429) {
      return NextResponse.json(
        { error: "API_QUOTA_EXHAUSTED", message: "System Uplink Saturated. The AI Interrogator is currently at capacity. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Neural Link Failure. Please check your connection." },
      { status: 500 }
    );
  }
}
