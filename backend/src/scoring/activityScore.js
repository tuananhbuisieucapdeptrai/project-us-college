/// <---    This file is for calculating the student and school activities vectors  --->
import { activityAnchors } from "./anchors.js";
import { client, extractEmbedding, cosineSimilarity } from "../../models/embedding.js";
import { getActivityAnchorsEmbedding } from "../../scripts/initAnchor.js";



// Initialise the activity anchors embedding
async function initActivityAnchors(){
  let activityAnchor_embedding = {};
  for (const [key, value] of Object.entries(activityAnchors)) {
    const raw = await client.featureExtraction({
      model: "BAAI/bge-base-en-v1.5",
      inputs: value,
      provider: "hf-inference",
    });
    activityAnchor_embedding[key] = extractEmbedding(raw);
  }
  return activityAnchor_embedding;
};


async function getStudentActivity(activities){
    const activityAnchor_embedding = getActivityAnchorsEmbedding();
    const student_raw = await client.featureExtraction({
        model: "BAAI/bge-base-en-v1.5",
        inputs: activities,
        provider: "hf-inference",
      });
      
    const activities_embed = extractEmbedding(student_raw);
    let activity_by_anchor = {};
    for (const [key,value] of Object.entries(activityAnchor_embedding)){
        activity_by_anchor[key] = cosineSimilarity(activities_embed, value);
    };
    return [
        activity_by_anchor.leadership,
        activity_by_anchor.research,
        activity_by_anchor.volunteering,
        activity_by_anchor.entrepreneurship,
        activity_by_anchor.athletics,
        activity_by_anchor.arts
      ];

}

async function getSchoolActivity(programs){
    const activityAnchor_embedding = getActivityAnchorsEmbedding();
    const programText = (programs ?? [])
        .slice(0, 40)           
        .join(", ");
    const raw_program = await client.featureExtraction({
        model: "BAAI/bge-base-en-v1.5",
        inputs: programText,
        provider: "hf-inference",
    });
    const program_embed = extractEmbedding(raw_program);
    let program_by_anchor = {};
    for (const [key,value] of Object.entries(activityAnchor_embedding)){
      program_by_anchor[key] = cosineSimilarity(program_embed, value);
    }
  
    return [
        program_by_anchor.leadership,
        program_by_anchor.research,
        program_by_anchor.volunteering,
        program_by_anchor.entrepreneurship,
        program_by_anchor.athletics,
        program_by_anchor.arts
      ];

}


export {initActivityAnchors, getStudentActivity, getSchoolActivity};



