/// <---  This file is for defining the colleges router   ---> /// 
import { supabase } from '../db.js';
import { Router } from 'express'
import { getStudentAcademic, getSchoolAcademic } from '../src/scoring/academicScore.js';
import { getStudentActivity, getSchoolActivity } from '../src/scoring/activityScore.js';
import { getStudentPreference, getSchoolPreference } from '../src/scoring/preferenceScore.js';
import { cosineSimilarity } from '../models/embedding.js';
import { analyzeStudentProfile, analyzeSchoolInformation, answeringQuestion } from '../models/llm.js';


const collegeRouter = Router()

/// <--- This section is for mapping and converting numerical datapoints into valuable text in the embedding process ---> ///

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


function prestigeBoost(admission_rate){
  if (admission_rate < 0.1) return 0.4;
  if (admission_rate < 0.2) return 0.3;
  if (admission_rate < 0.4) return 0.2;
  return 0;
}


function orderByIds(rows, ids) {
  const map = new Map(rows.map(r => [r.unitid, r]));
  return ids.map(id => map.get(id)).filter(Boolean);
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



/// Define router to post the student information, analyse and give back the list of suitable schools
collegeRouter.post('/recommend', async (req, res) => {
    try {
      
      // Calling the function to first embed the extracurricular activities schema
      const { gpa, sat, budget, awards, activities, preferences } = req.body;
      const analysisPromise = analyzeStudentProfile({gpa, sat, awards, activities, preferences});
      /***  Hard filtering process ***/

      // This is based on the budget and the SAT score
      const studentSAT = Number(sat);
      const maxCost = 3.5 * Number(budget);
      const dreamLow = studentSAT + 80;
      const dreamHigh = studentSAT + 150;
      const matchLow = studentSAT - 60;
      const safeLow = studentSAT - 150;
  

      const [dream, realistic, safe] = await Promise.all([
        supabase.from('colleges_simple').select('unitid, admission_rate').gte('sat_total_50', dreamLow).lt('sat_total_50', dreamHigh).lt('tuition_intl', maxCost),
        supabase.from('colleges_simple').select('unitid, admission_rate').gt('sat_total_50', matchLow).lt('sat_total_50', dreamLow).lt('tuition_intl', maxCost),
        supabase.from('colleges_simple').select('unitid, admission_rate').lte('sat_total_50', matchLow).gt('sat_total_50', safeLow).lt('tuition_intl', maxCost)
      ]);
   
    
      for (let i = (realistic.data || []).length - 1; i >= 0; i--) {
          const entry = realistic.data[i];
          const admission_rate = entry.admission_rate;
        
          if (admission_rate < 0.12) {
            realistic.data.splice(i, 1);
            (dream.data || []).push(entry);
          }
        }
      const allColleges = [
          ...(dream.data || []),
          ...(realistic.data || []),
          ...(safe.data || [])
      ];

      const id_dream = (dream.data || []).map(c=>c.unitid);
      const id_realistic = (realistic.data || []).map(c=>c.unitid);  
      const id_safe = (safe.data || []).map(c=>c.unitid);
      /***  Done hard filtering, now we have a shortlisted school, divided into 3 tiers ***/
      const ids = allColleges.map(c=>c.unitid);

      /// Dealing with dream colleges
      const colleges = await supabase
        .from('colleges_embedding')
        .select('*')
        .in('unitid', ids);
      for (const school of colleges.data){
        const carnegie  = mapCarnegie(school.carnegie_code);
        const location  = mapLocale(school.locale);
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
          if(updateError){
            console.error("Preference embedding update failed", updateError);
            throw updateError;
          }
          school.preference_embedding = preference;
        }
      }

      

      /// Dealing with students
      const [student_academic, student_activity, student_preference] = await Promise.all([
        getStudentAcademic(awards, gpa, sat),
        getStudentActivity(activities),
        getStudentPreference(preferences)
      ]);

     
     
      const dreamSet = new Set(id_dream);
      const realisticSet = new Set(id_realistic);
      const safeSet = new Set(id_safe);

      let dream_schools = []; 
      let realistic_schools = [];
      let safe_schools = [];

      for (const school of colleges.data){
        const academic_accordance = Math.max(0, 1 - Math.abs(student_academic - school.academic_score) * 0.8);
        const prestige = prestigeBoost(school.admission_rate);
        const activityEmbedding =
          typeof school.activity_embedding === "string"
            ? JSON.parse(school.activity_embedding)
            : school.activity_embedding;
        const preferenceEmbedding = 
          typeof school.preference_embedding === "string"
            ? JSON.parse(school.preference_embedding)
            : school.preference_embedding;
        const activitySim =  school.activity_embedding
            ? cosineSimilarity(student_activity, activityEmbedding)
            : 0;
        const preferenceSim = school.preference_embedding
            ? cosineSimilarity(student_preference, preferenceEmbedding)
            : 0;
        const score = 0.45*academic_accordance + 0.25*activitySim+ 0.2*preferenceSim + 0.1*prestige;
        if (dreamSet.has(school.unitid)){
          dream_schools.push({
            id: school.unitid,
            name: school.name,
            academic_score: academic_accordance,
            activity_score: activitySim,
            preference_score: preferenceSim,
            overall_score: score
          });
        }else if (realisticSet.has(school.unitid)){
          realistic_schools.push({
            id: school.unitid,
            name: school.name,
            academic_score: academic_accordance,
            activity_score: activitySim,
            preference_score: preferenceSim,
            overall_score: score
          });
        }
        else{
          safe_schools.push({
            id: school.unitid,
            name: school.name,
            academic_score: academic_accordance,
            activity_score: activitySim,
            preference_score: preferenceSim,
            overall_score: score
          });
        }
      }

      dream_schools.sort((a,b)=>b.overall_score-a.overall_score);
      realistic_schools.sort((a,b)=>b.overall_score-a.overall_score);
      safe_schools.sort((a,b)=>b.overall_score-a.overall_score);
      

      const dream_ids = dream_schools.map(s => s.id);
      const realistic_ids = realistic_schools.map(s => s.id);
      const safe_ids = safe_schools.map(s => s.id);

      const dream_output = await supabase.from('colleges_metadata').select('*').in('unitid', dream_ids);
      const realistic_output = await supabase.from('colleges_metadata').select('*').in('unitid', realistic_ids);
      const safe_output = await supabase.from('colleges_metadata').select('*').in('unitid', safe_ids);

      /*
      res.json({
        dream: dream_schools.slice(0,3),
        realistic: realistic_schools.slice(0,4),
        safe: safe_schools.slice(0,4)
      });*/

      const dream_sorted = orderByIds(dream_output.data, dream_ids);
      const realistic_sorted = orderByIds(realistic_output.data, realistic_ids);
      const safe_sorted = orderByIds(safe_output.data, safe_ids);
      const recommendation = {
        dream: dream_sorted.slice(0,3),
        realistic: realistic_sorted.slice(0,4),
        safe: safe_sorted.slice(0,4)
      }


      const analysis = await analysisPromise;
      /*
      res.json({
        dream: dream_sorted.slice(0,3),
        realistic: realistic_sorted.slice(0,4),
        safe: safe_sorted.slice(0,4)
      });*/


      res.json({
        analysis,
        recommendation
      });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });



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
      const student = {
        name,
        sat,
        gpa,
        budget,
        awards,
        activities,
        preferences
      };
  
      const analysePromise = analyzeSchoolInformation(school, student);
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
      const { question, name, sat, gpa, budget, awards, activities, preferences } = req.body;
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
      const student = {
        name,
        sat,
        gpa,
        budget,
        awards,
        activities,
        preferences
      };

      const answeringPromise = answeringQuestion(question, school, student);
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