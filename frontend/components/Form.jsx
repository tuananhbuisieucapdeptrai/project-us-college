import { useState,useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL || 'http://localhost:3001/';
const baseUrl = new URL('colleges/recommend', API_BASE_URL).toString();
const getSchoolDetailsUrl = (id) => new URL(`colleges/recommend/${id}`, API_BASE_URL).toString();
const getSchoolQuestionsUrl = (id) => new URL(`colleges/recommend/${id}/questions`, API_BASE_URL).toString();
const submitInfoUrl = new URL('colleges/gathering', API_BASE_URL).toString();

const analysisSections = [
  ['strengths', 'Key Strengths'],
  ['weaknesses', 'Potential Gaps'],
  ['inferred_majors', 'Likely Majors'],
  ['competitiveness_insight', 'Competitiveness Insight'],
  ['academic_admissions_insight', 'What Admissions Officers See'],
  ['overall_feedback', 'Overall Feedback'],
  ['improvement_suggestions', 'Improvement Suggestions'],
];

const schoolAnalysisSections = [
  ['school_summary', 'School Summary'],
  ['what_school_is_known_for', 'What This School Is Known For'],
  ['academic_environment', 'Academic Environment'],
  ['relevant_programs_for_you', 'Relevant Programs For You'],
  ['fit_analysis', 'Fit Analysis'],
  ['your_strengths_for_this_school', 'Your Strengths For This School'],
  ['potential_gaps', 'Potential Gaps'],
  ['academic_experience_insight', 'Academic Experience Insight'],
  ['admission_strategy', 'Admission Strategy'],
  ['actionable_advice', 'Actionable Advice'],
  ['overall_takeaway', 'Overall Takeaway'],
  ['official_website', 'Official Website'],
];

const parseAnalysis = (analysis) => {
  if (typeof analysis !== 'string') return analysis || {};

  try {
    return JSON.parse(analysis);
  } catch {
    return { overall_feedback: analysis };
  }
};

const parseRecommendation = (recommendation) => {
  let data = recommendation;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { dream: [], realistic: [], safe: [] };
    }
  }

  if (!data || typeof data !== 'object') {
    return { dream: [], realistic: [], safe: [] };
  }

  const asArray = (value) => (Array.isArray(value) ? value : []);

  // Backward/forward compatible with tiered output.
  if (data.dream || data.realistic || data.safe) {
    return {
      dream: asArray(data.dream),
      realistic: asArray(data.realistic),
      safe: asArray(data.safe),
    };
  }

  if (Array.isArray(data.final_schools)) {
    const grouped = { dream: [], realistic: [], safe: [] };
    for (const school of data.final_schools) {
      const tier = String(school?.tier || '').toLowerCase();
      if (tier === 'dream' || tier === 'realistic' || tier === 'safe') {
        grouped[tier].push(school);
      }
    }
    return grouped;
  }

  return { dream: [], realistic: [], safe: [] };
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

const formatQuestionResponse = (data) => {
  let normalized = data;

  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced ? fenced[1] : trimmed;
    try {
      normalized = JSON.parse(candidate);
    } catch {
      normalized = { answer: normalized };
    }
  }

  if (normalized && typeof normalized.answer === 'string') {
    const answerTrimmed = normalized.answer.trim();
    const fencedAnswer = answerTrimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const answerCandidate = fencedAnswer ? fencedAnswer[1] : answerTrimmed;
    try {
      const parsedAnswer = JSON.parse(answerCandidate);
      if (parsedAnswer && typeof parsedAnswer === 'object') {
        normalized = {
          ...normalized,
          ...parsedAnswer,
        };
      }
    } catch {
      // Keep original answer string when it is not valid JSON.
    }
  }

  const sections = [
    normalized?.answer,
    ...(Array.isArray(normalized?.extra_insights) ? normalized.extra_insights : []),
    normalized?.next_step,
  ].filter((section) => typeof section === 'string' && section.trim() !== '');

  return sections.join('\n\n');
};

const profileFields = ['name', 'sat', 'budget', 'gpa', 'awards', 'activities', 'preferences'];

const emptyProfile = {
  name: '',
  sat: '',
  budget: '',
  gpa: '',
  awards: '',
  activities: '',
  preferences: '',
};

const fieldLabels = {
  name: 'Your Name',
  sat: 'SAT Score',
  budget: 'Annual Budget',
  gpa: 'GPA',
  awards: 'Awards',
  activities: 'Activities',
  preferences: 'Preferences',
};

const fieldPlaceholders = {
  name: 'Tell Helix your name...',
  sat: 'Share your SAT score...',
  budget: 'Share your annual budget...',
  gpa: 'Share your GPA...',
  awards: 'Tell Helix about awards or honors...',
  activities: 'Share activities, leadership, work, sports, or volunteering...',
  preferences: 'Share intended major, school size, culture, location, or anything else...',
};

const fieldQuestions = {
  name: [
    'What is your name?',
    'Can you tell me your name?',
    'What name should I use for your profile?',
    'How should I address you?',
    'Please share your name.',
    'What is your full name?',
  ],
  sat: [
    'What is your SAT score?',
    'Can you tell me your SAT score?',
    'What SAT score should I use for your profile?',
    'Please share your latest SAT score.',
    'What is your current or expected SAT score?',
    'What SAT result would you like Helix to use?',
  ],
  budget: [
    'What is your annual college budget?',
    'Can you share your yearly budget for college?',
    'What annual budget should I use for your college list?',
    'How much can you budget per year?',
    'What is your approximate yearly budget?',
    'Please share your expected annual budget.',
  ],
  gpa: [
    'What is your GPA?',
    'Can you tell me your GPA on a 4.0 scale?',
    'What GPA should I use for your profile?',
    'Please share your current GPA.',
    'What is your latest GPA?',
    'What GPA best represents your academic profile?',
  ],
  awards: [
    'Do you have any awards or honors?',
    'Can you share your academic awards or recognitions?',
    'What awards, honors, or distinctions should I include?',
    'Please tell me about any awards you have earned.',
    'Do you have competitions, honors, or recognitions to add?',
    'What achievements should Helix know about?',
  ],
  activities: [
    'What activities are you involved in?',
    'Can you share your extracurriculars, leadership, work, sports, or volunteering?',
    'What activities should I include in your profile?',
    'Please tell me about your commitments outside class.',
    'What leadership, clubs, projects, or service have you done?',
    'What parts of your story outside academics should Helix know?',
  ],
  preferences: [
    'What are your college preferences?',
    'Can you share your intended major, location, size, culture, or other preferences?',
    'What kind of colleges are you hoping to find?',
    'Please tell me what matters most in your college search.',
    'What major, campus style, or environment are you looking for?',
    'What should Helix prioritize when matching colleges for you?',
  ],
};

const getInitialProfile = ({ name, sat, budget, gpa, awards, activities, preferences }) => ({
  ...emptyProfile,
  name: name || '',
  sat: sat || '',
  budget: budget || '',
  gpa: gpa || '',
  awards: awards || '',
  activities: activities || '',
  preferences: preferences || '',
});

const normalizeGatherResponse = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { reply: data, field_updates: {}, next_field: '', is_valid: false };
    }
  }

  return data || {};
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const getNextFieldByOrder = (field) => {
  const index = profileFields.indexOf(field);
  if (index === -1) return field;
  return profileFields[index + 1] || 'complete';
};

const getValidField = (field, fallback = 'name') => (
  profileFields.includes(field) || field === 'complete' ? field : fallback
);

const getQuestionForField = (field) => {
  const questions = fieldQuestions[field] || fieldQuestions.name;
  return questions[Math.floor(Math.random() * questions.length)];
};

const composeAssistantMessage = ({ reply, question }) => (
  [reply, question].filter((part) => typeof part === 'string' && part.trim() !== '').join(' ')
);

const getFirstMissingField = (profile) => (
  profileFields.find((field) => String(profile?.[field] || '').trim() === '') || 'complete'
);

const normalizeFieldUpdates = ({ fieldUpdates, currentField, answer, isValidAnswer }) => {
  if (fieldUpdates && typeof fieldUpdates === 'object' && !Array.isArray(fieldUpdates)) {
    return Object.fromEntries(
      Object.entries(fieldUpdates).filter(([field]) => profileFields.includes(field))
    );
  }

  if (!isValidAnswer) return {};

  if (typeof fieldUpdates === 'string' && profileFields.includes(fieldUpdates)) {
    return { [fieldUpdates]: answer };
  }

  return { [currentField]: answer };
};

const HelixRequestUpdated = ({ builtProfile, setBuiltProfile, submitProfile, name, setName, sat, setSat, gpa, setGpa, budget, setBudget, awards, setAwards, activities, setActivities, preferences, setPreferences}) => {
  const [answer, setAnswer] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      type: 'text',
      text: `Hello, this is Helix, your AI admissions assistant. Before I help you, let's first get to know you. ${getQuestionForField('name')}`,
    },
  ]);
  const [answering, setAnswering] = useState(false);
  const [currentField, setCurrentField] = useState('name');
  const [started, setStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const threadRef = useRef(null);

  const currentProfile = builtProfile || getInitialProfile({ name, sat, budget, gpa, awards, activities, preferences });

  useEffect(() => {
    if (!builtProfile) {
      setBuiltProfile(currentProfile);
    }
  }, [builtProfile, currentProfile, setBuiltProfile]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, answering]);

  const syncProfileState = (profile) => {
    setName(profile.name || '');
    setSat(profile.sat || '');
    setBudget(profile.budget || '');
    setGpa(profile.gpa || '');
    setAwards(profile.awards || '');
    setActivities(profile.activities || '');
    setPreferences(profile.preferences || '');
  };

  const isProfileComplete = (profile) => (
    profileFields.every((field) => String(profile?.[field] || '').trim() !== '')
  );

  const handleAnswer = async () => {
    const trimmedAnswer = answer.trim();
    if (answering || isSubmitting) return;

    if (!trimmedAnswer) return;

    setMessages((current) => [
      ...current,
      { role: 'user', type: 'text', text: trimmedAnswer, label: fieldLabels[currentField] || 'Your Answer' },
    ]);
    setAnswer('');
    setAnswering(true);

    try {
      const state = {
        current_field: currentField,
        student_profile: currentProfile,
        user_message: trimmedAnswer,
      };

      const response = await axios.post(submitInfoUrl, { state });
      const data = normalizeGatherResponse(response.data);
      const isValidAnswer = normalizeBoolean(data.is_valid);
      const fieldUpdates = normalizeFieldUpdates({
        fieldUpdates: data.field_updates,
        currentField,
        answer: trimmedAnswer,
        isValidAnswer,
      });
      const fallbackNextField = getNextFieldByOrder(currentField);
      const nextProfile = isValidAnswer
        ? { ...currentProfile, ...fieldUpdates }
        : currentProfile;
      const firstMissingField = getFirstMissingField(nextProfile);
      const nextField = isValidAnswer
        ? getValidField(data.next_field, fallbackNextField)
        : currentField;
      const safeNextField = nextField === 'complete' && firstMissingField !== 'complete'
        ? firstMissingField
        : nextField;
      const questionField = isValidAnswer ? safeNextField : currentField;
      const nextQuestion = questionField === 'complete' ? '' : getQuestionForField(questionField);
      const assistantText = composeAssistantMessage({
        reply: data.reply,
        question: nextQuestion,
      });

      setBuiltProfile(nextProfile);
      syncProfileState(nextProfile);
      setCurrentField(safeNextField);

      if (assistantText) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            type: 'text',
            text: assistantText,
          },
        ]);
      }

      if (isValidAnswer && isProfileComplete(nextProfile)) {
        setIsSubmitting(true);
        await submitProfile(nextProfile);
        return;
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          type: 'text',
          text: 'I could not process your answer right now. Please try again.',
        },
      ]);
    } finally {
      setAnswering(false);
      setIsSubmitting(false);
    }
  };

  const handleAnswerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAnswer();
    }
  };

  return (
    <div className='container-form helix-request-shell'>
      <div className={`helix-request-panel ${started ? 'helix-request-panel-expanded helix-interaction-panel' : 'helix-request-panel-collapsed'}`}>
      {!started ? (
          <div className='helix-request-start'>
            <p className='helix-result-kicker'>Helix Intake</p>
            <h2 className='helix-request-start-title'>Start a guided conversation with Helix.</h2>
            <p className='helix-request-start-copy'>A short chat is all it takes for Helix to understand your story and build a sharper college list.</p>
            <button type='button' className='helix-request-start-button' onClick={() => setStarted(true)}>
              Start Helix
            </button>
          </div>
        ) :(
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
          <div className='helix-request-thread helix-interaction-thread' ref={threadRef}>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`helix-chat-row helix-chat-row-${message.role}`}>
                <div className={`helix-chat-bubble helix-chat-bubble-${message.role}`}>
                  {message.label && <span className='helix-chat-label'>{message.label}</span>}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            {answering && (
              <div className='helix-chat-row helix-chat-row-assistant'>
                <div className='helix-chat-bubble helix-chat-bubble-assistant helix-chat-bubble-intro'>
                  <p>Helix is reading your answer...</p>
                </div>
              </div>
            )}
          </div>
          <div className='helix-request-composer'>
            <div className='helix-request-field-wrap'>
              <textarea
                className='helix-request-field helix-request-field-textarea helix-interaction-field'
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleAnswerKeyDown}
                placeholder={fieldPlaceholders[currentField] || 'Type your answer...'}
                rows={2}
              />
            </div>
            <button type='button' className='helix-request-send' onClick={handleAnswer} disabled={!answer.trim() || answering || isSubmitting}>
              {isSubmitting ? 'Analyzing' : answering ? 'Thinking' : 'Send'}
            </button>
          </div>
        </div>
        </>)}
      </div>
    </div>);
}






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

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (started && activePrompt) {
      setCurrentInput(activePrompt.value || '');
    }
  }, [started, step]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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

const HelixResponse = ({ analysis, recommendation, handleDetails, onReset })=>{
  
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
            <button
              className='helix-school-link'
              type='button'
              onClick={() => handleDetails(school)}
            >
              See details
            </button>
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

const HelixInteraction = ({ school, studentProfile, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [asking, setAsking] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSchoolDetails = async () => {
      setLoadingDetails(true);
      try {
        const response = await axios.post(getSchoolDetailsUrl(school.unitid || school.id), studentProfile);
        if (!isMounted) return;
        setMessages([
          {
            role: 'assistant',
            type: 'school-analysis',
            data: response.data,
          },
        ]);
      } catch {
        if (!isMounted) return;
        setMessages([
          {
            role: 'assistant',
            type: 'text',
            text: 'I ran into a problem while loading this school. Please try again in a moment.',
          },
        ]);
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
        }
      }
    };

    fetchSchoolDetails();

    return () => {
      isMounted = false;
    };
  }, [school, studentProfile]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, loadingDetails]);

  const handleAsk = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || asking) return;

    const nextUserMessage = { role: 'user', type: 'text', text: trimmedQuestion, label: 'Your Question' };
    const currentThread = [...messages, nextUserMessage];
    const turnIndex = currentThread.filter((message) => message.role === 'user' && message.type === 'text').length;
    const conversationContext = currentThread
      .filter((message) => message.type === 'text')
      .slice(-6)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));

    setMessages(currentThread);
    setQuestion('');
    setAsking(true);

    try {
      const response = await axios.post(getSchoolQuestionsUrl(school.unitid || school.id), {
        ...studentProfile,
        question: trimmedQuestion,
        turn_index: turnIndex,
        conversation_context: conversationContext,
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          type: 'text',
          text: formatQuestionResponse(response.data),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          type: 'text',
          text: 'I could not answer that question right now. Please try again.',
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleQuestionKeyDown = (event) => {
    if(event.key === 'Enter' && !event.shiftKey){
    //if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className='container-form helix-result-shell'>
      <div className='helix-result-panel helix-interaction-panel'>
        <div className='helix-result-header'>
          <button type='button' className='helix-result-reset' onClick={onBack} aria-label='Back to recommended schools'>
            <span aria-hidden='true'>←</span>
          </button>
          <p className='helix-result-kicker'>School Interaction</p>
          <h2 className='helix-result-title'>{school.name}</h2>
        </div>
        <div className='helix-analysis-window helix-request-window'>
          <div className='helix-analysis-toolbar'>
            <span className='helix-analysis-dot'></span>
            <span className='helix-analysis-dot'></span>
            <span className='helix-analysis-dot'></span>
            <p className='helix-analysis-label'>Helix School Chat</p>
          </div>
          <div className='helix-request-thread helix-interaction-thread' ref={threadRef}>
            {loadingDetails ? (
              <div className='helix-chat-row helix-chat-row-assistant'>
                <div className='helix-chat-bubble helix-chat-bubble-assistant'>
                  <p>Gathering your school-specific analysis now...</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`helix-chat-row helix-chat-row-${message.role}`}>
                  <div className={`helix-chat-bubble helix-chat-bubble-${message.role} ${message.type === 'school-analysis' ? 'helix-chat-bubble-analysis' : ''}`}>
                    {message.label && <span className='helix-chat-label'>{message.label}</span>}
                    {message.type === 'school-analysis' ? (
                      <div className='helix-school-analysis'>
                        {schoolAnalysisSections.map(([key, label]) => {
                          const value = message.data?.[key];
                          if (!value || (Array.isArray(value) && value.length === 0)) return null;

                          return (
                            <section key={key} className='helix-school-analysis-section'>
                              <h3 className='helix-school-analysis-title'>{label}</h3>
                              {Array.isArray(value) ? (
                                <ul className='helix-school-analysis-list'>
                                  {value.map((item, itemIndex) => (
                                    <li key={`${key}-${itemIndex}`}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{value}</p>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <p>{message.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className='helix-request-composer'>
            <div className='helix-request-field-wrap'>
              <textarea
                className='helix-request-field helix-request-field-textarea helix-interaction-field'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder={`Ask Helix anything about ${school.name}...`}
                rows={2}
              />
            </div>
            <button type='button' className='helix-request-send' onClick={handleAsk} disabled={!question.trim() || asking || loadingDetails}>
              {asking ? 'Thinking' : 'Ask'}
            </button>
          </div>
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
  const [submittedProfile, setSubmittedProfile] = useState(null);
  const [builtProfile, setBuiltProfile] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);


  function handleReset() {
    setLoading(false);
    setLoaded(false);
    setSelectedSchool(null);
    setSubmittedProfile(null);
    setBuiltProfile(null);
    setName('');
    setSat('');
    setGpa('');
    setBudget('');
    setAwards('');
    setActivities('');
    setPreferences('');
    setAnalysis('');
    setRecommendation('');
  }

  function handleInteractionBack() {
    setSelectedSchool(null);
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
    setSubmittedProfile(payload);
    const response = await axios.post(`${baseUrl}`, payload);
    setAnalysis(response.data.analysis);
    const normalizedRecommendation = parseRecommendation(response.data.recommender ?? response.data.recommendation);
    setRecommendation(normalizedRecommendation);
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
  
  const handleDetails = (school) => {
    setSelectedSchool(school);
  }


  return (<>
     {loading && <HelixLoading onReset={handleReset} />}
    {!loading && !selectedSchool && loaded && <HelixResponse analysis={analysis} recommendation = {recommendation} handleDetails={handleDetails} onReset={handleReset} />}
    {!loading && selectedSchool && submittedProfile && <HelixInteraction school={selectedSchool} studentProfile={submittedProfile} onBack={handleInteractionBack} />}
    {!loading && !loaded && <HelixRequestUpdated builtProfile={builtProfile} setBuiltProfile={setBuiltProfile} submitProfile = {submitProfile} name = {name} setName ={setName} sat = {sat} setSat = {setSat} gpa= {gpa} setGpa = {setGpa} budget = {budget} setBudget = {setBudget} awards = {awards} setAwards = {setAwards} activities = {activities} setActivities = {setActivities} preferences = {preferences} setPreferences = {setPreferences} />}
  </>
  );
}


export default HelixForm;
