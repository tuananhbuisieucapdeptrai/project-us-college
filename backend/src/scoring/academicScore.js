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


function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function getSatFit(studentSAT, schoolSAT) {
  if (!Number.isFinite(studentSAT) || !Number.isFinite(schoolSAT)) return 0.45;

  const satDelta = studentSAT - schoolSAT;

  if (satDelta >= 150) return 1.0;
  if (satDelta >= 80) return 0.92;
  if (satDelta >= 30) return 0.78;
  if (satDelta >= -30) return 0.62;
  if (satDelta >= -80) return 0.38;
  if (satDelta >= -140) return 0.18;
  return 0.06;
}

function getSelectivityPenalty(admissionRate) {
  const rate = Number(admissionRate);

  if (!Number.isFinite(rate) || rate <= 0) return 0.85;
  if (rate < 0.05) return 0.45;
  if (rate < 0.08) return 0.55;
  if (rate < 0.12) return 0.65;
  if (rate < 0.20) return 0.78;
  if (rate < 0.35) return 0.90;
  return 1.0;
}

function getAcademicFit(student, school) {
  const studentSAT = Number(student?.sat);
  const studentGPA = Number(student?.gpa);
  const schoolSAT = Number(school?.sat_total_50);

  const satFit = getSatFit(studentSAT, schoolSAT);
  const gpaFit = Number.isFinite(studentGPA) ? clamp(studentGPA / 4) : 0.55;
  const selectivityPenalty = getSelectivityPenalty(school?.admission_rate);

  return clamp((0.76 * satFit + 0.24 * gpaFit) * selectivityPenalty);
}

function getAdmissionTier(student, school) {
  const studentSAT = Number(student?.sat);
  const schoolSAT = Number(school?.sat_total_50);
  const admissionRate = Number(school?.admission_rate);
  const academicFit = getAcademicFit(student, school);
  const satDelta = Number.isFinite(studentSAT) && Number.isFinite(schoolSAT)
    ? studentSAT - schoolSAT
    : null;

  if (Number.isFinite(admissionRate) && admissionRate < 0.12) {
    return {
      tier: "dream",
      reason: "highly_selective",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  if (satDelta !== null && satDelta < -80) {
    return {
      tier: "dream",
      reason: "sat_below_median",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  if (Number.isFinite(admissionRate) && admissionRate < 0.20 && (satDelta === null || satDelta < 80)) {
    return {
      tier: "dream",
      reason: "selective_and_not_above_median",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  if (
    satDelta !== null &&
    satDelta >= 80 &&
    Number.isFinite(admissionRate) &&
    admissionRate >= 0.35
  ) {
    return {
      tier: "safe",
      reason: "sat_above_median_and_accessible",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  // Broader safe rule to reduce empty-safe cases while keeping quality.
  if (
    satDelta !== null &&
    satDelta >= 50 &&
    Number.isFinite(admissionRate) &&
    admissionRate >= 0.45
  ) {
    return {
      tier: "safe",
      reason: "sat_above_median_and_more_accessible",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  if (
    Number.isFinite(admissionRate) &&
    admissionRate >= 0.6 &&
    (satDelta === null || satDelta >= 0)
  ) {
    return {
      tier: "safe",
      reason: "high_admission_rate",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  if (
    satDelta !== null &&
    satDelta >= 130 &&
    Number.isFinite(admissionRate) &&
    admissionRate >= 0.25
  ) {
    return {
      tier: "safe",
      reason: "sat_well_above_median",
      academicFit,
      satDelta,
      admissionRate
    };
  }

  return {
    tier: "realistic",
    reason: "academically_plausible",
    academicFit,
    satDelta,
    admissionRate
  };
}




export {
  initAcademicAnchors,
  getStudentAcademic,
  getSchoolAcademic,
  getAcademicFit,
  getAdmissionTier,
  getSelectivityPenalty
}
