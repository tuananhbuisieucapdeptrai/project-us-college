# Helix

Helix is an AI-powered US college admissions copilot. It combines quantitative matching, embedding-based similarity, and LLM reasoning to help students understand their profile and discover a realistic, personalized college list.

## Motivation

US admissions guidance is often expensive, uneven, and hard to access. Helix is built to make high-quality strategy more accessible by giving students:
- clear profile feedback
- data-backed school matching
- practical next-step guidance
- instant iteration through conversation

## Mission

Helix exists to democratize strong admissions guidance.

The mission is to provide:
- `accessible` strategy for students without private counseling
- `personalized` recommendations beyond static rankings
- `explainable` outputs (why this profile, why these schools)
- `actionable` advice students can use immediately

---

## What Helix Does Today

Helix supports an end-to-end workflow:

1. Student completes guided intake chat (`name`, `sat`, `budget`, `gpa`, `awards`, `activities`, `preferences`).
2. Backend produces profile analysis via LLM (`strengths`, `weaknesses`, major inference, competitiveness insight, improvement plan).
3. Backend builds a candidate school pool from Supabase and computes fit signals.
4. Schools are tiered into `dream`, `realistic`, `safe`.
5. A second LLM stage (RAG-like shortlist reranker) selects final schools from candidates only.
6. Frontend renders analysis + recommended schools.
7. Student can open any school and get:
   - school-specific fit analysis
   - follow-up Q&A grounded in school + student context

---

## Architecture

### Frontend
- React 19 + Vite
- Axios for API calls
- Custom CSS UI with guided chat intake, analysis console, recommendation cards, and school interaction chat

### Backend
- Node.js + Express
- Supabase data access
- Hugging Face embeddings (`BAAI/bge-base-en-v1.5`)
- Groq OpenAI-compatible API (`llama-3.1-8b-instant`) for structured analysis and selection

### Data Sources
- Supabase tables used by runtime:
  - `anchors`
  - `colleges_simple`
  - `colleges_embedding`
  - `colleges_metadata`

---

## Recommendation Pipeline (Current)

Implemented mainly in `backend/controllers/Colleges.js` and `backend/src/scoring/*`:

1. **Candidate filtering**
   - Filters by SAT window and tuition affordability from `colleges_simple`.

2. **School feature enrichment**
   - Computes missing `academic_score`, `activity_embedding`, and `preference_embedding` for schools in `colleges_embedding`.

3. **Student embedding signals**
   - Embeds student activities and preferences.

4. **Tier assignment**
   - Uses `getAdmissionTier` with SAT delta + selectivity logic.
   - Includes broader safe rules to reduce empty-safe cases.
   - If safe is still empty, deterministic fallback moves a slice of realistic schools into safe.

5. **Tier scoring/ranking**
   - Scores each school with weighted fit + outcomes tie-breaker.

6. **Fit signal labeling**
   - Converts numeric signals to `weak/moderate/strong` buckets via `convertFit`.

7. **LLM shortlist reranking (RAG-like stage)**
   - Sends compact candidate representations to `chooseColleges`.
   - LLM returns selected school IDs by tier.
   - Backend rehydrates selected IDs with full metadata and dedupes across tiers.

8. **Robust parsing + fallback**
   - Handles fenced JSON, loose JSON-like outputs, and partial prose recovery.
   - Falls back to deterministic shortlist if LLM selection is empty.

---

## LLM Features

Implemented in `backend/models/llm.js`:

- `analyzeStudentProfile(...)`
  - Structured admissions feedback JSON.

- `getStudentInformation(state)`
  - Intake field validation/extraction for guided frontend chat.

- `chooseColleges(safe, realistic, dream, student)`
  - Compact payload ranking with strict JSON output expectations.
  - Token-optimized prompt for reliability and lower request size.

- `analyzeSchoolInformation(school, student)`
  - Deep school-level fit analysis.

- `answeringQuestion(question, school, student)`
  - Follow-up school Q&A in structured JSON.

---

## API Endpoints

Mounted under `/colleges`.

- `GET /colleges/`
  - Returns simple colleges table output.

- `GET /colleges/details`
  - Returns detailed embedding table output.

- `POST /colleges/gather` and `POST /colleges/gathering`
  - Intake validation/field extraction assistant.

- `POST /colleges/recommend`
  - Main pipeline.
  - Returns:
    - `analysis` (LLM profile analysis)
    - `recommender` with `dream/realistic/safe` school arrays

- `POST /colleges/recommend/:id`
  - Returns school-specific analysis JSON.

- `POST /colleges/recommend/:id/questions`
  - Returns answer JSON for user follow-up question.

---

## Frontend Experience

Main files:
- `frontend/src/App.jsx`
- `frontend/components/Form.jsx`
- `frontend/components/FAQ.jsx`

Key behavior:
- Hero + product sections and animated intake entry point.
- Guided conversational intake (LLM-validated field flow).
- Loading stream while backend computes analysis/recommendations.
- Structured analysis console rendering.
- Tiered recommendation cards.
- School interaction panel with:
  - generated school analysis
  - continuous follow-up question flow

---

## Data/Prep Scripts

`backend/scripts/` contains ingestion and preprocessing helpers:

- `fetchProgram.js` – fetches CIP program data from College Scorecard API.
- `reduceProgram.js` – reduces program payload to `cip_programs` titles.
- `fetchMetadata.js` / `convert.js` – fetches metadata slices.
- `merge.js` / `mergeFinal.js` – merges IPEDS + Scorecard sources.
- `fetchDescription.js` – enriches schools with Wikipedia summary/image.
- `jsontocsv.js` – NDJSON to CSV utility.
- `embeddingAll.js` – precomputes/updates school scoring + embeddings.
- `initAnchor.js` – loads anchor embeddings from Supabase (`anchors` table).

---

## Repository Structure

```text
project-us-college/
├── backend/
│   ├── app.js
│   ├── index.js
│   ├── db.js
│   ├── controllers/
│   │   └── Colleges.js
│   ├── models/
│   │   ├── embedding.js
│   │   └── llm.js
│   ├── src/scoring/
│   │   ├── anchors.js
│   │   ├── academicScore.js
│   │   ├── activityScore.js
│   │   └── preferenceScore.js
│   └── scripts/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── components/
│   │   ├── Form.jsx
│   │   └── FAQ.jsx
│   ├── public/assets/
│   └── vite.config.js
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase project + keys
- Hugging Face token
- Groq API key

### Backend

```bash
cd backend
npm install
npm start
```

Create `backend/.env` with at least:

```env
PORT=3001
SUPABASE_URL=...
SUPABASE_KEY=...
HF_TOKEN=...
GROKAI_API_KEY=...
SCORECARD_API_KEY=... # for data scripts
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend calls backend at `http://localhost:3001/` by default.

---

## Notes

- CORS is currently configured for local Vite ports (`5173`, `5174`) and deployed origin (`https://project-us-college.vercel.app`).
- Recommendation output is intentionally tiered and deduplicated before UI render.
- LLM JSON handling is hardened to reduce failures from imperfect model formatting.

---

## Helix Vision

Helix is not just a college list generator. It is an AI admissions partner focused on helping students make better decisions with more confidence.

Long-term, the goal is to keep combining:
- rigorous matching logic
- interpretable AI reasoning
- student-first product design

so admissions strategy becomes clearer, faster, and more equitable.
