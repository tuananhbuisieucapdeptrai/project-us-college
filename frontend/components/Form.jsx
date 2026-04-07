import { useState,useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.API_BASE_URL || 'http://localhost:3001';
const baseUrl = `${API_BASE_URL}/colleges/recommend`;

const analysisSections = [
  ['strengths', 'Key Strengths'],
  ['weaknesses', 'Potential Gaps'],
  ['inferred_majors', 'Likely Majors'],
  ['competitiveness_insight', 'Competitiveness Insight'],
  ['academic_admissions_insight', 'What Admissions Officers See'],
  ['overall_feedback', 'Overall Feedback'],
  ['improvement_suggestions', 'Improvement Suggestions'],
];

const parseAnalysis = (analysis) => {
  if (typeof analysis !== 'string') return analysis || {};

  try {
    return JSON.parse(analysis);
  } catch (error) {
    return { overall_feedback: analysis };
  }
};

const normalizeUrl = (url) => {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const formatAcceptanceRate = (rate) => {
  const value = Number(rate);
  if (Number.isNaN(value)) return 'N/A';
  return `${Math.round(value * 100)}%`;
};

const formatSize = (size) => {
  const value = Number(size);
  if (Number.isNaN(value)) return 'N/A';
  return value.toLocaleString();
};

const HelixRequest = ({ handleSubmit, name, setName, sat, setSat, gpa, setGpa, budget, setBudget, awards, setAwards, activities, setActivities, preferences, setPreferences }) => {
  return(
  <form className= "container-form"onSubmit={handleSubmit}>
  <div >
    <input
      className="form-name"
      type="text"
      id="name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Tell us your name <3"
    />
  </div>

  {/* SAT Score */}
  <div>
    <input
      className="form-sat"
      type = "text"
      id="sat"
      value={sat}
      onChange={(e) => setSat(e.target.value)}
      placeholder="How well did you perform on the SAT?"
    />
  </div>

  {/* GPA */}
  <div>
    <input
      className="form-gpa"
      type="text"
      id="gpa"
      value={gpa}
      onChange={(e) => setGpa(e.target.value)}
      placeholder="What is your GPA?"
    />
  </div>

  {/* Budget */}
  <div >
    <input
      className="form-budget"
      type="text"
      id="budget"
      value={budget}
      onChange={(e) => setBudget(e.target.value)}
      placeholder="What is your annual budget?"
   
    />
  </div>

  {/* Awards */}
  <div >
    <textarea
      className="form-awards"
      id="awards"
      value={awards}
      onChange={(e) => setAwards(e.target.value)}
      placeholder="Do you have any academic awards, honors, or recognitions. Examples: National Merit Scholar, Science Olympiad Gold Medal, AP Scholar with Distinction."
      
    />
  </div>

  {/* Activities */}
  <div >
    <textarea
      className="form-activities"
      id="activities"
      value={activities}
      onChange={(e) => setActivities(e.target.value)}
      placeholder="Tell us your story. Do you have any leadership roles, clubs, sports, volunteering, or other activities. Examples: Debate Club Captain, Volunteer Tutor, Varsity Soccer."
      
    />
  </div>

  {/* Preferences */}
  <div >
    <textarea
      className="form-preferences"
      id="preferences"
      value={preferences}
      onChange={(e) => setPreferences(e.target.value)}
      placeholder="What is your preferences, intended major, desired school size, campus culture, or other priorities — Helix will find schools aligned with your vision."
      rows={4}
    />
  </div>

  <button className = "button-submit"type="submit">Try Helix</button>
</form>
);}

const HelixResponse = ({ analysis, recommendation, onReset })=>{
  const parsedAnalysis = parseAnalysis(analysis);
  const schoolTiers = [
    { key: 'dream', label: 'Dream' },
    { key: 'realistic', label: 'Realistic' },
    { key: 'safe', label: 'Safe' },
  ];

  const schools = schoolTiers.flatMap((tier) =>
    (recommendation?.[tier.key] || []).map((school, index) => ({
      ...school,
      tier: tier.label,
      id: school.unitid || `${tier.key}-${index}-${school.name}`,
    }))
  );

  return <div className='container-form helix-result-shell'>
    <div className='helix-result-panel'>
      <div className='helix-result-header'>
        <button type='button' className='helix-result-reset' onClick={onReset} aria-label='Go back to form'>
          <span aria-hidden='true'>←</span>
        </button>
        <p className='helix-result-kicker'>Helix Analysis</p>
        <h2 className='helix-result-title'>Your application profile.</h2>
      </div>
      <div className='helix-analysis-window'>
        <div className='helix-analysis-toolbar'>
          <span className='helix-analysis-dot'></span>
          <span className='helix-analysis-dot'></span>
          <span className='helix-analysis-dot'></span>
          <p className='helix-analysis-label'>Analysis Console</p>
        </div>
        <div className='helix-analysis-body'>
          {analysisSections.map(([key, label]) => {
            const value = parsedAnalysis?.[key];
            if (!value || (Array.isArray(value) && value.length === 0)) return null;

            return (
              <section key={key} className='helix-analysis-section'>
                <h3 className='helix-analysis-section-title'>{label}</h3>
                {Array.isArray(value) ? (
                  <ul className='helix-analysis-list'>
                    {value.map((item, index) => (
                      <li key={`${key}-${index}`} className='helix-analysis-list-item'>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className='helix-analysis-paragraph'>{value}</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
      <div className='helix-recommend-grid'>
        {schools.map((school) => (
          <article key={school.id} className='helix-school-card'>
            <div className='helix-school-card-top'>
              <span className={`helix-school-tier helix-school-tier-${school.tier.toLowerCase()}`}>{school.tier}</span>
              <h3 className='helix-school-name'>{school.name}</h3>
              <p className='helix-school-location'>{school.city}, {school.state}</p>
            </div>
            <ul className='helix-school-stats'>
              <li className='helix-school-stat-item'>
                <span className='helix-school-stat-icon'>•</span>
                <span className='helix-school-stat-copy'>
                  <span className='helix-school-stat-label'>School size</span>
                  <span className='helix-school-stat-value'>{formatSize(school.student_size)}</span>
                </span>
              </li>
              <li className='helix-school-stat-item'>
                <span className='helix-school-stat-icon'>•</span>
                <span className='helix-school-stat-copy'>
                  <span className='helix-school-stat-label'>Acceptance rate</span>
                  <span className='helix-school-stat-value'>{formatAcceptanceRate(school.admission_rate)}</span>
                </span>
              </li>
            </ul>
            <a
              className='helix-school-link'
              href={normalizeUrl(school.school_url)}
              target='_blank'
              rel='noreferrer'
            >
              Visit Website
            </a>
          </article>
        ))}
      </div>
    </div>
  </div>
}

const HelixLoading = ({ onReset }) => {
  const [step, setStep] = useState(0);
  
  const messages = [
    "Synthesizing your academic profile...",
    "Performing multi-dimensional candidacy audit...",
    "Mapping institutional requirements to your goals...",
    "Securing your tailored recommendations."
  ];
  
  useEffect(() => {
    if (step < messages.length - 1) {
      const timer = setTimeout(() => {
        setStep(step + 1);
      }, 2000); // 2 seconds between each message
      
      return () => clearTimeout(timer);
    }
  }, [step, messages.length]);
  
  return (
    <div className='container-form helix-result-shell'>
      <div className='helix-loading-panel'>
        <div className='helix-loading-header'>
          <button type='button' className='helix-result-reset' onClick={onReset} aria-label='Go back to form'>
            <span aria-hidden='true'>←</span>
          </button>
          <p className='helix-result-kicker'>Helix Working</p>
          <h2 className='helix-result-title'>Building your analysis and recommendation set.</h2>
        </div>
        <div className='helix-loading-console'>
          <div className='helix-analysis-toolbar'>
            <span className='helix-analysis-dot'></span>
            <span className='helix-analysis-dot'></span>
            <span className='helix-analysis-dot'></span>
            <p className='helix-analysis-label'>Processing Stream</p>
          </div>
          <div className='helix-loading-messages'>
            {messages.slice(0, step + 1).map((message, index) => (
              <div key={index} className='helix-loading-message'>
                <span className='helix-loading-pulse'></span>
                <p>{message}</p>
              </div>
            ))}
          </div>
        </div>
        <div className='helix-loading-cards'>
          {[1, 2, 3].map((item) => (
            <div key={item} className='helix-loading-card'></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelixForm() {
  const [name, setName] = useState('');
  const [sat, setSat] = useState('');
  const [gpa, setGpa] = useState('');
  const [budget, setBudget] = useState('');
  const [awards, setAwards] = useState('');
  const [activities, setActivities] = useState('');
  const [preferences, setPreferences] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loaded,setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleReset() {
    setLoading(false);
    setLoaded(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);  
    setLoaded(false); 
    try{
    const profileData = {name, sat: Number(sat), gpa: Number(gpa), budget: Number(budget), awards, activities, preferences};
    const response = await axios.post(`${baseUrl}`, profileData);
    setName('');
    setSat('');
    setGpa('');
    setBudget('');
    setAwards('');
    setActivities('');
    setPreferences('');
    setAnalysis(response.data.analysis);
    setRecommendation(response.data.recommendation);
    setLoaded(true);
    
    console.log('Profile submitted:', response.data);
  }
  catch(err){
    console.error('Error submitting form:', err);
    alert('Something went wrong. Please try again.');
    setLoaded(false);
    } finally {
      setLoading(false); 
    }
  }
  
  return (<>
     {loading && <HelixLoading onReset={handleReset} />}
    {!loading && loaded && <HelixResponse analysis={analysis} recommendation = {recommendation} onReset={handleReset} />}
    {!loading && !loaded && <HelixRequest handleSubmit = {handleSubmit} name = {name} setName ={setName} sat = {sat} setSat = {setSat} gpa= {gpa} setGpa = {setGpa} budget = {budget} setBudget = {setBudget} awards = {awards} setAwards = {setAwards} activities = {activities} setActivities = {setActivities} preferences = {preferences} setPreferences = {setPreferences} />}
  </>
  );
}


export default HelixForm;
