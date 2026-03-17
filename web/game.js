const roles = {
  insurance: {
    label: "Insurance Coordinator",
    mission: "Keep care affordable while approving life-saving pathways fast.",
    hint: "Remove coverage friction so treatment is never delayed."
  },
  hospital: {
    label: "Hospital Intake Lead",
    mission: "Accept the patient path that best matches capability and urgency.",
    hint: "Protect clinical quality by matching acuity to the right facility."
  },
  ambulance: {
    label: "Ambulance Dispatcher",
    mission: "Get the right unit moving quickly and safely.",
    hint: "Win minutes early: right crew, right route, right handoff."
  }
};

const baseStages = [
  {
    name: "User Intake",
    owner: "hospital",
    objective: "Confirm urgency and activate stroke pathway without delay.",
    text: "Patient reports stroke-like symptoms. Choose initial handling.",
    choices: [
      { label: "Escalate stroke protocol immediately", impact: "fast+fit" },
      { label: "Standard intake questionnaire first", impact: "cost+slow" }
    ]
  },
  {
    name: "Ambulance Dispatch",
    owner: "ambulance",
    objective: "Pick the unit that can stabilize early and keep transport reliable.",
    text: "Select which unit to dispatch.",
    choices: [
      { label: "ALS unit (slightly higher cost, faster stabilization)", impact: "fit+time" },
      { label: "Nearest basic unit (lower cost, lower stabilization capability)", impact: "cost+risk" }
    ]
  },
  {
    name: "Hospital Match",
    owner: "hospital",
    objective: "Route to the facility best aligned to this emergency profile.",
    text: "Pick destination facility.",
    choices: [
      { label: "Specialty neuro center", impact: "fit+outcome" },
      { label: "General ER", impact: "time+capacity" }
    ]
  },
  {
    name: "Insurance Route",
    owner: "insurance",
    objective: "Clear financial approval quickly so care continues uninterrupted.",
    text: "Choose payer routing action.",
    choices: [
      { label: "Pre-authorize in-network emergency pathway", impact: "cost+time" },
      { label: "Defer authorization review", impact: "delay+risk" }
    ]
  }
];

let idx = 0;
let roleKey = null;
let stats = { lives: 50, trust: 50, coordination: 50 };
let history = [];
let lastFeedback = "";

const el = (id) => document.getElementById(id);
const clamp = (v) => Math.max(0, Math.min(100, v));

function applyImpact(impact) {
  const map = {
    "fast+fit": { lives: +16, trust: +8, coordination: +12 },
    "cost+slow": { lives: -10, trust: -6, coordination: -8 },
    "fit+time": { lives: +12, trust: +6, coordination: +10 },
    "cost+risk": { lives: -8, trust: -5, coordination: -7 },
    "fit+outcome": { lives: +14, trust: +9, coordination: +7 },
    "time+capacity": { lives: +4, trust: +1, coordination: +2 },
    "cost+time": { lives: +8, trust: +8, coordination: +6 },
    "delay+risk": { lives: -12, trust: -9, coordination: -10 }
  };
  const d = map[impact] || { lives: 0, trust: 0, coordination: 0 };
  stats.lives = clamp(stats.lives + d.lives);
  stats.trust = clamp(stats.trust + d.trust);
  stats.coordination = clamp(stats.coordination + d.coordination);
}

function roleBiasHint() {
  if (!roleKey) return "Choose a role to start.";
  const role = roles[roleKey];
  const stage = baseStages[idx];
  if (!stage) return `${role.label}: ${role.hint}`;

  const ownerText =
    stage.owner === roleKey
      ? "This is your decision turn."
      : `This turn is led by ${roles[stage.owner].label}.`;

  return `${role.label}: ${role.hint} ${ownerText}`;
}

function impactFeedback(impact) {
  const copy = {
    "fast+fit": "Early activation reduces treatment delay and improves handoff confidence.",
    "cost+slow": "Extra intake friction slowed momentum and raised concern across teams.",
    "fit+time": "Advanced support in transit improved stabilization and team confidence.",
    "cost+risk": "Lower capability transport increased uncertainty during a critical window.",
    "fit+outcome": "Specialty match improved treatment readiness on arrival.",
    "time+capacity": "General ER accepted quickly, but specialty alignment was weaker.",
    "cost+time": "Fast authorization removed payer friction and kept treatment moving.",
    "delay+risk": "Authorization delay added avoidable risk and stakeholder tension."
  };
  return copy[impact] || "The decision changed team momentum.";
}

function renderTurnFlow() {
  if (!roleKey) {
    el("turnFlow").innerHTML = "<b>Turn Flow:</b> Pick a role to start the 4-step rescue chain.";
    return;
  }

  const parts = baseStages.map((stage, stageIdx) => {
    const badge = stageIdx < idx ? "✅" : stageIdx === idx ? "🟦" : "⬜";
    return `${badge} ${roles[stage.owner].label}`;
  });

  el("turnFlow").innerHTML = `<b>Turn Flow:</b> ${parts.join(" → ")}`;
}

function renderHistory() {
  if (!history.length) {
    el("history").innerHTML = "<h3>Decision Log</h3><p>No decisions yet.</p>";
    return;
  }
  const items = history
    .map((h) => `<li><b>${h.stage}</b> (${h.owner}): ${h.choice}</li>`)
    .join("");
  el("history").innerHTML = `<h3>Decision Log</h3><ul>${items}</ul>`;
}

function renderRoleSelect() {
  el("stageCard").innerHTML = `
    <h2>Pick Your Role</h2>
    <p>Play as one stakeholder. Every role contributes to saving lives.</p>
  `;
  el("choices").innerHTML = "";
  Object.entries(roles).forEach(([key, role], n) => {
    const b = document.createElement("button");
    b.dataset.choiceIndex = String(n + 1);
    b.textContent = `${n + 1}. ${role.label} — ${role.mission}`;
    b.onclick = () => {
      roleKey = key;
      idx = 0;
      stats = { lives: 50, trust: 50, coordination: 50 };
      history = [];
      lastFeedback = "";
      render();
    };
    el("choices").appendChild(b);
  });
  el("result").textContent = "";
}

function render() {
  el("round").textContent = Math.min(idx + 1, baseStages.length);
  el("timeScore").textContent = stats.lives;
  el("costScore").textContent = stats.trust;
  el("fitScore").textContent = stats.coordination;
  el("total").textContent = roleKey ? roles[roleKey].label : "Not selected";
  el("progressBar").style.width = `${(idx / baseStages.length) * 100}%`;
  el("coach").innerHTML = `<b>Mission Coach:</b> ${roleBiasHint()}`;
  renderTurnFlow();
  renderHistory();

  if (!roleKey) {
    renderRoleSelect();
    return;
  }

  if (idx >= baseStages.length) {
    const score = Math.round((stats.lives + stats.trust + stats.coordination) / 3);
    const verdict =
      score >= 70
        ? "Excellent coordination: this run shows how each stakeholder helps save lives."
        : score >= 50
          ? "Solid run: role choices worked, but coordination can improve."
          : "Needs improvement: replay and align decisions across stakeholders.";

    el("stageCard").innerHTML = `<h2>Run Complete</h2><p>You played as <b>${roles[roleKey].label}</b>.</p>`;
    el("choices").innerHTML = "";
    el("result").innerHTML = `<b>Outcome:</b> ${verdict}`;
    return;
  }

  const s = baseStages[idx];
  const activeRoleLabel = roles[s.owner].label;

  el("stageCard").innerHTML = `
    <h2>${s.name}</h2>
    <p><b>Decision Owner:</b> ${activeRoleLabel}</p>
    <p><b>Turn Objective:</b> ${s.objective}</p>
    <p>${s.text}</p>
  `;
  el("choices").innerHTML = "";
  el("result").innerHTML = lastFeedback ? `<b>Latest Update:</b> ${lastFeedback}` : "";

  s.choices.forEach((c, choiceIdx) => {
    const b = document.createElement("button");
    b.dataset.choiceIndex = String(choiceIdx + 1);
    b.textContent = `${choiceIdx + 1}. ${c.label}`;
    b.onclick = () => {
      history.push({ stage: s.name, owner: activeRoleLabel, choice: c.label });
      applyImpact(c.impact);
      const nextStage = baseStages[idx + 1];
      const nextOwner = nextStage ? roles[nextStage.owner].label : "Mission Review";
      lastFeedback = `${impactFeedback(c.impact)} Next lead: ${nextOwner}.`;
      idx++;
      render();
    };
    el("choices").appendChild(b);
  });
}

el("restart").onclick = () => {
  roleKey = null;
  idx = 0;
  stats = { lives: 50, trust: 50, coordination: 50 };
  history = [];
  lastFeedback = "";
  render();
};

document.addEventListener("keydown", (evt) => {
  if (!["1", "2", "3"].includes(evt.key)) return;
  const btn = document.querySelector(`button[data-choice-index="${evt.key}"]`);
  if (btn) btn.click();
});

render();
