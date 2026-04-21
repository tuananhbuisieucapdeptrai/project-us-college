/// <---  This file is for defining the colleges router   ---> /// 
import { supabase } from '../db.js';
import { Router } from 'express'
import { getAdmissionTier, getSchoolAcademic } from '../src/scoring/academicScore.js';
import { getStudentActivity, getSchoolActivity } from '../src/scoring/activityScore.js';
import { getStudentPreference, getSchoolPreference } from '../src/scoring/preferenceScore.js';
import { cosineSimilarity } from '../models/embedding.js';
import { analyzeStudentProfile, analyzeSchoolInformation, answeringQuestion, getStudentInformation, chooseColleges } from '../models/llm.js';


const collegeRouter = Router()


/// <--- This section is for mapping and converting numerical datapoints into valuable text in the embedding process ---> ///


let universities = [];
/// Mapping the carnegie code
function mapCarnegie(code) {
  const map = {
    15: "very high research university",
    16: "high research university",
    17: "doctoral professional university",
    21: "large master's university",
    22: "medium master's university",
    23: "small master's university",
    31: "liberal arts college",
    32: "baccalaureate college",
    33: "undergraduate focused college"
  };
  return map[code] ?? "unknown classification";
}

/// Mapping the location
function mapLocale(code) {
  const map = {
    11: "large city",
    12: "mid size city",
    13: "small city",
    21: "large suburb",
    22: "mid size suburb",
    23: "small suburb",
    31: "town near city",
    32: "town distant",
    33: "remote town",
    41: "rural near city",
    42: "rural distant",
    43: "remote rural"
  };

  return map[code] ?? "unknown location";
}



/// Mapping the type of school
function mapControl(code) {
  const map = {
    1: "public university",
    2: "private nonprofit university",
    3: "private for profit institution"
  };
  return map[code] ?? "unknown institution type";
}


function orderByIds(rows, ids) {
  const map = new Map(rows.map(r => [r.unitid, r]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

function clampScore(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(Math.max(numericValue, 0), 1);
}

function outcomeTieBreaker(school) {
  const earning = Number(school?.median_earning);
  const retention = Number(school?.retention_rate);
  const earningScore = Number.isFinite(earning) ? Math.min(earning / 100000, 1) : 0;
  const retentionScore = Number.isFinite(retention) ? Math.min(retention, 1) : 0;

  return 0.55 * earningScore + 0.45 * retentionScore;
}

function scoreByTier(tier, academicFit, activitySim, preferenceSim, outcomeScore) {
  const academic = clampScore(academicFit);
  const activity = clampScore(activitySim);
  const preference = clampScore(preferenceSim);
  const outcome = clampScore(outcomeScore);

  if (tier === "dream") {
    return 0.50 * academic + 0.22 * preference + 0.18 * activity + 0.10 * outcome;
  }

  return 0.65 * academic + 0.18 * preference + 0.12 * activity + 0.05 * outcome;
}

function refillSafeFromRealisticIfNeeded(realistic, safe) {
  if (safe.length > 0 || realistic.length === 0) return { realistic, safe };

  const realisticRankedForSafe = [...realistic].sort((a, b) => {
    const admitA = Number.isFinite(Number(a.admission_rate)) ? Number(a.admission_rate) : 0;
    const admitB = Number.isFinite(Number(b.admission_rate)) ? Number(b.admission_rate) : 0;
    if (admitB !== admitA) return admitB - admitA;
    return (b.academic_score ?? 0) - (a.academic_score ?? 0);
  });

  const moveCount = Math.min(Math.max(Math.floor(realistic.length * 0.35), 4), 10, realistic.length);
  const movedIds = new Set(realisticRankedForSafe.slice(0, moveCount).map((s) => String(s.id)));

  return {
    realistic: realistic.filter((s) => !movedIds.has(String(s.id))),
    safe: realistic.filter((s) => movedIds.has(String(s.id)))
  };
}




function fitBucket(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "weak";
  if (v >= 0.7) return "strong";
  if (v >= 0.45) return "moderate";
  return "weak";
}

function convertFit(academic, activity, preference, overall){
    const academic_fit = fitBucket(academic);
    const activity_fit = fitBucket(activity);
    const preference_fit = fitBucket(preference);
    const overall_fit = fitBucket(overall);

    return { academic_fit, activity_fit, preference_fit, overall_fit };
}

// <--- From here is the router defining part ---> // 


/// Define the router to get all the simple colleges information
collegeRouter.get('/', async (req, res)=>{
    try{
        const result = await supabase.from('colleges_simple').select('*');
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
      }
})




/// Define the router to get all the detailed colleges information
collegeRouter.get('/details', async (req,res)=>{
  try{
    const result = await supabase.from('colleges_embedding').select('*');
    res.json(result);
  }
  catch(err){
    res.status(500).json({error: err.message});
  }
})


async function gatherStudentInformation(req, res) {
  try{
    const {state} = req.body;
    const studentInformationUpdated = await getStudentInformation(state);
    return res.json(studentInformationUpdated);
  }
  catch(err){
    res.status(500).json({error: err.message});

  }
}

collegeRouter.post('/gather', gatherStudentInformation)
collegeRouter.post('/gathering', gatherStudentInformation)


/// Define router to post the student information, analyse and give back the list of suitable schools
collegeRouter.post('/recommend', async (req, res) => {
  try { 
    // Calling the function to first embed the extracurricular activities schema 
    const { gpa, sat, budget, awards, activities, preferences } = req.body; 
    const analysisPromise = analyzeStudentProfile({gpa, sat, awards, activities, preferences}); 
    /*** Conservative academic candidate pool ***/ 


    const studentSAT = Number(sat); const studentGPA = Number(gpa); 
    const student = { sat: studentSAT, gpa: studentGPA, awards, activities, preferences }; 
    const budgetNumber = Number(budget); 
    const maxCost = Number.isFinite(budgetNumber) && budgetNumber > 0 ? 3.5 * budgetNumber : 1000000; 
    const candidateLow = Number.isFinite(studentSAT) ? Math.max(400, studentSAT - 180) : 400; 
    const candidateHigh = Number.isFinite(studentSAT) ? Math.min(1600, studentSAT + 180) : 1600; 
    const candidateResult = await supabase .from('colleges_simple') .select('unitid, admission_rate, sat_total_50, tuition_intl') .gte('sat_total_50', candidateLow) .lte('sat_total_50', candidateHigh) .lt('tuition_intl', maxCost); 
    


    
    if (candidateResult.error) { 
      throw candidateResult.error;
    } 


    const ids = [...new Set((candidateResult.data || []).map(c => c.unitid))]; 
    if (ids.length === 0) { 
      const analysis = await analysisPromise; 
      return res.json({ analysis, recommender: { dream: [], realistic: [], safe: [] } }); 
    } 
    const colleges = await supabase .from('colleges_embedding') .select('*') .in('unitid', ids); 
    if (colleges.error) { 
      throw colleges.error; 
    } 



    for (const school of colleges.data){ 
      const carnegie = mapCarnegie(school.carnegie_code); 
      const location = mapLocale(school.locale); 
      const control = mapControl(school.control); 


      if (school.academic_score == null){ 
        const score = getSchoolAcademic(school.admission_rate, school.sat_total_50, school.retention_rate, school.faculty_ratio, school.median_earning); 
        const {data: updated, error: updateError} = await supabase.from('colleges_embedding').update({academic_score: score}).eq('unitid', school.unitid); 
        if(updateError){ 
          console.error("Academic score update failed", updateError); 
          throw updateError; 
        } 
        school.academic_score = score;
      } 

      if (school.activity_embedding == null){ 
        const vector = await getSchoolActivity(school.cip_programs); 
        const {data: updated, error: updateError} = await supabase.from('colleges_embedding').update({activity_embedding: `[${vector.join(",")}]`}).eq('unitid', school.unitid); 
        if(updateError){ 
          console.error("Activity embedding update failed", updateError); 
          throw updateError; 
        } 
        school.activity_embedding = vector; 
      } 

      if (school.preference_embedding == null){ 
        const preference = await getSchoolPreference(school.cip_programs, location, carnegie, control, school.student_size); 
        const {data: updated, error: updateError} = await supabase.from('colleges_embedding').update({preference_embedding: `[${preference.join(",")}]`}).eq('unitid', school.unitid); 
        if(updateError){ console.error("Preference embedding update failed", updateError); throw updateError; } school.preference_embedding = preference; 
      } 
    } 
        /// Dealing with students 
      const [student_activity, student_preference] = await Promise.all([ 
          getStudentActivity(activities), 
          getStudentPreference(preferences) 
        ]); 
      let dream_schools = []; 
      let realistic_schools = []; 
      let safe_schools = []; 
      for (const school of colleges.data){ 

          const tierInfo = getAdmissionTier(student, school); 

          const activityEmbedding = typeof school.activity_embedding === "string" ? JSON.parse(school.activity_embedding) : school.activity_embedding; 
          const preferenceEmbedding = typeof school.preference_embedding === "string" ? JSON.parse(school.preference_embedding) : school.preference_embedding; 
          const activitySim = school.activity_embedding ? cosineSimilarity(student_activity, activityEmbedding) : 0; 
          const preferenceSim = school.preference_embedding ? cosineSimilarity(student_preference, preferenceEmbedding) : 0; 
          const outcomeScore = outcomeTieBreaker(school); 
          const score = scoreByTier(tierInfo.tier, tierInfo.academicFit, activitySim, preferenceSim, outcomeScore); 
          const scoredSchool = { id: school.unitid, name: school.name, academic_score: tierInfo.academicFit, activity_score: activitySim, preference_score: preferenceSim, outcome_score: outcomeScore, overall_score: score, tier_reason: tierInfo.reason, sat_delta: tierInfo.satDelta, admission_rate: tierInfo.admissionRate }; 
          
          if (tierInfo.tier === "dream") 
            dream_schools.push(scoredSchool); 
          else if (tierInfo.tier === "safe")
             safe_schools.push(scoredSchool); 
          else realistic_schools.push(scoredSchool); 
        } 


      dream_schools.sort((a,b)=>b.overall_score-a.overall_score); 
      realistic_schools.sort((a,b)=>b.overall_score-a.overall_score); 
      safe_schools.sort((a,b)=>b.overall_score-a.overall_score); 

      if (safe_schools.length === 0 && realistic_schools.length > 0) {
        const redistributed = refillSafeFromRealisticIfNeeded(realistic_schools, safe_schools);
        realistic_schools = redistributed.realistic;
        safe_schools = redistributed.safe;
      }

      universities = [...dream_schools, ...realistic_schools, ...safe_schools];

      const dream_ids = dream_schools.map(s => s.id); 
      const realistic_ids = realistic_schools.map(s => s.id); 
      const safe_ids = safe_schools.map(s => s.id); 
        
      const dream_output = await supabase.from('colleges_metadata').select('*').in('unitid', dream_ids); 
      const realistic_output = await supabase.from('colleges_metadata').select('*').in('unitid', realistic_ids); 
      const safe_output = await supabase.from('colleges_metadata').select('*').in('unitid', safe_ids); 
        
      const dream_final = []; 
      const realistic_final = []; 
      const safe_final = []; 
        /* res.json({ dream: dream_schools.slice(0,3), realistic: realistic_schools.slice(0,4), safe: safe_schools.slice(0,4) });*/ 
      const dream_sorted = orderByIds(dream_output.data, dream_ids); 
      const realistic_sorted = orderByIds(realistic_output.data, realistic_ids); 
      const safe_sorted = orderByIds(safe_output.data, safe_ids); 


      for (const school of dream_sorted){ 
        for (const school_score of dream_schools){ 
            if (school_score.id == school.unitid){ 
              const {academic_fit, activity_fit, preference_fit, overall_fit} = convertFit(school_score.academic_score, school_score.activity_score, school_score.preference_score, school_score.overall_score) 
              let fit_signals = { academic_fit: academic_fit, activity_fit: activity_fit, preference_fit: preference_fit, overall_fit: overall_fit }; 
              const item = { 
                unitid: school.unitid,
                name: school.name,
                admission_rate: school.admission_rate,
                student_size: school.student_size,
                school_url: school.school_url,
                city: school.city,
                state: school.state, 
                //fit_signals: { //academic_fit: academic_fit, //act2ivity_fit: activity_fit, //preference_fit: preference_fit, //overall_fit: overall_fit //} 
                fit_signals 
              }; 
              dream_final.push(item); 
            } 
          } 
        }; 
      
      for (const school of realistic_sorted){ 
        for (const school_score of realistic_schools){ 
            if (school_score.id == school.unitid){ 
              const {academic_fit, activity_fit, preference_fit, overall_fit} = convertFit(school_score.academic_score, school_score.activity_score, school_score.preference_score, school_score.overall_score) 
              let fit_signals = { academic_fit: academic_fit, activity_fit: activity_fit, preference_fit: preference_fit, overall_fit: overall_fit }; 
              const item = { 
                unitid: school.unitid,
                name: school.name,
                admission_rate: school.admission_rate,
                student_size: school.student_size,
                school_url: school.school_url,
                city: school.city,
                state: school.state, 
                fit_signals 
              }
              realistic_final.push(item); 
            }; 
              
            } 
          } ; 

      for (const school of safe_sorted){ 
        for (const school_score of safe_schools){ 
            if (school_score.id == school.unitid){ 
              const {academic_fit, activity_fit, preference_fit, overall_fit} = convertFit(school_score.academic_score, school_score.activity_score, school_score.preference_score, school_score.overall_score) 
              const item = {
                unitid: school.unitid,
                name: school.name,
                admission_rate: school.admission_rate,
                student_size: school.student_size,
                school_url: school.school_url,
                city: school.city,
                state: school.state,  
                fit_signals: { 
                  academic_fit: academic_fit, 
                  activity_fit: activity_fit, 
                  preference_fit: preference_fit, 
                  overall_fit: overall_fit 
                }
              }; 
              safe_final.push(item); 
            } 
          } 
        }; 

      const dream_final_short = dream_final.slice(0,15);
      const realistic_final_short = realistic_final.slice(0,15);
      const safe_final_short = safe_final.slice(0,15);  
      console.log(dream_final.length);
      console.log(realistic_final.length);
      console.log(safe_final.length);
      console.log(dream_final_short.length);
      console.log(realistic_final_short.length);
      console.log(safe_final_short.length);
        //const recommendation = { dream: dream_sorted.slice(0,3), realistic: realistic_sorted.slice(0,4), safe: safe_sorted.slice(0,4) } 
      const analysis = await analysisPromise; 
      /* res.json({ dream: dream_sorted.slice(0,3), realistic: realistic_sorted.slice(0,4), safe: safe_sorted.slice(0,4) });*/ 
      const recommenderRaw = await chooseColleges(safe_final_short, realistic_final_short, dream_final_short, student); 
      console.log(recommenderRaw);

      const sourceById = new Map(
        [...dream_final_short, ...realistic_final_short, ...safe_final_short]
          .map((school) => [String(school.unitid), school])
      );

      const normalizeTier = (schools) => {
        if (!Array.isArray(schools)) return [];
        return schools
          .map((school) => {
            const rawId = typeof school === "object" && school !== null
              ? school.unitid
              : school;
            const id = String(rawId ?? "");
            const source = sourceById.get(id) || {};
            return {
              ...source,
              ...(typeof school === "object" && school !== null ? school : {}),
              unitid: rawId ?? source?.unitid
            };
          })
          .filter((school) => school.unitid != null);
      };

      const dedupeByUnitId = (schools) => {
        const seen = new Set();
        return schools.filter((school) => {
          const key = String(school.unitid);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const recommender = {
        dream: normalizeTier(recommenderRaw?.dream),
        realistic: normalizeTier(recommenderRaw?.realistic),
        safe: normalizeTier(recommenderRaw?.safe)
      };


      
      
      recommender.dream = dedupeByUnitId(recommender.dream);
      const dreamIds = new Set(recommender.dream.map((s) => String(s.unitid)));
      recommender.realistic = dedupeByUnitId(recommender.realistic).filter((s) => !dreamIds.has(String(s.unitid)));
      const usedIds = new Set([...dreamIds, ...recommender.realistic.map((s) => String(s.unitid))]);
      recommender.safe = dedupeByUnitId(recommender.safe).filter((s) => !usedIds.has(String(s.unitid)));

      const totalSelected = recommender.dream.length + recommender.realistic.length + recommender.safe.length;
      const finalRecommender = totalSelected > 0
        ? recommender
        : {
            dream: dream_final_short.slice(0, 3),
            realistic: realistic_final_short.slice(0, 4),
            safe: safe_final_short.slice(0, 3)
          };
      //console.log(recommender);
      console.log(recommender);
      console.log(finalRecommender);
      res.json({ 
        analysis, 
        recommender: finalRecommender 
      }); 
    } 

    catch (err) { 
      res.status(500).json({ error: err.message }); 
    } 
  }
);



  collegeRouter.post('/recommend/:id', async (req, res)=>{
    try {
  
      const schoolId = req.params.id;
      const { name, sat, gpa, budget, awards, activities, preferences } = req.body;
      const school_raw = await supabase
        .from('colleges_metadata')
        .select('*')
        .eq('unitid', schoolId);
  
      if (!school_raw.data || school_raw.data.length === 0) {
        return res.status(404).json({ error: "School not found" });
      }
  
      const school = school_raw.data[0];
      let academic_fit = 0;
      let activity_fit = 0;
      let preference_fit = 0;
      let overall_fit = 0;
      for (const uni of universities ){
        if (uni.id == schoolId){
          academic_fit = uni.academic_score;
          activity_fit = uni.activity_score;
          preference_fit = uni.preference_score;
          overall_fit = uni.overall_score;
        }
      }
      const school_object = {
        ...school,
        fit_signals: {
          academic_fit: academic_fit,
          activity_fit: activity_fit,
          preference_fit: preference_fit,
          overall_fit: overall_fit
        }
      }
      console.log(school_object);
      const student = {
        name,
        sat,
        gpa,
        budget,
        awards,
        activities,
        preferences
      };
  
      const analysePromise = analyzeSchoolInformation(school_object, student);
      const analyseSchool = await analysePromise;
  
      return res.json(JSON.parse(analyseSchool));
  
    }
    catch(err){
      res.status(500).json({error: err.message});
    }
  });

collegeRouter.post('/recommend/:id/questions', async (req,res)=>{
  try{
      const schoolId = req.params.id;
      const { question, name, sat, gpa, budget, awards, activities, preferences, conversation_context, turn_index } = req.body;
      const school_raw = await supabase
        .from('colleges_metadata')
        .select('*')
        .eq('unitid', schoolId);
  
      if (!school_raw.data || school_raw.data.length === 0) {
        return res.status(404).json({ error: "School not found" });
      }
      if (!question || question.trim() === "") {
        return res.status(400).json({ error: "Question is required" });
      }
      const school = school_raw.data[0];
      let academic_fit = 0;
      let activity_fit = 0;
      let preference_fit = 0;
      let overall_fit = 0;
      for (const uni of universities ){
        if (uni.id == schoolId){
          academic_fit = uni.academic_score;
          activity_fit = uni.activity_score;
          preference_fit = uni.preference_score;
          overall_fit = uni.overall_score;
        }
      }
      const school_object = {
        ...school,
        fit_signals: {
          academic_fit: academic_fit,
          activity_fit: activity_fit,
          preference_fit: preference_fit,
          overall_fit: overall_fit
        }
      }
      const student = {
        name,
        sat,
        gpa,
        budget,
        awards,
        activities,
        preferences
      };

      const answeringPromise = answeringQuestion(question, school_object, student, conversation_context, turn_index);
      const answerQuestion = await answeringPromise;
  
      let parsed;
      try {
        parsed = JSON.parse(answerQuestion);
      } catch {
        parsed = { answer: answerQuestion };
      }

      return res.json(parsed);

  }
  catch(err){
    res.status(500).json({error: err.message});
  }
});
export { collegeRouter}
