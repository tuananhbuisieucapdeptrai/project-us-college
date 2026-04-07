import { supabase } from '../db.js';

/*
const academic = await initAcademicAnchors();
console.log("academic", academic);

const activity = await initActivityAnchors();
console.log("activity", activity);

const preference = await initPreferenceAnchors();
console.log("preference", preference);

const anchors_id = 1;

const { data, error } = await supabase
  .from('anchors')
  .upsert({
    id: anchors_id,
    academic,
    activity,
    preference
  });

if (error) {
  console.error('Error inserting:', error);
} else {
  console.log('Inserted successfully');
}

*/

async function getAcademicAnchors() {
    const { data, error } = await supabase
        .from('anchors')
        .select('academic')
        .eq('id', 1)
        .single(); 
    if (error) {
        console.error('Error fetching academic anchors:', error);
        throw error; 
    }
    
    const embedding = typeof data.academic === 'string' 
        ? JSON.parse(data.academic) 
        : data.academic
  
    return embedding
};

async function getActivityAnchors() {
    const { data, error } = await supabase
        .from('anchors')
        .select('activity')
        .eq('id', 1)
        .single(); 
    if (error) {
        console.error('Error fetching activity anchors:', error);
        throw error; 
    }
    
    const embedding = typeof data.activity === 'string' 
        ? JSON.parse(data.activity) 
        : data.activity
  
    return embedding
};

async function getPreferenceAnchors() {
    const { data, error } = await supabase
        .from('anchors')
        .select('preference')
        .eq('id', 1)
        .single(); 
    if (error) {
        console.error('Error fetching preference anchors:', error);
        throw error; 
    }
    
    const embedding = typeof data.preference === 'string' 
        ? JSON.parse(data.preference) 
        : data.preference
  
    return embedding
};

let awardAnchor_embedding = null;
let activityAnchor_embedding = null;
let preferenceAnchors_embedding = null;


async function initializeEmbeddings() {
  try {
    console.log("Loading anchor embeddings...");
    const [academic, activity, preference] = await Promise.all([
        getAcademicAnchors(),
        getActivityAnchors(),
        getPreferenceAnchors()
      ]);

  
    awardAnchor_embedding = academic;
    activityAnchor_embedding = activity;
    preferenceAnchors_embedding = preference;
    
  } catch (error) {
    console.error('Failed to load embeddings:', error)
  }
};



function getAwardAnchorsEmbedding() {
    return awardAnchor_embedding;
  }
  
function getActivityAnchorsEmbedding() {
    return activityAnchor_embedding;
}
  
function getPreferenceAnchorsEmbedding() {
    return preferenceAnchors_embedding;
  }
  
  export {
    initializeEmbeddings,
    getAwardAnchorsEmbedding,
    getActivityAnchorsEmbedding,
    getPreferenceAnchorsEmbedding
  };


