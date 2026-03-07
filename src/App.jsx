import { useState, useCallback, useEffect } from "react";

// Storage helpers using Netlify Blobs via serverless function
const storage = {
  async get(key) {
    try {
      const res = await fetch(`/api/storage?action=get&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      return data.value ?? null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await fetch(`/api/storage?action=set&key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });
    } catch {}
  },
  async delete(key) {
    try {
      await fetch(`/api/storage?action=delete&key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
    } catch {}
  }
};

const DEFAULT_PROPOSALS = [
  { id: 1, title: "From Zero to Clients: The AI Agency Blueprint", abstract: "I'll share how I built an AI agency and how you can too. We'll cover mindset, positioning, and the future of agents. You'll leave inspired and ready to take action." },
  { id: 2, title: "The Monthly Client Reporting System That Keeps Clients Long-Term", abstract: "A step-by-step system for building an automated monthly reporting workflow: data intake → analysis → insights → client-ready deck/email. Includes what to measure, how to package it, and a template." },
  { id: 3, title: "Top 27 AI Tools for Automation in 2026", abstract: "I'll walk through my favorite tools across agents, RPA, and workflows. You'll see demos of each and get recommendations for which to choose." },
  { id: 4, title: "Live Build: Client Onboarding Automation for a Productized Service", abstract: "We'll build an onboarding system: intake form → automated scoping → contract + invoice → kickoff checklist → client portal setup → welcome email sequence. I'll share the exact SOPs and templates." },
  { id: 5, title: "Agentic Workflows That Replace Your VA", abstract: "Agents can do everything your VA does. I'll show you my agent stack and how to set it up so it runs your business." },
  { id: 6, title: "Case Study: How We Cut Support Tickets 38% With AI Triage (And Kept the Client)", abstract: "Real client story. We'll show the workflow, the prompts, the edge cases, what broke, and how we monitored quality. Includes a triage decision tree and implementation checklist." },
  { id: 7, title: "Panel: The Future of Automation (No Code vs Code vs Agents)", abstract: "A discussion about where automation is headed and what skills will matter. Big ideas, predictions, and audience Q&A." },
  { id: 8, title: "Sponsor Session: Why AcmeFlow Is the Best Automation Platform", abstract: "See our platform features and how top creators use it. We'll walk through use cases and share an exclusive discount." },
  { id: 9, title: "Client Offer Design Clinic: Turn Your Niche Into a Clear Client Offer", abstract: "Bring your niche. You'll leave with a clear offer: scope, deliverables, pricing anchor, proof metric, and delivery plan. Includes a fill-in-the-blank offer canvas." },
  { id: 10, title: "Automation Reliability: Testing, Monitoring, and Change Control for Client Work", abstract: "How to keep automations from breaking when clients change inputs/tools. Covers versioning, QA checklist, monitoring alerts, and rollback plans. Includes reliability checklist + change request form template." }
];

const SYSTEM_PROMPT = `You are a senior conference program director for AI Automation Society — an event for solo operators (SEO specialists, UX designers, cybersecurity pros, data analysts, web designers, QA engineers, etc.) who want practical AI automation skills to deliver measurable results for clients.

Evaluate session proposals against strict editorial standards.

VALUE LADDER — every accepted session must clearly include all four:
1. Skill/system taught (what they build/learn)
2. Outcome enabled (what real result it produces)
3. Where it fits (Offer / Lead Gen / Sales / Delivery / Proof / Reliability / Scale)
4. Artifact attendees leave with (template/SOP/checklist/workflow/script)

ANTI-FLUFF RULES — REJECT if any of these apply:
- Tool roundup with no clear workflow or output
- Vague futurism without a concrete workflow and output
- Sales pitch disguised as education
- Agents content without bounded scope plus human-in-loop plus monitoring

SCORE each dimension 1 to 5:
- value_ladder: Does it define what is built, the outcome, workflow fit, and artifact?
- actionability: Can attendees immediately apply this to client work?
- proof_credibility: Real evidence, case study, or concrete deliverables vs vague claims?
- anti_fluff: Free of sales pitches, tool roundups, vague predictions, and buzzwords?

LEVEL — assign one: Beginner / Intermediate / Advanced
- Beginner: concepts plus first build, no prior automation experience needed
- Intermediate: assumes working knowledge of at least one automation tool
- Advanced: assumes production-level experience, handles edge cases, failure modes, scale

TRACK — assign one of: Offer and Positioning / Client Delivery / Reliability and Ops / Growth and Lead Gen / Agentic Systems

FORMAT — assign the best-fit format from this list:
- Case Study: Real client story with documented workflow, results, and what broke
- Deconstruction: Speaker pulls apart an existing system or workflow live to show how it works
- Live Build: Speaker builds a real automation from scratch during the session
- Hands-On Clinic: Guided exercise where attendees build or configure something themselves
- Workshop: Skill-building with a defined framework, guided exercises, and a completed deliverable
- Demo: Focused walkthrough of a specific tool or workflow with a clear scoped output
- Hot Seat: One attendee's real work is reviewed or rebuilt live by the speaker
- Fireside Chat: Conversational interview with a practitioner around a specific story or result
- Panel: Multi-speaker discussion — flag if it lacks a concrete throughline or editorial guardrails
- Office Hours: Open Q&A with a practitioner, best for virtual follow-on sessions

OVERLAP — note if this session closely overlaps with any other common session themes in a multi-session lineup. Flag if it should be merged with another, split into beginner and advanced versions, or repositioned by format. Be specific about which session numbers it overlaps with if applicable.

Respond ONLY with valid JSON. No markdown, no preamble, no backticks. Use this exact structure:
{
  "decision": "ACCEPT" or "REJECT",
  "scores": {
    "value_ladder": <1-5>,
    "actionability": <1-5>,
    "proof_credibility": <1-5>,
    "anti_fluff": <1-5>
  },
  "overall": <average of four scores to one decimal>,
  "level": "Beginner" or "Intermediate" or "Advanced",
  "track": "<one track name>",
  "format": "<one format name from the list above>",
  "client_value_statement": "<one sentence starting with: This matters because it helps a solo operator deliver>",
  "rejection_reason": "<brief reason if REJECT, otherwise null>",
  "overlap_note": "<specific overlap flag with session numbers if applicable, merge or split recommendation, or null if none>",
  "rewrite": {
    "title": "<sharper, more specific title>",
    "format": "<one format name from the list above>",
    "who_its_for": "<one sentence: the specific type of solo operator this is designed for and their context>",
    "abstract": "<2 to 3 sentences describing what the session covers and the workflow or system being taught>",
    "youll_leave_with": ["<item 1>", "<item 2>", "<item 3>"]
  }
}

The youll_leave_with field must be a JSON array of 2 to 4 strings. Name the artifact explicitly as one of the items.`;

async function evaluateProposal(proposal) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Evaluate this session proposal:\n\nTitle: ${proposal.title}\nAbstract: ${proposal.abstract}` }]
    })
  });
  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

const OVERLAP_SYSTEM_PROMPT = `You are a senior conference program director reviewing a full session lineup for overlap, redundancy, and format conflicts.

Your job is to look ACROSS all sessions together and identify:
- Sessions covering the same topic, workflow, or skill (even if framed differently)
- Sessions that could be merged into one stronger session
- Sessions that could be split by level (Beginner vs Advanced) to serve different audiences
- Sessions where a format change would eliminate the overlap (e.g. two talks on onboarding → one Talk + one Hands-On Clinic)
- Gaps in the lineup worth flagging (missing tracks, levels, or formats)

For each overlap group you find, be specific: name the session numbers, explain WHY they overlap, and give a concrete recommendation.

Respond ONLY with valid JSON. No markdown, no preamble, no backticks. Use this structure:
{
  "overlap_groups": [
    {
      "session_ids": [<array of session id numbers that overlap>],
      "overlap_reason": "<why these sessions overlap — topic, workflow, audience, or format>",
      "recommendation": "<merge / split by level / differentiate by format / keep both with changes>",
      "action": "<specific actionable instruction: e.g. 'Merge sessions 1 and 5 into a single Advanced Case Study on agent reliability' or 'Keep both but reposition #3 as a Hands-On Clinic for beginners'>",
      "severity": "high" or "medium" or "low"
    }
  ],
  "gaps": [
    "<one sentence describing a missing topic, track, level, or format that would strengthen the lineup>"
  ],
  "summary": "<2-3 sentence overall assessment of lineup health — what's strong, what needs work>"
}

If there are no overlaps, return an empty overlap_groups array. Always include gaps and summary.`;

async function runOverlapAnalysis(proposals, results) {
  const lineup = proposals.map(p => {
    const r = results[p.id];
    return `Session ${p.id}: "${p.title}"
Abstract: ${p.abstract}
Decision: ${r?.decision || "Not evaluated"}
Track: ${r?.track || "Unknown"}
Format: ${r?.format || "Unknown"}
Level: ${r?.level || "Unknown"}`;
  }).join("\n\n");

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: OVERLAP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this full session lineup for overlaps, redundancy, and gaps:\n\n${lineup}` }]
    })
  });
  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

const ScorePip = ({ score }) => (
  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i <= score ? "#E8712A" : "rgba(255,255,255,0.1)" }} />
    ))}
    <span style={{ marginLeft: 4, fontSize: 11, color: "#888", fontFamily: "monospace" }}>{score}</span>
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 3, fontSize: 10,
    fontWeight: 700, letterSpacing: "0.07em", fontFamily: "monospace",
    background: `${color}1a`, color, border: `1px solid ${color}44`, whiteSpace: "nowrap"
  }}>{label}</span>
);

const LEVEL_COLORS = { Beginner: "#60a5fa", Intermediate: "#fbbf24", Advanced: "#e879f9" };
const FORMAT_COLORS = {
  "Case Study": "#34d399", "Deconstruction": "#60a5fa", "Live Build": "#E8712A",
  "Hands-On Clinic": "#a78bfa", "Workshop": "#f472b6", "Demo": "#38bdf8",
  "Hot Seat": "#fb923c", "Fireside Chat": "#86efac", "Panel": "#fbbf24", "Office Hours": "#94a3b8"
};
const TRACK_COLORS = {
  "Offer and Positioning": "#34d399",
  "Client Delivery": "#60a5fa",
  "Reliability and Ops": "#f87171",
  "Growth and Lead Gen": "#fbbf24",
  "Agentic Systems": "#e879f9"
};

const StatusDot = ({ status }) => {
  if (status === "loading") return <div style={{ width: 15, height: 15, border: "2px solid rgba(232,113,42,0.25)", borderTopColor: "#E8712A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
  if (status === "done") return <span style={{ color: "#4ade80", fontSize: 13 }}>✓</span>;
  if (status === "error") return <span style={{ color: "#f87171", fontSize: 13 }}>✕</span>;
  return <span style={{ color: "#2a2a2a", fontSize: 11 }}>○</span>;
};

export default function SessionEvaluator() {
  const [proposals, setProposals] = useState(DEFAULT_PROPOSALS);
  const [results, setResults] = useState({});
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("table");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAbstract, setNewAbstract] = useState("");
  const [overlapAnalysis, setOverlapAnalysis] = useState(null);
  const [runningOverlap, setRunningOverlap] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [speakerInfo, setSpeakerInfo] = useState({});
  const [workflowStatus, setWorkflowStatus] = useState({});
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const keys = ["results", "statuses", "notes", "decisions", "speakerInfo", "workflowStatus", "overlapAnalysis", "proposals"];
        for (const key of keys) {
          const val = await storage.get(`evaluator:${key}`);
          if (val) {
            if (key === "results") setResults(val);
            if (key === "statuses") setStatuses(val);
            if (key === "notes") setNotes(val);
            if (key === "decisions") setDecisions(val);
            if (key === "speakerInfo") setSpeakerInfo(val);
            if (key === "workflowStatus") setWorkflowStatus(val);
            if (key === "overlapAnalysis") setOverlapAnalysis(val);
            if (key === "proposals") setProposals(val);
          }
        }
      } catch {}
      setStorageReady(true);
    }
    loadState();
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:results", results);
  }, [results, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:statuses", statuses);
  }, [statuses, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:notes", notes);
  }, [notes, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:decisions", decisions);
  }, [decisions, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:speakerInfo", speakerInfo);
  }, [speakerInfo, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:workflowStatus", workflowStatus);
  }, [workflowStatus, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:overlapAnalysis", overlapAnalysis);
  }, [overlapAnalysis, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    storage.set("evaluator:proposals", proposals);
  }, [proposals, storageReady]);

  const addSession = () => {
    if (!newTitle.trim() || !newAbstract.trim()) return;
    const newId = proposals.length > 0 ? Math.max(...proposals.map(p => p.id)) + 1 : 1;
    setProposals(prev => [...prev, { id: newId, title: newTitle.trim(), abstract: newAbstract.trim() }]);
    if (newName.trim() || newEmail.trim() || newCompany.trim()) {
      setSpeakerInfo(s => ({ ...s, [newId]: { name: newName.trim(), email: newEmail.trim(), company: newCompany.trim() } }));
    }
    setWorkflowStatus(ws => ({ ...ws, [newId]: "Pending" }));
    setNewTitle(""); setNewAbstract(""); setNewName(""); setNewEmail(""); setNewCompany("");
    setShowAddForm(false);
  };

  const runOne = useCallback(async (proposal) => {
    setStatuses(s => ({ ...s, [proposal.id]: "loading" }));
    try {
      const result = await evaluateProposal(proposal);
      setResults(r => ({ ...r, [proposal.id]: result }));
      setStatuses(s => ({ ...s, [proposal.id]: "done" }));
    } catch {
      setStatuses(s => ({ ...s, [proposal.id]: "error" }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    for (const p of proposals) await runOne(p);
    setRunning(false);
  }, [proposals, runOne]);

  const handleRunOverlap = useCallback(async () => {
    setRunningOverlap(true);
    setActiveTab("overlaps");
    try {
      const analysis = await runOverlapAnalysis(proposals, results);
      setOverlapAnalysis(analysis);
    } catch {
      setOverlapAnalysis({ error: true });
    }
    setRunningOverlap(false);
  }, [proposals, results]);

  const doneCount = Object.values(statuses).filter(s => s === "done").length;
  const accepted = Object.values(results).filter(r => r.decision === "ACCEPT").length;
  const rejected = Object.values(results).filter(r => r.decision === "REJECT").length;
  const overlapCount = overlapAnalysis?.overlap_groups?.length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#E8E2D9", fontFamily: "'Georgia', serif", padding: "36px 28px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea, input { resize: vertical; }
        textarea:focus, input:focus { outline: none; border-color: rgba(232,113,42,0.5) !important; }
        .btn:hover { opacity: 0.8; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #2e2e2e; }
      `}</style>

      {!storageReady && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#555", fontFamily: "monospace", fontSize: 11, marginBottom: 20 }}>
          <div style={{ width: 12, height: 12, border: "2px solid #333", borderTopColor: "#E8712A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Loading saved state…
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 26, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#E8712A", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>AI Automation Society</div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 400, letterSpacing: "-0.02em" }}>Session Proposal Evaluator</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: "#666", fontFamily: "monospace" }}>
              {proposals.length} sessions · {doneCount} evaluated
              {doneCount > 0 && <> · <span style={{ color: "#4ade80" }}>{Object.values(decisions).filter(d => d === "ACCEPT").length} accepted</span> · <span style={{ color: "#60a5fa" }}>{Object.values(decisions).filter(d => d === "MINOR").length} minor</span> · <span style={{ color: "#f59e0b" }}>{Object.values(decisions).filter(d => d === "MAJOR").length} major</span> · <span style={{ color: "#f87171" }}>{Object.values(decisions).filter(d => d === "REJECT").length} rejected</span> · <span style={{ color: "#fbbf24" }}>{overlapCount} overlaps</span></>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setShowAddForm(v => !v)} style={{
              background: "transparent", border: "1px solid rgba(232,113,42,0.4)",
              color: "#E8712A", padding: "11px 18px", fontSize: 12,
              fontFamily: "monospace", letterSpacing: "0.06em", borderRadius: 4
            }}>+ Add Session</button>
            <button className="btn" onClick={runAll} disabled={running || proposals.length === 0} style={{
              background: running ? "#1e1e1e" : "#E8712A",
              color: running ? "#555" : "#fff",
              border: `1px solid ${running ? "#2a2a2a" : "#E8712A"}`,
              padding: "11px 22px", fontSize: 12, fontFamily: "monospace",
              letterSpacing: "0.06em", borderRadius: 4, cursor: running ? "default" : "pointer"
            }}>
              {running ? `Evaluating… ${doneCount}/${proposals.length}` : `▶  Evaluate All ${proposals.length}`}
            </button>
            <button className="btn" onClick={async () => {
              if (!confirm("Reset all evaluations, decisions, and notes? This cannot be undone.")) return;
              setResults({}); setStatuses({}); setNotes({}); setDecisions({});
              setSpeakerInfo({}); setWorkflowStatus({}); setOverlapAnalysis(null);
              setProposals(DEFAULT_PROPOSALS);
              const keys = ["results","statuses","notes","decisions","speakerInfo","workflowStatus","overlapAnalysis","proposals"];
              for (const k of keys) await storage.delete(`evaluator:${k}`);
            }} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "#444", padding: "11px 14px", fontSize: 11,
              fontFamily: "monospace", borderRadius: 4
            }}>Reset</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "16px 0 8px", padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 4, alignItems: "center" }}>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace" }}>Your Decision</div>
          {[
            { icon: "✓", label: "Accept", color: "#4ade80" },
            { icon: "✕", label: "Reject", color: "#f87171" },
            { icon: "✎", label: "Minor Revisions — same session, small fixes", color: "#60a5fa" },
            { icon: "↻", label: "Major Revisions — fundamentally different angle needed", color: "#f59e0b" },
          ].map(({ icon, label, color }) => (
            <div key={label} style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ color, fontSize: 12, fontFamily: "monospace", width: 14, textAlign: "center" }}>{icon}</span>
              <span style={{ fontSize: 11, color: "#666", fontFamily: "monospace" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Add Session Form */}
        {showAddForm && (
          <div style={{ marginTop: 20, padding: "18px 20px", background: "rgba(232,113,42,0.05)", border: "1px solid rgba(232,113,42,0.2)", borderRadius: 5 }}>
            <div style={{ fontSize: 10, color: "#E8712A", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>Add New Session</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Speaker name" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#E8E2D9", fontSize: 13, padding: "10px 12px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Speaker email" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#E8E2D9", fontSize: 13, padding: "10px 12px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                <input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company / website (optional)" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#E8E2D9", fontSize: 13, padding: "10px 12px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
              </div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Session title" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#E8E2D9", fontSize: 13, padding: "10px 12px", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" }} />
              <textarea value={newAbstract} onChange={e => setNewAbstract(e.target.value)} placeholder="Session abstract — describe what will be covered, what attendees will build or learn, and what they'll leave with" rows={4} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#E8E2D9", fontSize: 13, padding: "10px 12px", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" onClick={addSession} disabled={!newTitle.trim() || !newAbstract.trim()} style={{ background: newTitle.trim() && newAbstract.trim() ? "#E8712A" : "#2a2a2a", color: newTitle.trim() && newAbstract.trim() ? "#fff" : "#555", border: "none", padding: "9px 20px", fontSize: 12, fontFamily: "monospace", borderRadius: 4 }}>Add to Queue</button>
                <button className="btn" onClick={() => { setShowAddForm(false); setNewTitle(""); setNewAbstract(""); setNewName(""); setNewEmail(""); setNewCompany(""); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#888", padding: "9px 16px", fontSize: 12, fontFamily: "monospace", borderRadius: 4 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Overlap Analysis Button */}
        {doneCount > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            {[["table", "All Sessions"], ["overlaps", "Overlaps & Gaps"]].map(([val, label]) => (
              <button key={val} className="btn" onClick={() => setActiveTab(val)} style={{
                background: activeTab === val ? "rgba(232,113,42,0.12)" : "transparent",
                border: `1px solid ${activeTab === val ? "rgba(232,113,42,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: activeTab === val ? "#E8712A" : "#777",
                padding: "5px 13px", fontSize: 10, fontFamily: "monospace",
                letterSpacing: "0.09em", borderRadius: 3, textTransform: "uppercase"
              }}>{label}</button>
            ))}
            {doneCount === proposals.length && (
              <button className="btn" onClick={handleRunOverlap} disabled={runningOverlap} style={{
                background: runningOverlap ? "#1e1e1e" : "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.35)",
                color: runningOverlap ? "#555" : "#fbbf24",
                padding: "5px 13px", fontSize: 10, fontFamily: "monospace",
                letterSpacing: "0.09em", borderRadius: 3, marginLeft: 8,
                cursor: runningOverlap ? "default" : "pointer"
              }}>
                {runningOverlap ? "⟳ Analyzing…" : "⚠ Run Cross-Session Overlap Analysis"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* OVERLAPS TAB */}
      {activeTab === "overlaps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!overlapAnalysis && !runningOverlap && (
            <div style={{ color: "#555", fontFamily: "monospace", fontSize: 12, padding: "20px 0" }}>
              Run all session evaluations first, then click <span style={{ color: "#fbbf24" }}>⚠ Run Cross-Session Overlap Analysis</span> to see a full lineup assessment.
            </div>
          )}

          {runningOverlap && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "20px 0", color: "#888", fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ width: 16, height: 16, border: "2px solid rgba(251,191,36,0.25)", borderTopColor: "#fbbf24", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Analyzing full lineup for overlaps and gaps…
            </div>
          )}

          {overlapAnalysis?.error && (
            <div style={{ padding: "14px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 4, color: "#f87171", fontFamily: "monospace", fontSize: 12 }}>
              Analysis failed — check your API key and try again.
            </div>
          )}

          {overlapAnalysis && !overlapAnalysis.error && (
            <>
              {/* Summary */}
              <div style={{ padding: "16px 18px", background: "rgba(232,113,42,0.05)", border: "1px solid rgba(232,113,42,0.2)", borderRadius: 5 }}>
                <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Lineup Assessment</div>
                <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{overlapAnalysis.summary}</div>
              </div>

              {/* Overlap Groups */}
              {overlapAnalysis.overlap_groups?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>
                    Overlap Groups ({overlapAnalysis.overlap_groups.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {overlapAnalysis.overlap_groups.map((group, i) => {
                      const severityColor = group.severity === "high" ? "#f87171" : group.severity === "medium" ? "#fbbf24" : "#94a3b8";
                      return (
                        <div key={i} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid ${severityColor}33`, borderRadius: 5 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                            <Badge label={group.severity.toUpperCase()} color={severityColor} />
                            <div style={{ display: "flex", gap: 6 }}>
                              {group.session_ids.map(id => {
                                const p = proposals.find(p => p.id === id);
                                return p ? (
                                  <span key={id} style={{ fontSize: 11, color: "#ddd", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 3 }}>
                                    #{id} {p.title.length > 35 ? p.title.substring(0, 35) + "…" : p.title}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, marginBottom: 8 }}>
                            <span style={{ color: "#777", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Why: </span>
                            {group.overlap_reason}
                          </div>
                          <div style={{ padding: "10px 12px", background: `${severityColor}0d`, border: `1px solid ${severityColor}33`, borderRadius: 4, fontSize: 12, color: "#ddd", lineHeight: 1.6 }}>
                            <span style={{ fontSize: 10, color: severityColor, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", fontWeight: 700 }}>→ Action: </span>
                            {group.action}
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>Your Notes</div>
                            <textarea
                              value={notes[`group-${i}`] || ""}
                              onChange={e => setNotes(n => ({ ...n, [`group-${i}`]: e.target.value }))}
                              placeholder="How you'd resolve this…"
                              rows={2}
                              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, color: "#E8E2D9", fontSize: 12, padding: "8px 10px", fontFamily: "monospace", boxSizing: "border-box" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {overlapAnalysis.overlap_groups?.length === 0 && (
                <div style={{ padding: "14px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 4, color: "#4ade80", fontFamily: "monospace", fontSize: 12 }}>
                  ✓ No significant overlaps detected in this lineup.
                </div>
              )}

              {/* Gaps */}
              {overlapAnalysis.gaps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>
                    Lineup Gaps ({overlapAnalysis.gaps.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {overlapAnalysis.gaps.map((gap, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 4 }}>
                        <span style={{ color: "#60a5fa", flexShrink: 0 }}>◦</span>
                        <span style={{ fontSize: 12, color: "#bbb", lineHeight: 1.55 }}>{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TABLE TAB */}
      {activeTab === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                {["#", "", "Session Title", "Rec.", "Score", "Level", "Format", "Track", "Value Ladder", "Actionability", "Proof", "Anti-Fluff", "Status", "Your Decision", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", textAlign: "left", color: "#444", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => {
                const r = results[p.id];
                const s = statuses[p.id];
                const isOpen = expanded === p.id;

                return (
                  <>
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isOpen ? "rgba(232,113,42,0.035)" : "transparent" }}>
                      <td style={{ padding: "11px 10px", color: "#3a3a3a", fontFamily: "monospace", fontSize: 10 }}>{p.id}</td>
                      <td style={{ padding: "11px 10px" }}><StatusDot status={s} /></td>
                      <td style={{ padding: "11px 10px", maxWidth: 220 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>{p.title}</div>
                        <div style={{ color: "#4a4a4a", fontSize: 10, marginTop: 2, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 210 }}>{p.abstract.substring(0, 70)}…</div>
                      </td>
                      <td style={{ padding: "11px 10px" }}>{r ? <Badge label={r.decision === "ACCEPT" ? "✓ Accept" : "✕ Reject"} color={r.decision === "ACCEPT" ? "#4ade80" : "#f87171"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      <td style={{ padding: "11px 10px" }}>
                        {r ? <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: r.overall >= 4 ? "#4ade80" : r.overall >= 2.5 ? "#fbbf24" : "#f87171" }}>{r.overall}</span> : <span style={{ color: "#2a2a2a" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 10px" }}>{r?.level ? <Badge label={r.level} color={LEVEL_COLORS[r.level] || "#aaa"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      <td style={{ padding: "11px 10px" }}>{r?.format ? <Badge label={r.format} color={FORMAT_COLORS[r.format] || "#aaa"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      <td style={{ padding: "11px 10px", maxWidth: 130 }}>{r?.track ? <Badge label={r.track} color={TRACK_COLORS[r.track] || "#aaa"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      {["value_ladder", "actionability", "proof_credibility", "anti_fluff"].map(k => (
                        <td key={k} style={{ padding: "11px 10px" }}>{r ? <ScorePip score={r.scores?.[k]} /> : <span style={{ color: "#1e1e1e" }}>—</span>}</td>
                      ))}
                      <td style={{ padding: "11px 10px" }}>
                        {(() => {
                          const statusColors = { Pending: "#94a3b8", "Needs Info": "#fbbf24", "Minor Edits Requested": "#60a5fa", "Redirection Sent": "#f59e0b", Accepted: "#4ade80", Rejected: "#f87171", Waitlisted: "#a78bfa" };
                          const ws = workflowStatus[p.id] || (r ? "Pending" : null);
                          return ws ? <Badge label={ws} color={statusColors[ws]} /> : <span style={{ color: "#2a2a2a" }}>—</span>;
                        })()}
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        {r && (
                          decisions[p.id] ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <Badge
                                label={decisions[p.id] === "ACCEPT" ? "✓ Accepted" : decisions[p.id] === "REJECT" ? "✕ Rejected" : decisions[p.id] === "MINOR" ? "✎ Minor Revisions" : "↻ Major Revisions"}
                                color={decisions[p.id] === "ACCEPT" ? "#4ade80" : decisions[p.id] === "REJECT" ? "#f87171" : decisions[p.id] === "MINOR" ? "#60a5fa" : "#f59e0b"}
                              />
                              <button className="btn" onClick={() => setDecisions(d => { const n = {...d}; delete n[p.id]; return n; })} style={{ background: "transparent", border: "none", color: "#444", fontSize: 10, fontFamily: "monospace", padding: "2px 4px" }}>undo</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <button className="btn" onClick={() => setDecisions(d => ({ ...d, [p.id]: "ACCEPT" }))} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "4px 8px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>✓</button>
                              <button className="btn" onClick={() => setDecisions(d => ({ ...d, [p.id]: "REJECT" }))} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "4px 8px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>✕</button>
                              <button className="btn" onClick={() => setDecisions(d => ({ ...d, [p.id]: "MINOR" }))} style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa", padding: "4px 8px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>✎</button>
                              <button className="btn" onClick={() => setDecisions(d => ({ ...d, [p.id]: "MAJOR" }))} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "4px 8px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>↻</button>
                            </div>
                          )
                        )}
                        {!r && <span style={{ color: "#2a2a2a" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {!r && s !== "loading" && (
                            <button className="btn" onClick={() => runOne(p)} style={{ background: "transparent", border: "1px solid rgba(232,113,42,0.3)", color: "#E8712A", padding: "4px 9px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>Run</button>
                          )}
                          {r && (
                            <button className="btn" onClick={() => setExpanded(isOpen ? null : p.id)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#888", padding: "4px 9px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>
                              {isOpen ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isOpen && r && (
                      <tr key={`${p.id}-exp`}>
                        <td colSpan={14} style={{ padding: "0 10px 22px 40px", background: "rgba(232,113,42,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 280px", gap: 18, paddingTop: 16 }}>

                            {/* Original + evaluation */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                              {/* Speaker Info */}
                              <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
                                <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Speaker</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                  {["name", "email", "company"].map(field => (
                                    <div key={field}>
                                      <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 3 }}>{field}</div>
                                      <input
                                        value={speakerInfo[p.id]?.[field] || ""}
                                        onChange={e => setSpeakerInfo(s => ({ ...s, [p.id]: { ...s[p.id], [field]: e.target.value } }))}
                                        placeholder={field === "company" ? "Company / website" : `Speaker ${field}`}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, color: "#E8E2D9", fontSize: 11, padding: "6px 8px", fontFamily: "monospace", boxSizing: "border-box" }}
                                      />
                                    </div>
                                  ))}
                                </div>
                                {speakerInfo[p.id]?.email && (
                                  <button className="btn" onClick={() => navigator.clipboard.writeText(speakerInfo[p.id].email)} style={{ marginTop: 8, background: "transparent", border: "1px solid rgba(232,113,42,0.25)", color: "#E8712A", padding: "4px 10px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>
                                    Copy Email
                                  </button>
                                )}
                              </div>

                              {/* Workflow Status */}
                              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
                                <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Communication Status</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {["Pending", "Needs Info", "Minor Edits Requested", "Redirection Sent", "Accepted", "Rejected", "Waitlisted"].map(status => {
                                    const statusColors = { Pending: "#94a3b8", "Needs Info": "#fbbf24", "Minor Edits Requested": "#60a5fa", "Redirection Sent": "#f59e0b", Accepted: "#4ade80", Rejected: "#f87171", Waitlisted: "#a78bfa" };
                                    const isActive = (workflowStatus[p.id] || "Pending") === status;
                                    return (
                                      <button key={status} className="btn" onClick={() => setWorkflowStatus(ws => ({ ...ws, [p.id]: status }))} style={{
                                        background: isActive ? `${statusColors[status]}1a` : "transparent",
                                        border: `1px solid ${isActive ? statusColors[status] : "rgba(255,255,255,0.1)"}`,
                                        color: isActive ? statusColors[status] : "#555",
                                        padding: "4px 10px", fontSize: 10, fontFamily: "monospace", borderRadius: 3
                                      }}>{status}</button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace" }}>Original Proposal</div>
                              <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd", marginBottom: 5 }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6 }}>{p.abstract}</div>
                              </div>
                              <div style={{ padding: "10px 12px", background: "rgba(232,113,42,0.05)", border: "1px solid rgba(232,113,42,0.18)", borderRadius: 4 }}>
                                <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>Client Value Statement</div>
                                <div style={{ fontSize: 11, color: "#ddd", lineHeight: 1.55, fontStyle: "italic" }}>{r.client_value_statement}</div>
                              </div>
                              {r.rejection_reason && (
                                <div style={{ padding: "10px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 4 }}>
                                  <div style={{ fontSize: 9, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>Rejection Reason</div>
                                  <div style={{ fontSize: 11, color: "#fca5a5", lineHeight: 1.55 }}>{r.rejection_reason}</div>
                                </div>
                              )}
                              {r.overlap_note && (
                                <div style={{ padding: "10px 12px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 4 }}>
                                  <div style={{ fontSize: 9, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>⚠ Overlap / Fix</div>
                                  <div style={{ fontSize: 11, color: "#fde68a", lineHeight: 1.55 }}>{r.overlap_note}</div>
                                </div>
                              )}
                            </div>

                            {/* Rewrite */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace" }}>
                                {r.decision === "ACCEPT" ? "Publish-Ready Rewrite" : "What This Could Look Like"}
                              </div>
                              <div style={{ padding: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${r.decision === "ACCEPT" ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.05)"}`, borderRadius: 4, display: "flex", flexDirection: "column", gap: 13, flexGrow: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E2D9", lineHeight: 1.3 }}>{r.rewrite.title}</div>
                                {r.rewrite.format && (
                                  <div><Badge label={r.rewrite.format} color={FORMAT_COLORS[r.rewrite.format] || "#aaa"} /></div>
                                )}
                                <div>
                                  <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 3 }}>Who This Is For</div>
                                  <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.55 }}>{r.rewrite.who_its_for}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 3 }}>Session Overview</div>
                                  <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6 }}>{r.rewrite.abstract}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>You'll Leave With</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    {(Array.isArray(r.rewrite.youll_leave_with) ? r.rewrite.youll_leave_with : [r.rewrite.youll_leave_with]).map((item, i) => (
                                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                        <span style={{ color: "#E8712A", fontSize: 11, marginTop: 1, flexShrink: 0 }}>→</span>
                                        <span style={{ fontSize: 11, color: "#ddd", lineHeight: 1.5 }}>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace" }}>Your Notes</div>
                              <textarea
                                value={notes[p.id] || ""}
                                onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))}
                                placeholder="Editorial notes, override decisions, flag for follow-up, rewrite edits…"
                                rows={9}
                                style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#E8E2D9", fontSize: 12, padding: "10px 12px", fontFamily: "monospace", lineHeight: 1.6, boxSizing: "border-box", flexGrow: 1 }}
                              />
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {r.level && <Badge label={r.level} color={LEVEL_COLORS[r.level] || "#aaa"} />}
                                {r.format && <Badge label={r.format} color={FORMAT_COLORS[r.format] || "#aaa"} />}
                                {r.track && <Badge label={r.track} color={TRACK_COLORS[r.track] || "#aaa"} />}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary bar */}
      {doneCount > 0 && activeTab === "table" && (
        <div style={{ marginTop: 26, padding: "18px 22px", border: "1px solid rgba(232,113,42,0.2)", borderRadius: 5, background: "rgba(232,113,42,0.03)", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "AI Recommends Accept", val: accepted, color: "#4ade80" },
            { label: "AI Recommends Reject", val: rejected, color: "#f87171" },
            { label: "Your Accepted", val: Object.values(decisions).filter(d => d === "ACCEPT").length, color: "#4ade80" },
            { label: "Minor Revisions", val: Object.values(decisions).filter(d => d === "MINOR").length, color: "#60a5fa" },
            { label: "Major Revisions", val: Object.values(decisions).filter(d => d === "MAJOR").length, color: "#f59e0b" },
            { label: "Your Rejected", val: Object.values(decisions).filter(d => d === "REJECT").length, color: "#f87171" },
            { label: "Overlaps Flagged", val: overlapCount, color: "#fbbf24" },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 9, color: "#E8712A", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace" }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.val}</div>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>Review all details + notes before assembling your submission doc.</div>
        </div>
      )}
    </div>
  );
}
