/// <---    This file is for calculating the preference vectors for student and schools--->

import { preferenceAnchors } from "./anchors.js";
import { client, extractEmbedding, cosineSimilarity } from "../../models/embedding.js";
import { getPreferenceAnchorsEmbedding } from "../../scripts/initAnchor.js";



async function initPreferenceAnchors(){
    let preferenceAnchors_embedding = {};
    for (const [key, value] of Object.entries(preferenceAnchors)) {
        const raw = await client.featureExtraction({
          model: "BAAI/bge-base-en-v1.5",
          inputs: value,
          provider: "hf-inference",
        });
        preferenceAnchors_embedding[key] = extractEmbedding(raw);
    }
    return preferenceAnchors_embedding;
};

async function getStudentPreference(preferences){
    const preferenceAnchors_embedding = getPreferenceAnchorsEmbedding();
    const student_raw = await client.featureExtraction({
        model: "BAAI/bge-base-en-v1.5",
        inputs: preferences,
        provider: "hf-inference",
      });
    const preferences_embed = extractEmbedding(student_raw);
    let preference_by_anchor = {};
    for (const [key, value] of Object.entries(preferenceAnchors_embedding)){
        preference_by_anchor[key] = cosineSimilarity(preferences_embed, value);
    };
    return [
        preference_by_anchor.stem_focus,
        preference_by_anchor.business_focus,
        preference_by_anchor.humanities_focus,
        preference_by_anchor.arts_focus,
        preference_by_anchor.urban_campus,
        preference_by_anchor.suburban_campus,
        preference_by_anchor.rural_campus,
        preference_by_anchor.large_school,
        preference_by_anchor.medium_school,
        preference_by_anchor.small_school,
        preference_by_anchor.public_school,
        preference_by_anchor.private_school,
        preference_by_anchor.strong_career,
        preference_by_anchor.research_heavy
    ];

}


function buildSchoolText(programs, locale, carnegie, control, student_size){
    return `
        Programs: ${(programs ?? []).join(", ")}
        Campus location: ${locale}
        School type: ${control}
        School size: ${student_size ?? "unknown"} students
        School size category: ${
            student_size > 20000 ? "large university" :
            student_size > 8000 ? "medium university" :
            "small college"
            }
        Institution focus: ${carnegie}
    `.trim();
}

async function getSchoolPreference(programs, locale, carnegie, control, student_size ){
    const preferenceAnchors_embedding = getPreferenceAnchorsEmbedding();
    const uniquePrograms = [...new Set(programs)].slice(0, 30);
    const text = buildSchoolText(uniquePrograms, locale, carnegie, control, student_size);
    const school_raw = await client.featureExtraction({
        model: "BAAI/bge-base-en-v1.5",
        inputs: text,
        provider: "hf-inference",
      });
    const provide_embed = extractEmbedding(school_raw);
    let provide_by_anchor = {};
    for (const [key,value] of Object.entries(preferenceAnchors_embedding)){
        provide_by_anchor[key] = cosineSimilarity(provide_embed, value);
    }
    return [
        provide_by_anchor.stem_focus,
        provide_by_anchor.business_focus,
        provide_by_anchor.humanities_focus,
        provide_by_anchor.arts_focus,
        provide_by_anchor.urban_campus,
        provide_by_anchor.suburban_campus,
        provide_by_anchor.rural_campus,
        provide_by_anchor.large_school,
        provide_by_anchor.medium_school,
        provide_by_anchor.small_school,
        provide_by_anchor.public_school,
        provide_by_anchor.private_school,
        provide_by_anchor.strong_career,
        provide_by_anchor.research_heavy
    ];


}

export {initPreferenceAnchors, getStudentPreference, getSchoolPreference};