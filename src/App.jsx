import { useState, useCallback } from "react";

const PROPOSALS = [
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

OVERLAP — note if this session closely overlaps with any other common session themes in a 10-session lineup like this. Flag if it should be merged with another, split into beginner and advanced versions, or repositioned by format. Be specific about which session numbers it overlaps with if applicable.

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
  "client_value_statement": "<one sentence starting with: This matters because it helps a solo operator deliver>",
  "rejection_reason": "<brief reason if REJECT, otherwise null>",
  "overlap_note": "<specific overlap flag with session numbers if applicable, merge or split recommendation, or null if none>",
  "rewrite": {
    "title": "<sharper, more specific title>",
    "who_its_for": "<one sentence: the specific type of solo operator this is designed for and their context>",
    "abstract": "<2 to 3 sentences describing what the session covers and the workflow or system being taught>",
    "youll_leave_with": ["<item 1>", "<item 2>", "<item 3>"]
  }
}

The youll_leave_with field must be a JSON array of 2 to 4 strings. Name the artifact explicitly as one of the items.`;

async function evaluateProposal(proposal) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
  const [results, setResults] = useState({});
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("table");

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
    for (const p of PROPOSALS) await runOne(p);
    setRunning(false);
  }, [runOne]);

  const doneCount = Object.values(statuses).filter(s => s === "done").length;
  const accepted = Object.values(results).filter(r => r.decision === "ACCEPT").length;
  const rejected = Object.values(results).filter(r => r.decision === "REJECT").length;
  const overlapSessions = PROPOSALS.filter(p => results[p.id]?.overlap_note);

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#E8E2D9", fontFamily: "'Georgia', serif", padding: "36px 28px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea { resize: vertical; }
        textarea:focus { outline: none; border-color: rgba(232,113,42,0.5) !important; }
        .btn:hover { opacity: 0.8; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #2e2e2e; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 26, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#E8712A", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>AI Automation Society · Program Director Test</div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 400, letterSpacing: "-0.02em" }}>Session Proposal Evaluator</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: "#666", fontFamily: "monospace" }}>
              {doneCount}/10 evaluated
              {doneCount > 0 && <> · <span style={{ color: "#4ade80" }}>{accepted} accepted</span> · <span style={{ color: "#f87171" }}>{rejected} rejected</span> · <span style={{ color: "#fbbf24" }}>{overlapSessions.length} overlaps</span></>}
            </div>
          </div>
          <button className="btn" onClick={runAll} disabled={running || doneCount === 10} style={{
            background: running || doneCount === 10 ? "#1e1e1e" : "#E8712A",
            color: running || doneCount === 10 ? "#555" : "#fff",
            border: `1px solid ${running || doneCount === 10 ? "#2a2a2a" : "#E8712A"}`,
            padding: "11px 22px", fontSize: 12, fontFamily: "monospace",
            letterSpacing: "0.06em", borderRadius: 4, cursor: running || doneCount === 10 ? "default" : "pointer"
          }}>
            {running ? `Evaluating… ${doneCount}/10` : doneCount === 10 ? "✓ All Complete" : "▶  Evaluate All 10"}
          </button>
        </div>

        {doneCount > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
            {[["table", "All Sessions"], ["overlaps", `Overlaps & Fixes${overlapSessions.length > 0 ? ` (${overlapSessions.length})` : ""}`]].map(([val, label]) => (
              <button key={val} className="btn" onClick={() => setActiveTab(val)} style={{
                background: activeTab === val ? "rgba(232,113,42,0.12)" : "transparent",
                border: `1px solid ${activeTab === val ? "rgba(232,113,42,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: activeTab === val ? "#E8712A" : "#777",
                padding: "5px 13px", fontSize: 10, fontFamily: "monospace",
                letterSpacing: "0.09em", borderRadius: 3, textTransform: "uppercase"
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* OVERLAPS TAB */}
      {activeTab === "overlaps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {overlapSessions.length === 0
            ? <div style={{ color: "#444", fontFamily: "monospace", fontSize: 12, padding: "20px 0" }}>No overlaps flagged yet — run evaluations first.</div>
            : overlapSessions.map(p => {
                const r = results[p.id];
                return (
                  <div key={p.id} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#444" }}>#{p.id}</span>
                      <span style={{ fontSize: 13 }}>{p.title}</span>
                      <Badge label={r.decision} color={r.decision === "ACCEPT" ? "#4ade80" : "#f87171"} />
                      {r.level && <Badge label={r.level} color={LEVEL_COLORS[r.level] || "#aaa"} />}
                      {r.track && <Badge label={r.track} color={TRACK_COLORS[r.track] || "#aaa"} />}
                    </div>
                    <div style={{ padding: "10px 12px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 4, fontSize: 12, color: "#fde68a", lineHeight: 1.6, marginBottom: 10 }}>
                      <span style={{ fontSize: 9, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700 }}>⚠ Overlap Note: </span>
                      {r.overlap_note}
                    </div>
                    <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 5 }}>Your Resolution Notes</div>
                    <textarea
                      value={notes[`ov-${p.id}`] || ""}
                      onChange={e => setNotes(n => ({ ...n, [`ov-${p.id}`]: e.target.value }))}
                      placeholder="How you'd resolve this overlap — merge, split into beginner/advanced, reposition format…"
                      rows={2}
                      style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, color: "#E8E2D9", fontSize: 12, padding: "8px 10px", fontFamily: "monospace", boxSizing: "border-box" }}
                    />
                  </div>
                );
              })
          }
        </div>
      )}

      {/* TABLE TAB */}
      {activeTab === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                {["#", "", "Session Title", "Decision", "Score", "Level", "Track", "Value Ladder", "Actionability", "Proof", "Anti-Fluff", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", textAlign: "left", color: "#444", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROPOSALS.map(p => {
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
                      <td style={{ padding: "11px 10px" }}>{r ? <Badge label={r.decision} color={r.decision === "ACCEPT" ? "#4ade80" : "#f87171"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      <td style={{ padding: "11px 10px" }}>
                        {r ? <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: r.overall >= 4 ? "#4ade80" : r.overall >= 2.5 ? "#fbbf24" : "#f87171" }}>{r.overall}</span> : <span style={{ color: "#2a2a2a" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 10px" }}>{r?.level ? <Badge label={r.level} color={LEVEL_COLORS[r.level] || "#aaa"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      <td style={{ padding: "11px 10px", maxWidth: 130 }}>{r?.track ? <Badge label={r.track} color={TRACK_COLORS[r.track] || "#aaa"} /> : <span style={{ color: "#2a2a2a" }}>—</span>}</td>
                      {["value_ladder", "actionability", "proof_credibility", "anti_fluff"].map(k => (
                        <td key={k} style={{ padding: "11px 10px" }}>{r ? <ScorePip score={r.scores[k]} /> : <span style={{ color: "#1e1e1e" }}>—</span>}</td>
                      ))}
                      <td style={{ padding: "11px 10px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {!r && s !== "loading" && (
                            <button className="btn" onClick={() => runOne(p)} style={{ background: "transparent", border: "1px solid rgba(232,113,42,0.3)", color: "#E8712A", padding: "4px 9px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>Run</button>
                          )}
                          {r && (
                            <button className="btn" onClick={() => setExpanded(isOpen ? null : p.id)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#888", padding: "4px 9px", fontSize: 10, fontFamily: "monospace", borderRadius: 3 }}>
                              {isOpen ? "▲ Hide" : "▼ Details"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isOpen && r && (
                      <tr key={`${p.id}-exp`}>
                        <td colSpan={12} style={{ padding: "0 10px 22px 40px", background: "rgba(232,113,42,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: 18, paddingTop: 16 }}>

                            {/* Original + evaluation */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                              <div style={{
                                padding: "14px", background: "rgba(255,255,255,0.02)",
                                border: `1px solid ${r.decision === "ACCEPT" ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.05)"}`,
                                borderRadius: 4, display: "flex", flexDirection: "column", gap: 13, flexGrow: 1
                              }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E2D9", lineHeight: 1.3 }}>{r.rewrite.title}</div>

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
                                    {(Array.isArray(r.rewrite.youll_leave_with)
                                      ? r.rewrite.youll_leave_with
                                      : [r.rewrite.youll_leave_with]
                                    ).map((item, i) => (
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
                                placeholder="Add editorial notes, override decisions, flag for follow-up, draft rewrite edits…"
                                rows={9}
                                style={{
                                  width: "100%", background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4,
                                  color: "#E8E2D9", fontSize: 12, padding: "10px 12px",
                                  fontFamily: "monospace", lineHeight: 1.6, boxSizing: "border-box", flexGrow: 1
                                }}
                              />
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {r.level && <Badge label={r.level} color={LEVEL_COLORS[r.level] || "#aaa"} />}
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
      {doneCount === 10 && activeTab === "table" && (
        <div style={{ marginTop: 26, padding: "18px 22px", border: "1px solid rgba(232,113,42,0.2)", borderRadius: 5, background: "rgba(232,113,42,0.03)", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "Accepted", val: accepted, color: "#4ade80" },
            { label: "Rejected", val: rejected, color: "#f87171" },
            { label: "Overlaps Flagged", val: overlapSessions.length, color: "#fbbf24" },
            { label: "Avg Score (Accepted)", color: "#E8E2D9", val: (Object.values(results).filter(r => r.decision === "ACCEPT").reduce((s, r) => s + parseFloat(r.overall), 0) / Math.max(1, accepted)).toFixed(1) }
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
