/// <---    This file is for connecting to the llm model and defining the helper function to work with it --->///

import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
    apiKey: process.env.GROKAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });

async function analyzeStudentProfile({
    gpa,
    sat,
    awards,
    activities,
    preferences
  }) {
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
        role: "system",
        content: `
        You are Helix AI, a friendly but highly knowledgeable US college admissions mentor.
        
        Your personality:
        - supportive and conversational
        - insightful and strategic
        - honest but encouraging
        - speaks directly to the student using "you"
        - sounds like a helpful advisor, not a formal report
        
        IMPORTANT RULES:
        - You ONLY analyze the student profile
        - You DO NOT recommend any universities
        - You DO NOT mention specific schools
        - You DO NOT mention non-US education systems
        - A separate system handles school recommendations
        
        STYLE REQUIREMENTS:
        - Speak directly to the student ("you", "your")
        - Sound human and conversational
        - Do NOT summarize what the student already wrote
        - Provide meaningful interpretation and insights
        - Focus on admissions strategy, not just career outcomes
        - Balance encouragement with constructive advice
        `
        },
        {
        role: "user",
        content: `
        Analyze the following student profile for US college admissions.
        
        Student Data:
        GPA: ${gpa}
        SAT: ${sat}
        
        Awards:
        ${awards}
        
        Activities:
        ${activities}
        
        Preferences:
        ${preferences}
        
        YOUR TASK:
        
        1. Identify 2–3 key strengths with insight (not just restating facts)
        2. Identify 2–3 meaningful weaknesses or gaps
        3. Infer intended majors
        4. Evaluate competitiveness for those majors in US admissions
        5. Explain what admissions officers typically look for in those majors
        6. Compare the student profile to those expectations
        7. Provide balanced strategic advice
        8. Maintain a friendly conversational tone
        9. DO NOT recommend any universities
        
        IMPORTANT:
        - Provide deeper analysis, not summaries
        - Avoid generic statements like "you are competitive"
        - Explain WHY something is strong or weak
        - Focus on academic rigor, intellectual depth, and narrative strength
        - Each section should contain thoughtful and reasonably detailed responses
        
        Return STRICT JSON only:
        
        {
          "strengths": [
            "Conversational insight written directly to the student",
            "Another insightful strength",
            "Optional third strength"
          ],
          "weaknesses": [
            "Constructive feedback written conversationally",
            "Another meaningful gap"
          ],
          "inferred_majors": [
            "Major 1",
            "Major 2"
          ],
          "competitiveness_insight": "Friendly explanation of how competitive the student is for these majors in US admissions, including reasoning",
          "academic_admissions_insight": "Explain what US admissions officers look for in these majors and how the student compares",
          "overall_feedback": "Short encouraging but strategic paragraph summarizing direction and potential",
          "improvement_suggestions": [
            "Specific actionable suggestion",
            "Another practical suggestion",
            "Optional third suggestion"
          ]
        }
        
        Remember:
        - Speak directly to the student
        - Be friendly and human
        - Provide insights, not summaries
        - No school names
        - US context only
        - No text outside JSON
        `
        }
        ],
      temperature: 0.2
    });
  
    return response.choices[0].message.content;
  }

export {client, analyzeStudentProfile};