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

const extractFirstJsonObject = (text) => {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
};

const normalizeLooseJson = (text) => {
  let normalized = text;
  normalized = normalized.replace(/\[Object\]/g, "null");
  normalized = normalized.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
  normalized = normalized.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`);
  return normalized;
};

const parseLooseJsonObject = (text) => {
  const normalized = normalizeLooseJson(text);
  return JSON.parse(normalized);
};

const extractUnitidsByTierFromText = (text) => {
  const out = { dream: [], realistic: [], safe: [] };
  if (typeof text !== "string" || text.trim() === "") return out;

  const lines = text.split(/\r?\n/);
  let currentTier = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("dream")) currentTier = "dream";
    else if (lower.includes("realistic")) currentTier = "realistic";
    else if (lower.includes("safe")) currentTier = "safe";

    const matches = [...line.matchAll(/unitid\s*[:=]\s*(\d{5,7})/gi)];
    if (currentTier && matches.length > 0) {
      for (const match of matches) {
        out[currentTier].push(Number(match[1]));
      }
    }
  }

  for (const tier of Object.keys(out)) {
    out[tier] = [...new Set(out[tier])];
  }

  return out;
};

const parseJsonResponse = (content) => {
  if (typeof content !== "string") return content;

  const trimmed = content.trim();

  // Prefer fenced JSON block when present.
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const fencedCandidate = fencedMatch ? fencedMatch[1].trim() : null;
  if (fencedCandidate) {
    try {
      return JSON.parse(fencedCandidate);
    } catch {
      const fencedObject = extractFirstJsonObject(fencedCandidate);
      if (fencedObject) {
        try {
          return JSON.parse(fencedObject);
        } catch {
          return parseLooseJsonObject(fencedObject);
        }
      }
    }
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectCandidate = extractFirstJsonObject(trimmed);
    if (objectCandidate) {
      try {
        return JSON.parse(objectCandidate);
      } catch {
        return parseLooseJsonObject(objectCandidate);
      }
    }
    throw new Error("No valid JSON object found in model response");
  }
};

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
      
      SYSTEM ALIGNMENT RULE:
      This school has been selected by Helix's recommendation system using quantitative scoring and embedding-based matching.
      
      Each school includes fit_signals that explain why it was selected.
      
      You must:
      - Use fit_signals as a foundation for your analysis
      - Provide realistic and nuanced evaluation (not blindly positive)
      - If the school is competitive, frame it as a reach but possible
      - If there are weaknesses, highlight them constructively
      - Stay consistent with the idea that this is a reasonable option
      
      HOW TO USE FIT SIGNALS:
      - academic_fit → student's academic competitiveness
      - activity_fit → alignment of extracurricular profile
      - preference_fit → lifestyle/environment fit
      - selectivity_level → overall competitiveness (dream / realistic / safe)
      
      Guidance:
      - If academic_fit is strong → emphasize strengths and differentiation
      - If academic_fit is moderate → balanced evaluation
      - If academic_fit is weaker → highlight gaps + strategy clearly
      - Use signals as guidance, NOT rigid truth
      
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
      3. Fit signals explaining why this school was selected
      
      Your job:
      Provide a personalized, realistic, and strategic analysis of how this school fits the student.
      
      SCHOOL INFORMATION:
      Name: ${school.name}
      Location: ${school.city}, ${school.state}
      Admission Rate: ${school.admission_rate}
      Student Size: ${school.student_size}
      Website: ${normalizeUrl(school.school_url)}
      
      Description:
      ${school.description}
      
      FIT SIGNALS:
      ${JSON.stringify(school.fit_signals, null, 2)}
      
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
      5. Evaluate student's competitiveness realistically (guided by academic_fit)
      6. Identify strengths that align with this school's academic culture (guided by activity_fit)
      7. Identify gaps that may hurt admission chances (especially if academic_fit is not strong)
      8. Provide academic experience insight (how the student may learn there)
      9. Provide admission strategy advice specific to this school
      10. Provide actionable and non-generic suggestions
      
      IMPORTANT:
      
      - Use fit_signals to SUPPORT your reasoning, not replace it
      - Explain WHY the school fits or where it may be challenging
      - Be realistic but supportive
      - Avoid generic advice like "contact admissions"
      - Speak directly to the student ("you")
      - Keep analysis consistent with the provided signals
      
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

async function getStudentInformation(state) {
  const { current_field, student_profile, user_message } = state;

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
      You are Helix AI, a friendly and knowledgeable US college admissions advisor.

      Your ONLY job is to:
      1. Understand the student's latest message
      2. Validate it for current_field
      3. Extract clean structured data into field_updates
      4. Return a very short acknowledgement or correction

      The frontend owns the interview flow and will ask the next question.
      You MUST NOT ask the next profile question.
      You MUST NOT ask for confirmation if the answer is valid.
      You MUST NOT ask follow-up questions about the previous field after accepting it.

      You MUST return valid JSON only with real JSON types:
      - field_updates must be an object, never a string
      - is_valid must be a boolean, never a string

      FIELDS:
      - name: string
      - sat: string containing a number between 400 and 1600
      - budget: string containing a number
      - gpa: string containing a number between 0 and 4
      - awards: string
      - activities: string
      - preferences: string

      FIELD ORDER:
      name -> sat -> budget -> gpa -> awards -> activities -> preferences -> complete

      current_field indicates what the frontend is currently collecting.
      Validate the user's message against current_field.

      VALID ANSWER RULES:
      - If valid, set is_valid to true.
      - If valid, field_updates must include the current_field and any other fields clearly provided.
      - If valid, reply must be only a short acknowledgement of the user's latest message, such as:
        "Nice to meet you, Tuan."
        "Great, I’ll use 1540 for your SAT."
        "Got it, I’ll note those activities."
      - If valid, do not include any question mark in reply.

      INVALID ANSWER RULES:
      - If invalid, set is_valid to false.
      - If invalid, field_updates must be {}.
      - If invalid, next_field must remain current_field.
      - If invalid, reply must be a short correction explaining what is needed, such as:
        "That does not look like a SAT score yet."
        "Please share a GPA between 0 and 4."
      - If invalid, do not ask a full interview question. The frontend will add it.

      EMPTY ANSWERS:
      - If the user intentionally says none/no/not applicable for awards, activities, or preferences, store "None" and move forward.
      - Empty or vague answers for name, sat, budget, or gpa are invalid.

      NEXT FIELD:
      - If valid, next_field should be the next field in FIELD ORDER after the latest required field you updated.
      - If preferences is valid, next_field should be "complete".
      - If invalid, next_field should equal current_field.

      RETURN FORMAT:
      {
        "reply": "Short acknowledgement or correction only",
        "field_updates": { "field_name": "value" },
        "next_field": "name | sat | budget | gpa | awards | activities | preferences | complete",
        "is_valid": true
      }
    `
      },
      {
        role: "user",
        content: JSON.stringify({
          current_field,
          student_profile,
          user_message
        })
      }
    ]
  });

  const content = response.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Invalid JSON from LLM:", content);
    throw err;
  }
}
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
      
      SYSTEM ALIGNMENT RULE:
      The school provided has already been selected by Helix's recommendation engine 
      based on the student's profile using quantitative scoring and embedding-based matching.
      
      Each school includes fit_signals that explain WHY it was selected.
      
      You must:
      - Treat the school as a relevant and reasonable option for the student
      - Use fit_signals to guide your reasoning
      - Do NOT contradict the recommendation
      - Do NOT say the school is a bad fit
      - If the school is competitive, frame it as a "reach but possible" opportunity
      - Focus on strategies to improve admission chances rather than rejecting the school
      - Provide constructive and supportive guidance aligned with the recommendation
      
      HOW TO USE FIT SIGNALS:
      - academic_fit indicates the student's academic competitiveness
      - activity_fit reflects alignment with extracurricular profile
      - preference_fit reflects lifestyle and environment match
      - selectivity_level indicates competitiveness (dream / realistic / safe)
      
      - If academic_fit is weaker → emphasize strategy and improvement
      - If strong → emphasize positioning and differentiation
      - Use signals as guidance, NOT rigid rules
      
      IMPORTANT RULES:
      - Answer the student's question directly
      - Use the provided school and student information
      - Use fit_signals when relevant to strengthen your reasoning
      - Do NOT hallucinate specific statistics or rankings
      - If unsure, speak generally and cautiously
      - Do NOT recommend other schools
      - Do NOT output markdown
      - Do NOT output text outside JSON
      - Focus on useful and practical advice
      - Avoid repeating the same advice across responses
      `
      },
      
      {
        role: "user",
        content: `
      You are given:
      
      1. A student question
      2. A specific US college
      3. A student profile
      4. Fit signals explaining why this school was selected
      
      Your job:
      Answer the question in a helpful, personalized, and realistic way using all context.
      
      QUESTION:
      ${question}
      
      SCHOOL INFORMATION:
      Name: ${school.name}
      Location: ${school.city}, ${school.state}
      Admission Rate: ${school.admission_rate}
      Student Size: ${school.student_size}
      
      Description:
      ${school.description}
      
      FIT SIGNALS:
      ${JSON.stringify(school.fit_signals, null, 2)}
      
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
      3. Use fit_signals to support your reasoning when helpful
      4. Personalize the answer only when it adds value
      5. Provide insights only if they are new and meaningful
      6. Provide actionable advice only if it is useful and not repetitive
      7. Keep tone friendly and conversational
      8. Do NOT recommend other schools
      
      IMPORTANT RESPONSE BEHAVIOR:
      
      - If the question is factual → keep response concise
      - If the question is strategic → include insight and advice
      - If academic_fit is weaker → include practical improvement strategies
      - If academic_fit is strong → focus on differentiation and positioning
      - If no new advice is needed → leave optional fields empty
      - Do NOT repeat previously given suggestions
      - Keep responses natural and varied
      
      Return STRICT JSON:
      
      {
        "answer": "Direct conversational answer to the student's question",
        "extra_insights": [
          "Optional additional insight (only if useful)"
        ],
        "next_step": "Optional actionable suggestion (leave empty if none)"
      }
      
      STYLE:
      - Speak directly to the student ("you")
      - Be helpful and concise
      - Avoid generic responses
      - Avoid repeating school description unless relevant
      - Keep responses varied across questions
      - No text outside JSON
      `
      }
      ],
    temperature: 0.2
  });

  return response.choices[0].message.content;

};



async function chooseColleges(safe, realistic, dream, student){
  const compactStudent = {
    sat: Number(student?.sat),
    gpa: Number(student?.gpa),
    budget: Number(student?.budget)
  };

  const compactSchool = (school) => ({
    unitid: Number(school?.unitid),
    admission_rate: Number(school?.admission_rate),
    fit_signals: {
      academic_fit: school?.fit_signals?.academic_fit,
      activity_fit: school?.fit_signals?.activity_fit,
      preference_fit: school?.fit_signals?.preference_fit,
      overall_fit: school?.fit_signals?.overall_fit
    }
  });

  const compactDream = (Array.isArray(dream) ? dream : []).map(compactSchool);
  const compactRealistic = (Array.isArray(realistic) ? realistic : []).map(compactSchool);
  const compactSafe = (Array.isArray(safe) ? safe : []).map(compactSchool);

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content: `
      Select colleges only from provided candidates.
      Prioritize academic_fit, then overall_fit, then activity/preference fit.
      Prefer realistic/safe balance if dream fit is weak.
      Output exactly one JSON object, no extra text, no markdown:
      {"dream":[unitid],"realistic":[unitid],"safe":[unitid]}
      Rules:
      - 8 to 12 schools total if possible
      - no duplicate unitid across tiers
      - keep tier meaning: dream competitive, realistic plausible, safe likely
      `
      },
      
      {
        role: "user",
        content: `
      You are given:
      
      1. A compact student profile
      2. Three groups of candidate schools: dream, realistic, safe
      3. Each school includes fit_signals derived from a scoring system
      
      Your task:
      Select the BEST schools for the student using these signals.
      
      Student profile:
      ${JSON.stringify(compactStudent)}
      
      Dream schools:
      ${JSON.stringify(compactDream)}
      
      Realistic schools:
      ${JSON.stringify(compactRealistic)}
      
      Safe schools:
      ${JSON.stringify(compactSafe)}
      `
      }
      ],
    temperature: 0.2
  });

  const content = response.choices[0].message.content;
  try {
    return parseJsonResponse(content);
  } catch (err) {
    const extracted = extractUnitidsByTierFromText(content);
    const recoveredCount = extracted.dream.length + extracted.realistic.length + extracted.safe.length;
    if (recoveredCount > 0) {
      console.error("Recovered non-JSON chooseColleges response via unitid extraction");
      return extracted;
    }
    console.error("Invalid JSON from chooseColleges:", content);
    return { dream: [], realistic: [], safe: [] };
  }

};

export {client, analyzeStudentProfile, analyzeSchoolInformation, getStudentInformation, answeringQuestion, chooseColleges};
