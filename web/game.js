const stages = [
  {
    name: "User Intake",
    text: "Patient reports severe headache + mobility issues. Choose triage priority.",
    choices: [
      { label: "High Priority Stroke Suspect", delta: {time: +10, fit: +15, cost: -5} },
      { label: "Normal Priority", delta: {time: -15, fit: -10, cost: +5} }
    ]
  },
  {
    name: "Ambulance Selection",
    text: "Choose ambulance unit for dispatch.",
    choices: [
      { label: "A103 (closest ALS unit)", delta: {time: +15, fit: +5, cost: -5} },
      { label: "A221 (farther BLS unit)", delta: {time: -10, fit: -10, cost: +10} }
    ]
  },
  {
    name: "Hospital Match",
    text: "Choose destination facility.",
    choices: [
      { label: "Coastal Neuro Care (specialty)", delta: {time: +5, fit: +20, cost: -10} },
      { label: "General ER", delta: {time: +10, fit: -10, cost: +10} }
    ]
  },
  {
    name: "Insurance Check",
    text: "Select insurance routing policy.",
    choices: [
      { label: "In-network verified path", delta: {time: +5, fit: +5, cost: +20} },
      { label: "Out-of-network fallback", delta: {time: +0, fit: -5, cost: -20} }
    ]
  }
];

let idx = 0, scores = {time:100,cost:100,fit:100};
const el = id => document.getElementById(id);
function clamp(v){return Math.max(0,Math.min(200,v));}
function total(){return scores.time+scores.cost+scores.fit;}
function render(){
  el('round').textContent = idx+1;
  el('timeScore').textContent=scores.time;
  el('costScore').textContent=scores.cost;
  el('fitScore').textContent=scores.fit;
  el('total').textContent=total();

  if(idx>=stages.length){
    const t=total();
    const grade=t>=360?'A':'B';
    el('stageCard').innerHTML = `<h2>Run Complete</h2><p>CareRoute route simulation complete.</p>`;
    el('choices').innerHTML = '';
    el('result').innerHTML = `<b>Outcome:</b> Total ${t} (${grade})<br>${t>=360?'<span class="good">Fast pickup + strong clinical fit + lower cost exposure.</span>':'<span class="warn">Playable, but optimize route and insurance matching.</span>'}`;
    return;
  }

  const s=stages[idx];
  el('stageCard').innerHTML = `<h2>${s.name}</h2><p>${s.text}</p>`;
  el('result').textContent = '';
  el('choices').innerHTML = '';
  s.choices.forEach(c=>{
    const b=document.createElement('button');
    b.textContent=c.label;
    b.onclick=()=>{
      scores.time=clamp(scores.time+c.delta.time);
      scores.cost=clamp(scores.cost+c.delta.cost);
      scores.fit=clamp(scores.fit+c.delta.fit);
      idx++; render();
    };
    el('choices').appendChild(b);
  });
}
el('restart').onclick=()=>{idx=0;scores={time:100,cost:100,fit:100};render();}
render();
