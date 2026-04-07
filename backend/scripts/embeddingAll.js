import { getSchoolAcademic } from "../src/scoring/academicScore.js";
import { getSchoolActivity } from "../src/scoring/activityScore.js";
import { getSchoolPreference } from "../src/scoring/preferenceScore.js";
import { supabase } from "../db.js";
import { initializeEmbeddings } from './initAnchor.js'


await initializeEmbeddings();

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
  


const colleges = await supabase.from('colleges_embedding').select('*');
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