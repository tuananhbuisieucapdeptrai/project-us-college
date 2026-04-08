/// <---    This file is for connecting to the llm model and defining the helper function to work with it --->///

import OpenAI from "openai";
import "dotenv/config";


const normalizeUrl = (url) => {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

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


async function analyzeSchoolInformation(school, students){
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
      role: "system",
      content: `
      You are Helix AI, a friendly and knowledgeable US college admissions mentor.
      
      Your personality:
      - supportive and conversational
      - insightful and strategic
      - honest but encouraging
      - speaks directly to the student using "you"
      - sounds like an experienced admissions advisor
      
      IMPORTANT RULES:
      - Do NOT invent precise rankings unless very well-known
      - Do NOT recommend other schools
      - Do NOT output markdown
      - Do NOT output text outside JSON
      - Avoid generic advice
      - Focus on academic insight and admission strategy
      `
      },
      {
      role: "user",
      content: `
      You are given:
      1. A selected US college
      2. A student profile
      
      Your job is to provide a personalized analysis explaining how this specific school fits the student academically and strategically.
      
      SCHOOL INFORMATION:
      Name: ${school.name}
      Location: ${school.city}, ${school.state}
      Admission Rate: ${school.admission_rate}
      Student Size: ${school.student_size}
      Website: ${normalizeUrl(school.school_url)}
      
      Description:
      ${school.description}
      
      STUDENT PROFILE:
      Name: ${students.name}
      GPA: ${students.gpa}
      SAT: ${students.sat}
      Budget: ${students.budget}
      
      Awards:
      ${students.awards}
      
      Activities:
      ${students.activities}
      
      Preferences:
      ${students.preferences}
      
      TASKS:
      
      1. Summarize the school in a friendly conversational tone
      2. Explain what the school is known for academically
      3. Describe the academic environment (large lectures, research focus, etc.)
      4. Highlight programs/majors relevant to the student
      5. Evaluate student's competitiveness realistically (not overly optimistic)
      6. Identify strengths that align with this school's academic culture
      7. Identify gaps that may hurt admission chances
      8. Provide academic experience insight (how the student may learn there)
      9. Provide admission strategy advice specific to this school
      10. Provide actionable and non-generic suggestions
      
      IMPORTANT:
      - Focus on academic insight, not just general description
      - Explain WHY the school fits or doesn't fit
      - Avoid generic advice like "contact admissions"
      - Be realistic but supportive
      - Speak directly to the student ("you")
      
      Return STRICT JSON:
      
      {
        "school_summary": "Friendly paragraph summarizing the school",
        "what_school_is_known_for": [
          "Academic strength 1",
          "Academic strength 2",
          "Academic strength 3"
        ],
        "academic_environment": "Explain class size, research focus, academic culture",
        "relevant_programs_for_you": "Explain majors/programs at this school matching the student",
        "fit_analysis": "Realistic explanation of how well the student fits academically",
        "your_strengths_for_this_school": [
          "Strength aligned with school",
          "Another matching strength"
        ],
        "potential_gaps": [
          "Gap 1",
          "Gap 2"
        ],
        "academic_experience_insight": "Explain how the student might experience learning at this school",
        "admission_strategy": "Explain how the student should position their application",
        "actionable_advice": [
          "Specific advice tailored to this school",
          "Another meaningful suggestion"
        ],
        "overall_takeaway": "Short friendly but strategic conclusion",
        "official_website": "Friendly sentence directing the student to the official website using the provided school URL"
      }
      
      STYLE:
      - Speak directly to the student
      - Be friendly and conversational
      - Provide insights, not summaries
      - Be realistic but encouraging
      - No text outside JSON
      `
      }
      ],
    temperature: 0.2
  });

  return response.choices[0].message.content;

};

async function answeringQuestion(question, school, students){
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
      role: "system",
      content: `
      You are Helix AI, a friendly and knowledgeable US college admissions advisor.
      
      Your personality:
      - conversational and supportive
      - insightful and strategic
      - honest and realistic
      - speaks directly to the student using "you"
      
      IMPORTANT RULES:
      - Answer the student's question directly
      - Use the provided school and student information
      - Do NOT hallucinate specific statistics or rankings
      - If unsure, speak generally and cautiously
      - Do NOT recommend other schools
      - Do NOT output markdown
      - Do NOT output text outside JSON
      - Focus on useful and practical advice
      `
      },
      {
      role: "user",
      content: `
      You are given:
      1. A student question
      2. A specific US college
      3. A student profile
      
      Your job:
      Answer the question in a helpful, personalized, and realistic way using both the school and student context.
      
      QUESTION:
      ${question}
      
      SCHOOL INFORMATION:
      Name: ${school.name}
      Location: ${school.city}, ${school.state}
      Admission Rate: ${school.admission_rate}
      Student Size: ${school.student_size}
      
      Description:
      ${school.description}
      
      STUDENT PROFILE:
      Name: ${students.name}
      GPA: ${students.gpa}
      SAT: ${students.sat}
      Budget: ${students.budget}
      
      Awards:
      ${students.awards}
      
      Activities:
      ${students.activities}
      
      Preferences:
      ${students.preferences}
      
      TASKS:
      
      1. Answer the student's question directly
      2. Use school-specific context when relevant
      3. Personalize the answer based on student's profile
      4. Provide useful insights, not generic statements
      5. Be honest if information is uncertain
      6. Provide actionable advice when possible
      7. Keep tone friendly and conversational
      8. Do NOT recommend other schools
      
      Return STRICT JSON:
      
      {
        "answer": "Direct conversational answer to the student's question",
        "personalized_insight": "Explain how this relates specifically to the student",
        "actionable_tip": "One useful next step the student can take"
      }
      
      STYLE:
      - Speak directly to the student ("you")
      - Be helpful and concise
      - Avoid generic responses
      - Avoid repeating school description unless relevant
      - No text outside JSON
      `
      }
      ],
    temperature: 0.2
  });

  return response.choices[0].message.content;

};

export {client, analyzeStudentProfile, analyzeSchoolInformation, answeringQuestion};