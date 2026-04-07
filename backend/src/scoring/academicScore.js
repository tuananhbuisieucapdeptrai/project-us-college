///<---  This file is for calculating the student and schools academics score --->///

import { awardAnchors } from "./anchors.js";
import { client, extractEmbedding, cosineSimilarity } from "../../models/embedding.js";
import { getAwardAnchorsEmbedding} from "../../scripts/initAnchor.js";


// Initialise the academic anchors embedding
async function initAcademicAnchors(){
    let awardAnchor_embedding ={};
    for (const [key, value] of Object.entries(awardAnchors)) {
        const raw = await client.featureExtraction({
          model: "BAAI/bge-base-en-v1.5",
          inputs: value,
          provider: "hf-inference",
        });
        awardAnchor_embedding[key] = extractEmbedding(raw);
      }
    return awardAnchor_embedding;
};

// Function to get student academic score
async function getStudentAcademic(awards, gpa, sat){
  const awardAnchor_embedding = getAwardAnchorsEmbedding();
  let wGpa = 0.30;
  let wSat = 0.45;
  let wAward = 0.25;

  if (gpa > 0.93 && sat > 1450){
    wGpa = 0.25
    wSat = 0.35
    wAward = 0.40
  }

  let overall_score = 0;
  // First get the score for the student's awards
  const student_raw = await client.featureExtraction({
    model: "BAAI/bge-base-en-v1.5",
    inputs: awards,
    provider: "hf-inference",
  });
  const awards_embed = extractEmbedding(student_raw);
  let awards_by_anchor = {};
  for (const [key,value] of Object.entries(awardAnchor_embedding)){
    awards_by_anchor[key] = cosineSimilarity(awards_embed, value);
  } 
  let values = Object.values(awards_by_anchor);
  let score_awards = 0;
  let weights = [1,0.7,0.5, 0.2, 0.1];

  for (let i = 0; i<5; i++){
    score_awards += weights[i]*values[i];
  }
  score_awards = Math.min(score_awards, 1);
  overall_score += gpa*wGpa;
  overall_score += (sat / 1600) * wSat;
  overall_score += score_awards * wAward;


  return Math.min(overall_score, 1);;
};


function getSchoolAcademic(admission_rate, sat_total_50, retention_rate, faculty_ratio, median_earning){

  let score = 0;

  if (admission_rate)
      score += (1 - admission_rate) * 0.3;

  if (sat_total_50)
      score += (sat_total_50 / 1600) * 0.3;

  if (retention_rate)
      score += retention_rate * 0.15;

  if (faculty_ratio)
      score += Math.min(20 / faculty_ratio, 1) * 0.1;
  if (median_earning)
      score += Math.min(median_earning / 100000, 1) * 0.15;

  return score;
}


function academicScore(student, school){
  let score = 0;

  if (school.sat_total_50 && student.sat){
      const diff = student.sat - school.sat_total_50;

      if (diff > 80) score += 1.0;    
      else if (diff > -40) score += 0.7;
      else if (diff > -120) score += 0.4;
      else score += 0.1;
  }

  if (school.admission_rate){
      score += (1 - school.admission_rate);
  }

  return score / 2;
}




export {initAcademicAnchors, getStudentAcademic, getSchoolAcademic}