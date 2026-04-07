import { useState } from 'react';

const faqs = [
  {
    q: "How does Helix compare to a human counselor?",
    a: "Helix uses deep data analysis of thousands of successful US admission cycles to provide objective, data-backed feedback on your stats and narrative. While a human offers emotional nuance, Helix offers unbiased precision and instant 24/7 accessibility."
  },
  {
    q: "Is my personal data and academic profile secure?",
    a: "Absolutely. Your profile information is used solely to generate your personalized feedback and school matches. We do not sell student data to third parties."
  },
  {
    q: "How does Helix determine my ideal college list?",
    a: "Our matching engine analyzes the full architecture of your profile — GPA, test scores, extracurricular themes, and personal interests — and cross-references them with institutional preferences to find where you are most likely to be admitted and thrive."
  },
  {
    q: "Can I use Helix for graduate applications too?",
    a: "Currently, Helix is optimized for US undergraduate admissions. This allows us to provide the most specialized and accurate feedback for high school students aiming for premier American universities."
  },
  {
    q: "Is Helix actually free to use?",
    a: "Yes. Our mission is to democratize elite college guidance. Helix provides its core features — Profile Audits, School Matching, and Narrative Refinement — at zero cost to the student."
  },
  {
    q: "Can Helix help me write my Common App essay?",
    a: "Helix acts as a strategic partner. It helps you refine your narrative by identifying gaps in your story and suggesting structural improvements — ensuring your unique voice remains yours while meeting the standards of top-tier admissions offices."
  },
];

function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <div className="faq-wrap">
      <div className="faq-left">
        <p className="faq-label">Wondering something?</p>
        <h2 className="faq-title">Frequently asked<br />questions</h2>
      </div>
      <div className="faq-right">
        {faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
            <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
              <span>{faq.q}</span>
              <div className="faq-icon" />
            </div>
            <div className="faq-a">
              <p>{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQ;