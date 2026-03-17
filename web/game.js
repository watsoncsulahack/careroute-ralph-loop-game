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
  steerLeft: false,
  steerRight: false,
  obstacles: [],
  obstacleHitCooldown: 0,
  obstacleSpawnTimer: 5,
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

function randomRoadPoint(){
  const r = roads[Math.floor(Math.random()*roads.length)];
  return {
    x: r.x + 18 + Math.random() * Math.max(1, r.w - 36),
    y: r.y + 18 + Math.random() * Math.max(1, r.h - 36),
  };
}

function spawnObstacle(){
  let p = randomRoadPoint();
  for(let i=0;i<8;i++){
    const tooCloseAmbulance = Math.hypot(p.x - state.ambulance.x, p.y - state.ambulance.y) < 90;
    const tooClosePatient = state.patient && Math.hypot(p.x - state.patient.x, p.y - state.patient.y) < 65;
    const tooCloseHospital = state.hospitals.some(h => Math.hypot(p.x - h.x, p.y - h.y) < 65);
    const tooCloseObstacle = state.obstacles.some(o => Math.hypot(p.x - o.x, p.y - o.y) < 45);
    if(!(tooCloseAmbulance || tooClosePatient || tooCloseHospital || tooCloseObstacle)) break;
    p = randomRoadPoint();
  }
  state.obstacles.push(p);
}

function initObstacles(count = 6){
  state.obstacles = [];
  for(let i=0;i<count;i++) spawnObstacle();
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
  state.obstacleHitCooldown = 0;
  state.obstacleSpawnTimer = 4 + Math.random() * 3;
  spawnPatient();
  initObstacles(6);
  setStatus('Run started. Start engine, steer, rescue quickly, and avoid obstacles.');
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

  if(state.steerLeft) state.ambulance.angle -= 2.4 * dt;
  if(state.steerRight) state.ambulance.angle += 2.4 * dt;

  const nx = state.ambulance.x + Math.cos(state.ambulance.angle) * state.ambulance.speed * dt;
  const ny = state.ambulance.y + Math.sin(state.ambulance.angle) * state.ambulance.speed * dt;

  if(inRoad(nx, ny)) {
    state.ambulance.x = nx; state.ambulance.y = ny;
  } else {
    state.ambulance.speed *= 0.4;
  }

  if(state.obstacleHitCooldown > 0) state.obstacleHitCooldown -= dt;
  state.obstacleSpawnTimer -= dt;
  if(state.obstacleSpawnTimer <= 0){
    if(state.obstacles.length < 10) spawnObstacle();
    state.obstacleSpawnTimer = 6 + Math.random() * 4;
  }

  const hit = state.obstacles.find(o => Math.hypot(state.ambulance.x - o.x, state.ambulance.y - o.y) < 18);
  if(hit && state.obstacleHitCooldown <= 0){
    state.money -= 140;
    state.ambulance.speed *= 0.55;
    state.obstacleHitCooldown = 0.9;
    setStatus('⚠️ Collision with obstacle! -$140');
    // re-spawn this obstacle elsewhere
    hit.x = -9999;
    hit.y = -9999;
    state.obstacles = state.obstacles.filter(o => o.x > -5000);
    spawnObstacle();
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

  // obstacles
  state.obstacles.forEach(o => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, 9);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(-2, 2, 4, 4);
    ctx.restore();
  });

  // hospitals
  ctx.font = '28px sans-serif';
  state.hospitals.forEach(h=>ctx.fillText('🏥', h.x-14, h.y+10));

  // patient
  if(state.patient) ctx.fillText('🧍', state.patient.x-12, state.patient.y+10);

  // ambulance (top-down wireframe style)
  ctx.save();
  ctx.translate(state.ambulance.x, state.ambulance.y);
  ctx.rotate(state.ambulance.angle);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-14, -8, 28, 16);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-3, -8, 6, 16);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(22, 0);
  ctx.stroke();
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
function bindSteerHold(btn, dir){
  const on = () => { if(state.running){ if(dir==='left') state.steerLeft = true; else state.steerRight = true; } };
  const off = () => { if(dir==='left') state.steerLeft = false; else state.steerRight = false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('touchstart', on, {passive:true});
  btn.addEventListener('touchend', off, {passive:true});
  btn.addEventListener('mousedown', on);
  btn.addEventListener('mouseup', off);
}

bindSteerHold(el('leftBtn'), 'left');
bindSteerHold(el('rightBtn'), 'right');
el('brakeBtn').onclick = ()=>{ if(state.running) state.ambulance.speed = Math.max(0, state.ambulance.speed - 40); };

document.addEventListener('keydown', (e)=>{
  if(!state.running) return;
  if(e.key === 'ArrowLeft') state.steerLeft = true;
  if(e.key === 'ArrowRight') state.steerRight = true;
});
document.addEventListener('keyup', (e)=>{
  if(e.key === 'ArrowLeft') state.steerLeft = false;
  if(e.key === 'ArrowRight') state.steerRight = false;
});

renderHUD(); drawCity();
