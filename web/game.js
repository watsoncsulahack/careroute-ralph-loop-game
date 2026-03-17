const canvas = document.getElementById('cityCanvas');
const ctx = canvas.getContext('2d');

const state = {
  running: false,
  engineOn: false,
  timeLeft: 120,
  money: 1613,
  saved: 0,
  survival: 0,
  best: Number(localStorage.getItem('careroute_best_survival') || 0),
  ambulance: { x: 110, y: 110, angle: 0, speed: 0 },
  patient: { x: 760, y: 140 },
  hospitals: [{ x: 820, y: 430 }, { x: 120, y: 430 }],
  carrying: false,
};

const roads = [
  { x: 80, y: 80, w: 760, h: 60 },
  { x: 80, y: 230, w: 760, h: 60 },
  { x: 80, y: 380, w: 760, h: 60 },
  { x: 80, y: 80, w: 60, h: 360 },
  { x: 280, y: 80, w: 60, h: 360 },
  { x: 500, y: 80, w: 60, h: 360 },
  { x: 780, y: 80, w: 60, h: 360 }
];

const el = (id) => document.getElementById(id);
function setStatus(s){ el('status').textContent = s; }

function inRoad(x,y){
  return roads.some(r => x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h);
}

function nearestHospital(p){
  return state.hospitals.slice().sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
}

function spawnPatient(){
  const candidates = [
    {x:760,y:140},{x:330,y:260},{x:550,y:400},{x:140,y:260},{x:740,y:260}
  ];
  state.patient = candidates[Math.floor(Math.random()*candidates.length)];
}

function resetRun(){
  state.running = true;
  state.engineOn = false;
  state.timeLeft = 120;
  state.money = 1613;
  state.saved = 0;
  state.survival = 0;
  state.ambulance = { x: 110, y: 110, angle: 0, speed: 0 };
  state.carrying = false;
  spawnPatient();
  setStatus('Run started. Start engine, steer, and rescue quickly.');
}

function update(dt){
  if(!state.running) return;

  // budget drain request: $4.46 / sec
  state.money -= 4.46 * dt;
  state.timeLeft -= dt;
  state.survival += dt;

  // momentum model (no keypress movement)
  if(state.engineOn) state.ambulance.speed = Math.min(120, state.ambulance.speed + 26*dt);
  else state.ambulance.speed = Math.max(0, state.ambulance.speed - 34*dt);

  const nx = state.ambulance.x + Math.cos(state.ambulance.angle) * state.ambulance.speed * dt;
  const ny = state.ambulance.y + Math.sin(state.ambulance.angle) * state.ambulance.speed * dt;

  if(inRoad(nx, ny)) {
    state.ambulance.x = nx; state.ambulance.y = ny;
  } else {
    state.ambulance.speed *= 0.4;
  }

  if(!state.carrying && state.patient && Math.hypot(state.ambulance.x-state.patient.x, state.ambulance.y-state.patient.y) < 28){
    state.carrying = true;
    state.patient = null;
    setStatus('🧍 picked up! Deliver to nearest 🏥 now.');
  }

  if(state.carrying){
    const h = nearestHospital(state.ambulance);
    if(Math.hypot(state.ambulance.x-h.x, state.ambulance.y-h.y) < 30){
      state.carrying = false;
      state.saved += 1;
      state.timeLeft += 15;
      state.money += 220;
      setStatus('✅ Delivered! +15s and +$220. Find next patient.');
      spawnPatient();
    }
  }

  if(state.timeLeft <= 0 || state.money <= 0){
    state.running = false;
    state.engineOn = false;
    if(state.survival > state.best){
      state.best = Math.floor(state.survival);
      localStorage.setItem('careroute_best_survival', String(state.best));
    }
    setStatus(`Game over. Survival ${Math.floor(state.survival)}s, rescues ${state.saved}.`);
  }
}

function drawCity(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // city blocks background
  ctx.fillStyle = '#131a28';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // roads
  ctx.fillStyle = '#2b3243';
  roads.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));

  // lane markings
  ctx.strokeStyle = '#9ea6bc';
  ctx.setLineDash([8,8]);
  roads.forEach(r=>{
    if(r.w > r.h){
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h/2);
      ctx.lineTo(r.x + r.w, r.y + r.h/2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(r.x + r.w/2, r.y);
      ctx.lineTo(r.x + r.w/2, r.y + r.h);
      ctx.stroke();
    }
  });
  ctx.setLineDash([]);

  // hospitals
  ctx.font = '28px sans-serif';
  state.hospitals.forEach(h=>ctx.fillText('🏥', h.x-14, h.y+10));

  // patient
  if(state.patient) ctx.fillText('🧍', state.patient.x-12, state.patient.y+10);

  // ambulance
  ctx.save();
  ctx.translate(state.ambulance.x, state.ambulance.y);
  ctx.rotate(state.ambulance.angle);
  ctx.font = '28px sans-serif';
  ctx.fillText('🚑', -14, 10);
  ctx.restore();
}

function renderHUD(){
  el('timeLeft').textContent = Math.max(0, state.timeLeft).toFixed(1);
  el('moneyLeft').textContent = Math.max(0, state.money).toFixed(2);
  el('savedCount').textContent = state.saved;
  el('survivalTime').textContent = Math.floor(state.survival);
  el('bestScore').textContent = state.best;
  el('engineState').textContent = state.engineOn ? 'ON' : 'OFF';
}

let prev = performance.now();
function loop(ts){
  const dt = Math.min(0.05, (ts - prev)/1000);
  prev = ts;
  update(dt);
  drawCity();
  renderHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

el('startBtn').onclick = resetRun;
el('engineBtn').onclick = ()=>{
  if(!state.running) return;
  state.engineOn = !state.engineOn;
  setStatus(state.engineOn ? 'Engine ON. Use steering to navigate.' : 'Engine OFF. Momentum decaying.');
};
el('leftBtn').onclick = ()=>{ if(state.running) state.ambulance.angle -= 0.22; };
el('rightBtn').onclick = ()=>{ if(state.running) state.ambulance.angle += 0.22; };
el('brakeBtn').onclick = ()=>{ if(state.running) state.ambulance.speed = Math.max(0, state.ambulance.speed - 40); };

renderHUD(); drawCity();
