import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/config/OpenAiModel";
import { AIDoctorAgents } from "@/shared/list";

export async function POST(req: NextRequest) {
  const { notes } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      messages: [
        { role: "system", content: JSON.stringify(AIDoctorAgents) },
        {
          role: "user",
          content:
            "User Notes/Symptoms: " +
            notes +
            ". Depending on user notes and symptoms, please suggest a list of doctors. Return a JSON array of matching doctors. You MUST include the 'id' field exactly as provided in the system prompt. No text outside JSON.",
        },
      ],
    });

    const rawResp = completion.choices[0].message;
    //@ts-ignore
    const Resp = rawResp.content
      .trim()
      .replace("```json", "")
      .replace("```", "");
    const parsed = JSON.parse(Resp);

    // 🔧 Enrich missing fields using full list
    const enriched = parsed.map((partialDoctor: any) => {
      const full = AIDoctorAgents.find((doc) => doc.id === partialDoctor.id);
      return {
        ...full,
        ...partialDoctor, // allow overrides from LLM if any
      };
    });

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Doctor Suggestion API Error:", e);
    return NextResponse.json(
      { error: "Failed to suggest doctors" },
      { status: 500 }
    );
  }
}
