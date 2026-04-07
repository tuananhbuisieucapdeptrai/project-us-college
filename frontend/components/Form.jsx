import { useState,useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/';
const baseUrl = new URL('colleges/recommend', API_BASE_URL).toString();

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

const HelixRequest = ({ submitProfile, name, setName, sat, setSat, gpa, setGpa, budget, setBudget, awards, setAwards, activities, setActivities, preferences, setPreferences }) => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const threadRef = useRef(null);

  const prompts = [
    {
      key: 'name',
      label: 'Your name',
      question: "Hello, this is Helix, your AI admissions assistant. Before I help you, let's first get to know you. What is your name?",
      followUp: (value) => `Hi ${value}, glad you're here. What is your SAT score?`,
      type: 'text',
      value: name,
      setValue: setName,
      placeholder: 'Type your name',
    },
    {
      key: 'sat',
      label: 'SAT score',
      question: '',
      followUp: () => 'What about your budget? Share your annual budget so I can factor affordability into your list.',
      type: 'text',
      value: sat,
      setValue: setSat,
      placeholder: 'e.g. 1450',
    },
    {
      key: 'budget',
      label: 'Annual budget',
      question: '',
      followUp: () => 'Great. And what is your GPA?',
      type: 'text',
      value: budget,
      setValue: setBudget,
      placeholder: 'e.g. 30000',
    },
    {
      key: 'gpa',
      label: 'GPA',
      question: '',
      followUp: () => 'Do you have any academic awards, honors, or recognitions?',
      type: 'text',
      value: gpa,
      setValue: setGpa,
      placeholder: 'e.g. 3.9',
    },
    {
      key: 'awards',
      label: 'Awards',
      question: '',
      followUp: () => 'Now let me know your story, do you have any activities, leadership, sports, volunteering, or other commitments you would like to share?',
      type: 'textarea',
      value: awards,
      setValue: setAwards,
      placeholder: 'Examples: National Merit Scholar, AP Scholar with Distinction...',
    },
    {
      key: 'activities',
      label: 'Activities',
      question: '',
      followUp: () => 'Last one: what are your preferences? Intended major, school size, campus culture, or anything else that matters to you.',
      type: 'textarea',
      value: activities,
      setValue: setActivities,
      placeholder: 'Examples: Debate captain, robotics club, varsity soccer...',
    },
    {
      key: 'preferences',
      label: 'Preferences',
      question: '',
      followUp: () => 'Gathering complete. Helix will analyze your profile now and match you with potential colleges.',
      type: 'textarea',
      value: preferences,
      setValue: setPreferences,
      placeholder: 'Examples: Computer science, medium-sized school, collaborative culture...',
    },
  ];

  const activePrompt = prompts[step];

  useEffect(() => {
    if (started && activePrompt) {
      setCurrentInput(activePrompt.value || '');
    }
  }, [started, step]);

  const conversation = [];

  if (started) {
    conversation.push({ role: 'assistant', text: prompts[0].question });

    for (let index = 0; index < step; index += 1) {
      const prompt = prompts[index];
      if (prompt.value) {
        conversation.push({ role: 'user', text: prompt.value, label: prompt.label });
        conversation.push({ role: 'assistant', text: prompt.followUp(prompt.value) });
      }
    }
  }

  useEffect(() => {
    if (started && threadRef.current) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [started, step, conversation.length]);

  const handleAdvance = async () => {
    const trimmedValue = currentInput.trim();
    if (!trimmedValue || isSubmitting || !activePrompt) return;

    activePrompt.setValue(trimmedValue);

    if (step === prompts.length - 1) {
      setIsSubmitting(true);
      await submitProfile({
        name: prompts[0].key === activePrompt.key ? trimmedValue : name,
        sat: prompts[1].key === activePrompt.key ? trimmedValue : sat,
        budget: prompts[2].key === activePrompt.key ? trimmedValue : budget,
        gpa: prompts[3].key === activePrompt.key ? trimmedValue : gpa,
        awards: prompts[4].key === activePrompt.key ? trimmedValue : awards,
        activities: prompts[5].key === activePrompt.key ? trimmedValue : activities,
        preferences: prompts[6].key === activePrompt.key ? trimmedValue : preferences,
      });
      return;
    }

    setStep((currentStep) => currentStep + 1);
  };

  const handleKeyDown = (event) => {
    if (activePrompt?.type !== 'textarea' && event.key === 'Enter') {
      event.preventDefault();
      handleAdvance();
    }
  };

  return (
    <div className="container-form helix-request-shell">
      <div className={`helix-request-panel ${started ? 'helix-request-panel-expanded' : 'helix-request-panel-collapsed'}`}>
        {!started ? (
          <div className='helix-request-start'>
            <p className='helix-result-kicker'>Helix Intake</p>
            <h2 className='helix-request-start-title'>Start a guided conversation with Helix.</h2>
            <p className='helix-request-start-copy'>A short chat is all it takes for Helix to understand your story and build a sharper college list.</p>
            <button type='button' className='helix-request-start-button' onClick={() => setStarted(true)}>
              Start Helix
            </button>
          </div>
        ) : (
          <>
            <div className='helix-result-header'>
              <p className='helix-result-kicker'>Helix Intake</p>
              <h2 className='helix-result-title'>Let&apos;s build your profile together.</h2>
            </div>
            <div className='helix-analysis-window helix-request-window'>
              <div className='helix-analysis-toolbar'>
                <span className='helix-analysis-dot'></span>
                <span className='helix-analysis-dot'></span>
                <span className='helix-analysis-dot'></span>
                <p className='helix-analysis-label'>Guided Profile Chat</p>
              </div>
              <div className='helix-request-thread' ref={threadRef}>
                {conversation.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`helix-chat-row helix-chat-row-${message.role}`}>
                    <div className={`helix-chat-bubble helix-chat-bubble-${message.role} ${message.kind === 'intro' ? 'helix-chat-bubble-intro' : ''}`}>
                      {message.label && <span className='helix-chat-label'>{message.label}</span>}
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className='helix-request-composer'>
                <div className='helix-request-field-wrap'>
                  {activePrompt.type === 'textarea' ? (
                    <textarea
                      className='helix-request-field helix-request-field-textarea'
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={activePrompt.placeholder}
                      rows={4}
                    />
                  ) : (
                    <input
                      className='helix-request-field'
                      type='text'
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={activePrompt.placeholder}
                    />
                  )}
                </div>
                <button type='button' className='helix-request-send' onClick={handleAdvance} disabled={!currentInput.trim() || isSubmitting}>
                  {step === prompts.length - 1 ? 'Analyze' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
      <div className='helix-recommend-header'>
        <p className='helix-recommend-kicker'>Recommended Schools</p>
        <h3 className='helix-recommend-title'>A curated set of colleges aligned with your profile.</h3>
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

  async function submitProfile(profileData) {
    setLoading(true);  
    setLoaded(false); 
    try{
    const payload = {
      ...profileData,
      sat: Number(profileData.sat),
      gpa: Number(profileData.gpa),
      budget: Number(profileData.budget),
    };
    const response = await axios.post(`${baseUrl}`, payload);
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
    {!loading && !loaded && <HelixRequest submitProfile = {submitProfile} name = {name} setName ={setName} sat = {sat} setSat = {setSat} gpa= {gpa} setGpa = {setGpa} budget = {budget} setBudget = {setBudget} awards = {awards} setAwards = {setAwards} activities = {activities} setActivities = {setActivities} preferences = {preferences} setPreferences = {setPreferences} />}
  </>
  );
}


export default HelixForm;
