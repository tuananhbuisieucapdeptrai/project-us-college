import './App.css'
//import { useState } from 'react'
import { useRef, useEffect } from 'react';
import HelixForm from '../components/Form.jsx';
import FAQ from '../components/FAQ.jsx';




function App (){
  const videoRef = useRef(null);
  const formSectionRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8;
      videoRef.current.play().catch(error => {
        console.log('Auto-play failed:', error);
      });
    }
  }, []);

  const handleSubmit = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };
  
  return <div className="app-shell">
    <div className="video-container">
      <video className="video" ref={videoRef} autoPlay muted playsInline loop>
        <source src="/assets/sky.mp4" type="video/mp4" />
      </video>
    
  
     

      <h1 className='home-header'>Your Ambition. Our Architecture. <br /> #1 AI Education Partner.</h1>
      <p className='helix-description'>Navigate the complexities of US colleges admissions with Helix - a dedicated AI assistant that refines your narrative and identifies your ideal collegiate match.</p>
      
      <button className='btn-grad' onClick={handleSubmit}>Get Started</button>
    
      {/* The overlay is what fades the video to white at the very bottom */}
      <div className="video-overlay" />
    </div>

    <div className="form-float" ref={formSectionRef}>
      <HelixForm />
      <h1 className='helix-offer'>Find your perfect match. <br />Every single time.</h1>
      <p className='helix-offer-text'>Professional-grade guidance, accessible to every student.</p>
    </div>

    {/* This is the container that will hold the form and overlap the video */}
    <div className='below-field'>
      <div className='feature-0'>
        <p className='helix-overview'>Whether you’re auditing your profile, refining your narrative, or matching with top-tier universities, Helix empowers you to move faster and apply with absolute certainty.</p>
      </div>
      <div className='feature-1'>
        <h3 className='helix-feature-1-header'>Bespoke Analysis</h3>
        <img src="/assets/helix-3.png" className="feature1-preview" />
        <p className='helix-feature-1'>Helix audits your stats and extracurriculars to provide formal, actionable feedback on your candidacy.</p>
      </div>
      <div className='feature-2'>
        <h3 className='helix-feature-2-header'>Precision Lists</h3>
        <img src="/assets/helix-2.png" className="feature2-preview" />
        <p className='helix-feature-2'>Access a curated selection of US colleges that align with your academic profile and personal goals.</p>
      </div>
      <div className='feature-3'>
        <h3 className='helix-feature-3-header'>Strategic Clarity</h3>
        <img src="/assets/helix-1.png" className="feature3-preview" />
        <p className='helix-feature-3'>Turn complex requirements into a streamlined journey with AI that understands the US landscape.</p>
      </div>
    </div>

    <div className="form-wrapper">
        <h1 className='helix-header'>Built for the way you apply</h1>
        <div className='card-1'>
          <h4 className='card-1-header'>POWERING AMBITIOUS CANDIDATES</h4>
          <p className='card-1-text'>Helix identifies exactly where you stand in the competitive landscape.</p>
          <div className='card-media'><img src="/assets/helix-9.png" className='card-1-image'/></div>
        </div>
        <div className='card-2'>
          <h4 className='card-2-header'>DISCOVERING ELITE OPPORTUNITIES</h4>
          <p className='card-2-text'>Our AI identifies the perfect institutions based on your unique trajectory and academic potential.</p>
          <div className='card-media'><img src="/assets/helix-5.png" className='card-2-image'/></div>
        </div>
        <div className='card-3'>
          <h4 className='card-3-header'>REFINING STRATEGIC STORIES</h4>
          <p className='card-3-text'>Helix ensures your application story is cohesive, professional, and strategically aligned with what top-tier colleges seek.</p>
          <div className='card-media'><img src="/assets/helix-6.png" className='card-3-image'/></div>
        </div>
        <div className='info-1'>
          <h3 className='info-1-number'>5000+</h3>
          <p className='info-1-text'>STUDENTS GUIDED</p>
        </div>
        <div className='info-2'>
          <h3 className='info-2-number'>1900+</h3>
          <p className='info-2-text'>US COLLEGES</p>
        </div>
        <div className='info-3'>
          <h3 className='info-3-number'>98%</h3>
          <p className='info-3-text'>PROFILE CLARITY</p>
        </div>
        <div className='info-4'>
          <h3 className='info-4-number'>24/7</h3>
          <p className='info-4-text'>ADMISSION SUPPORT</p>
        </div>
    </div>
    <section className="comparison-section">
      <div className="comparison-header">
        <p className="comparison-kicker">Why Helix Feels Different</p>
      </div>
      <div className="comparison-grid">
        <article className="comparison-card comparison-card-legacy">
        <div className="comparison-badge">Traditional Counselor</div>
          <p className="comparison-card-subtitle">Subjective, constrained, and slow.</p>
          <div className="comparison-visual comparison-visual-legacy">
            <div className="legacy-orbit legacy-orbit-1" />
            <div className="legacy-orbit legacy-orbit-2" />
            <div className="legacy-hub">
              <div className="legacy-avatar" />
              <span>One mentor</span>
            </div>
            <div className="legacy-node legacy-node-1">Static data</div>
            <div className="legacy-node legacy-node-2">School lists</div>
            <div className="legacy-node legacy-node-3">Essay notes</div>
          </div>
          <ul className="comparison-list">
            <li>Constrained access. Requires scheduling weeks in advance.</li>
            <li>Subjective bias. Recommendations are limited by the counselor&apos;s specific institutional knowledge.</li>
            <li>Slow iteration. Profile feedback takes days or weeks to process.</li>
          </ul>
        </article>
        <article className="comparison-card comparison-card-helix">
          <div className="comparison-badge comparison-badge-helix">HELIX</div>
          <p className="comparison-card-subtitle">Built to think across the full US college landscape in real time.</p>
          <div className="comparison-visual comparison-visual-helix">
            <div className="helix-glow helix-glow-1" />
            <div className="helix-glow helix-glow-2" />
            <div className="helix-core">AI</div>
            <div className="helix-stream helix-stream-1" />
            <div className="helix-stream helix-stream-2" />
            <div className="helix-chip helix-chip-1">Profile signals</div>
            <div className="helix-chip helix-chip-2">Institution data</div>
            <div className="helix-chip helix-chip-3">Narrative fit</div>
          </div>
         
          <ul className="comparison-list comparison-list-helix">
            <li>Infinite access. Instantly available 24/7, with zero scheduling.</li>
            <li>Data-backed precision. Uses objective data analysis across the entire US institution database.</li>
            <li>Real-time refinement. Get instant feedback on profile updates and narrative changes.</li>
          </ul>
        </article>
      </div>
    </section>
    <FAQ />
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-orb site-footer-orb-1" />
        <div className="site-footer-orb site-footer-orb-2" />
        <div className="site-footer-card">
          <div className="site-footer-copy">
            <p className="site-footer-kicker">HELIX</p>
            <h2 className="site-footer-heading">Apply with clarity, not confusion.</h2>
            <p className="site-footer-text">
              Educational AI guidance for students navigating the US college application journey, built to make admissions strategy clearer, calmer, and more accessible.
            </p>
            <button className="site-footer-cta" onClick={handleSubmit}>Get Started</button>
          </div>
          <div className="site-footer-visual">
            <div className="site-footer-chip site-footer-chip-1">24/7 access</div>
            <div className="site-footer-chip site-footer-chip-2">Data-backed fit</div>
            <div className="site-footer-chip site-footer-chip-3">Essay clarity</div>
            <div className="site-footer-panel">
              <span>Helix</span>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <a href="/" className="site-footer-brand">Helix</a>
          <div className="site-footer-links">
            <a href="/" className="site-footer-link">Overview</a>
            <a href="/" className="site-footer-link">Compare</a>
            <a href="/" className="site-footer-link">FAQ</a>
            <a href="/" className="site-footer-link">Support</a>
          </div>
          <p className="site-footer-meta">Built for ambitious applicants across the US college landscape.</p>
        </div>
      </div>
    </footer>
  </div>
  
}
export default App
