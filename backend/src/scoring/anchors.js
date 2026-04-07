/// <---- This file is for defining the schema for the anchor ---> ///


/// This is the schema for student and school activities
const activityAnchors = {
    leadership: "leadership and initiative",
    research: "academic research projects",
    volunteering: "community service and volunteering",
    entrepreneurship: "startup and innovation",
    athletics: "sports and athletics",
    arts: "creative and artistic activities"
};

/// This is the schema for student and school academics
const awardAnchors = {
    international_olympiad: "International olympiad medal, IMO, IOI, IPhO, IChO, world champion academic competition",
    national_olympiad: "National olympiad winner, national math competition gold medal",
    regional_competition: "regional academic competition winner",
    school_top: "top student in school, valedictorian",
    participation: "participated in competition"
};


const preferenceAnchors = {
    stem_focus: "science technology engineering mathematics programs",
    business_focus: "business economics finance management",
    humanities_focus: "humanities social sciences liberal arts",
    arts_focus: "creative arts design music film",
    
    urban_campus: "urban campus large city environment",
    suburban_campus: "suburban campus",
    rural_campus: "rural campus small town",
    
    large_school: "large university many students",
    medium_school: "medium size university",
    small_school: "small college intimate classes",
    
    public_school: "public university",
    private_school: "private university",
    
    strong_career: "strong career outcomes high employment salary",
    research_heavy: "research oriented university"
  };


export {activityAnchors, awardAnchors, preferenceAnchors};
  
