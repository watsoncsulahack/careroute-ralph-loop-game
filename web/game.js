const canvas = document.getElementById('cityCanvas');
const ctx = canvas.getContext('2d');

const SCORE_DB_HOST = '7d5f26cb-f87a-493c-b84f-7d1357a2f9b3-bluemix.cloudantnosqldb.appdomain.cloud';
const SCORE_DB = 'careroute_game_scores';
const SCORE_UPDATE_URL = `https://${SCORE_DB_HOST}/${SCORE_DB}/_design/scores/_update/submit`;
const SCORE_READ_URL = `https://${SCORE_DB_HOST}/${SCORE_DB}/_all_docs?include_docs=true&limit=300`;

const MAX_SPEED = 120;
const PATIENT_TIMEOUT_SECONDS = 10;
const DROPOFF_TIMEOUT_SECONDS = 10;
const PATIENT_TIMEOUT_MONEY_PENALTY = 140;
const PATIENT_TIMEOUT_TIME_PENALTY = 6;
const TRIANGLE_OBSTACLE_TTL = 25;
const WATER_SPLAT_TTL = 30;
const WATER_SPAWN_START_SECONDS = 15;
const WATER_SPAWN_INTERVAL_SECONDS = 15;
const ROADBLOCK_TTL = 8;
const ROADBLOCK_START_SECONDS = 30;
const ROADBLOCK_SPAWN_INTERVAL_SECONDS = 10;
const CAR_TTL = 10;
const CAR_START_SECONDS = 45;
const CAR_SPAWN_INTERVAL_SECONDS = 15;
const CAR_SPEED = 58;
const MONEY_DRAIN_MIN_PER_SEC = 4;
const MONEY_DRAIN_MAX_PER_SEC = 100;

const state = {
  running: false,
  engineOn: true,
  timeLeft: 60,
  money: 1000,
  saved: 0,
  survival: 0,
  best: Number(localStorage.getItem('careroute_best_survival') || 0),
  ambulance: { x: 110, y: 110, angle: 0, speed: 0 },
  patient: { x: 760, y: 140 },
  hospitals: [{ x: 820, y: 430 }, { x: 120, y: 430 }],
  carrying: false,
  carryTtl: 0,
  steerLeft: false,
  steerRight: false,
  obstacles: [],
  waterSplats: [],
  roadblocks: [],
  cars: [],
  obstacleHitCooldown: 0,
  waterHitCooldown: 0,
  roadblockHitCooldown: 0,
  obstacleSpawnTimer: 5,
  waterSpawnTimer: WATER_SPAWN_INTERVAL_SECONDS,
  waterSpawnUnlocked: false,
  roadblockSpawnTimer: ROADBLOCK_SPAWN_INTERVAL_SECONDS,
  roadblockUnlocked: false,
  carSpawnTimer: CAR_SPAWN_INTERVAL_SECONDS,
  carsUnlocked: false,
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

function preventDoubleTapZoom(){
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if(now - lastTouchEnd <= 280){
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
}

function fitCanvasToDisplay(){
  const wrap = document.querySelector('.wrap');
  const width = Math.min(940, (wrap?.clientWidth || window.innerWidth) - 8);
  canvas.style.width = `${Math.max(280, width)}px`;
}

function openLeaderboard(show){
  const panel = el('leaderboardPanel');
  if(!panel) return;
  panel.classList.toggle('hiddenPanel', !show);
}

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
  const p = candidates[Math.floor(Math.random()*candidates.length)];
  state.patient = { ...p, ttl: PATIENT_TIMEOUT_SECONDS };
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
  state.obstacles.push({ ...p, ttl: TRIANGLE_OBSTACLE_TTL });
}

function spawnWaterSplat(){
  let p = randomRoadPoint();
  for(let i=0;i<8;i++){
    const tooCloseAmbulance = Math.hypot(p.x - state.ambulance.x, p.y - state.ambulance.y) < 85;
    const tooClosePatient = state.patient && Math.hypot(p.x - state.patient.x, p.y - state.patient.y) < 55;
    const tooCloseHospital = state.hospitals.some(h => Math.hypot(p.x - h.x, p.y - h.y) < 55);
    const tooCloseWater = state.waterSplats.some(w => Math.hypot(p.x - w.x, p.y - w.y) < 40);
    if(!(tooCloseAmbulance || tooClosePatient || tooCloseHospital || tooCloseWater)) break;
    p = randomRoadPoint();
  }
  state.waterSplats.push({ ...p, ttl: WATER_SPLAT_TTL });
}

function spawnRoadblock(){
  let p = randomRoadPoint();
  for(let i=0;i<8;i++){
    const tooCloseAmbulance = Math.hypot(p.x - state.ambulance.x, p.y - state.ambulance.y) < 90;
    const tooClosePatient = state.patient && Math.hypot(p.x - state.patient.x, p.y - state.patient.y) < 60;
    const tooCloseHospital = state.hospitals.some(h => Math.hypot(p.x - h.x, p.y - h.y) < 60);
    const tooCloseRoadblock = state.roadblocks.some(b => Math.hypot(p.x - b.x, p.y - b.y) < 55);
    if(!(tooCloseAmbulance || tooClosePatient || tooCloseHospital || tooCloseRoadblock)) break;
    p = randomRoadPoint();
  }
  state.roadblocks.push({ ...p, ttl: ROADBLOCK_TTL });
}

function spawnCar(){
  const r = roads[Math.floor(Math.random()*roads.length)];
  const horizontal = r.w > r.h;
  const dir = Math.random() < 0.5 ? -1 : 1;
  if(horizontal){
    const laneOffset = Math.random() < 0.5 ? -10 : 10;
    const y = r.y + (r.h / 2) + laneOffset;
    const x = dir > 0 ? r.x + 6 : r.x + r.w - 6;
    state.cars.push({ x, y, vx: dir * CAR_SPEED, vy: 0, ttl: CAR_TTL });
  } else {
    const laneOffset = Math.random() < 0.5 ? -10 : 10;
    const x = r.x + (r.w / 2) + laneOffset;
    const y = dir > 0 ? r.y + 6 : r.y + r.h - 6;
    state.cars.push({ x, y, vx: 0, vy: dir * CAR_SPEED, ttl: CAR_TTL });
  }
}

function isRoadBlocked(x, y){
  return state.roadblocks.some(b => Math.hypot(x - b.x, y - b.y) < 20);
}

function resetRun(){
  state.running = true;
  state.engineOn = true;
  state.timeLeft = 60;
  state.money = 1000;
  state.saved = 0;
  state.survival = 0;
  state.ambulance = { x: 110, y: 110, angle: 0, speed: 0 };
  state.carrying = false;
  state.carryTtl = 0;
  state.obstacles = [];
  state.waterSplats = [];
  state.roadblocks = [];
  state.cars = [];
  state.obstacleHitCooldown = 0;
  state.waterHitCooldown = 0;
  state.roadblockHitCooldown = 0;
  state.obstacleSpawnTimer = 5; // first triangle obstacle after 5s
  state.waterSpawnTimer = WATER_SPAWN_INTERVAL_SECONDS;
  state.waterSpawnUnlocked = false;
  state.roadblockSpawnTimer = ROADBLOCK_SPAWN_INTERVAL_SECONDS;
  state.roadblockUnlocked = false;
  state.carSpawnTimer = CAR_SPAWN_INTERVAL_SECONDS;
  state.carsUnlocked = false;
  spawnPatient();
  setStatus('Run started (60s). $1000 initial. Triangle 5s→3s. Water starts 15s (every 15s). Roadblocks start 30s. Cars start 45s.');
}

function update(dt){
  if(!state.running) return;

  state.timeLeft -= dt;
  state.survival += dt;

  // auto-engine momentum model
  state.ambulance.speed = Math.min(MAX_SPEED, state.ambulance.speed + 26*dt);
  state.ambulance.speed = Math.max(0, state.ambulance.speed - 5*dt);

  if(state.steerLeft) state.ambulance.angle -= 2.4 * dt;
  if(state.steerRight) state.ambulance.angle += 2.4 * dt;

  const nx = state.ambulance.x + Math.cos(state.ambulance.angle) * state.ambulance.speed * dt;
  const ny = state.ambulance.y + Math.sin(state.ambulance.angle) * state.ambulance.speed * dt;

  if(inRoad(nx, ny) && !isRoadBlocked(nx, ny)) {
    state.ambulance.x = nx; state.ambulance.y = ny;
  } else {
    state.ambulance.speed *= 0.4;
    if(isRoadBlocked(nx, ny) && state.roadblockHitCooldown <= 0){
      setStatus('🧱 Roadblock ahead! Route around it.');
      state.roadblockHitCooldown = 0.5;
    }
  }

  if(state.obstacleHitCooldown > 0) state.obstacleHitCooldown -= dt;
  if(state.waterHitCooldown > 0) state.waterHitCooldown -= dt;
  if(state.roadblockHitCooldown > 0) state.roadblockHitCooldown -= dt;

  state.obstacles.forEach(o => { o.ttl -= dt; });
  state.obstacles = state.obstacles.filter(o => o.ttl > 0);
  state.waterSplats.forEach(w => { w.ttl -= dt; });
  state.waterSplats = state.waterSplats.filter(w => w.ttl > 0);
  state.roadblocks.forEach(b => { b.ttl -= dt; });
  state.roadblocks = state.roadblocks.filter(b => b.ttl > 0);
  state.cars.forEach(c => {
    c.ttl -= dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  });
  state.cars = state.cars.filter(c => c.ttl > 0 && c.x > -40 && c.x < canvas.width + 40 && c.y > -40 && c.y < canvas.height + 40);

  state.obstacleSpawnTimer -= dt;
  if(state.obstacleSpawnTimer <= 0){
    if(state.obstacles.length < 10) spawnObstacle();
    state.obstacleSpawnTimer = 3;
  }

  if(!state.waterSpawnUnlocked && state.survival >= WATER_SPAWN_START_SECONDS){
    state.waterSpawnUnlocked = true;
    state.waterSpawnTimer = 0;
  }
  if(state.waterSpawnUnlocked){
    state.waterSpawnTimer -= dt;
    if(state.waterSpawnTimer <= 0){
      if(state.waterSplats.length < 8) spawnWaterSplat();
      state.waterSpawnTimer = WATER_SPAWN_INTERVAL_SECONDS;
    }
  }

  if(!state.roadblockUnlocked && state.survival >= ROADBLOCK_START_SECONDS){
    state.roadblockUnlocked = true;
    state.roadblockSpawnTimer = 0;
  }
  if(state.roadblockUnlocked){
    state.roadblockSpawnTimer -= dt;
    if(state.roadblockSpawnTimer <= 0){
      if(state.roadblocks.length < 8) spawnRoadblock();
      state.roadblockSpawnTimer = ROADBLOCK_SPAWN_INTERVAL_SECONDS;
    }
  }

  if(!state.carsUnlocked && state.survival >= CAR_START_SECONDS){
    state.carsUnlocked = true;
    state.carSpawnTimer = 0;
  }
  if(state.carsUnlocked){
    state.carSpawnTimer -= dt;
    if(state.carSpawnTimer <= 0){
      spawnCar();
      spawnCar();
      state.carSpawnTimer = CAR_SPAWN_INTERVAL_SECONDS;
    }
  }

  const hit = state.obstacles.find(o => Math.hypot(state.ambulance.x - o.x, state.ambulance.y - o.y) < 18);
  if(hit && state.obstacleHitCooldown <= 0){
    state.money -= 140;
    state.ambulance.speed *= 0.55;
    state.obstacleHitCooldown = 0.9;
    setStatus('⚠️ Collision with obstacle! -$140');
    // remove hit obstacle; new ones spawn on timer
    hit.ttl = 0;
    state.obstacles = state.obstacles.filter(o => o.ttl > 0);
  }

  const waterHit = state.waterSplats.find(w => Math.hypot(state.ambulance.x - w.x, state.ambulance.y - w.y) < 20);
  if(waterHit && state.waterHitCooldown <= 0){
    state.ambulance.speed *= 0.45;
    state.waterHitCooldown = 0.55;
    setStatus('💧 Hit water! Momentum reduced.');
  }

  // money drain tied to momentum: standstill = $100/s, max momentum = $4/s
  const speedNorm = Math.max(0, Math.min(1, state.ambulance.speed / MAX_SPEED));
  const moneyDrainRate = MONEY_DRAIN_MAX_PER_SEC - ((MONEY_DRAIN_MAX_PER_SEC - MONEY_DRAIN_MIN_PER_SEC) * speedNorm);
  state.money -= moneyDrainRate * dt;

  if(!state.carrying && state.patient){
    state.patient.ttl -= dt;
    if(state.patient.ttl <= 0){
      state.money -= PATIENT_TIMEOUT_MONEY_PENALTY;
      state.timeLeft -= PATIENT_TIMEOUT_TIME_PENALTY;
      setStatus(`⌛ Patient missed! -$${PATIENT_TIMEOUT_MONEY_PENALTY} and -${PATIENT_TIMEOUT_TIME_PENALTY}s`);
      spawnPatient();
    }
  }

  if(!state.carrying && state.patient && Math.hypot(state.ambulance.x-state.patient.x, state.ambulance.y-state.patient.y) < 28){
    state.carrying = true;
    state.carryTtl = DROPOFF_TIMEOUT_SECONDS;
    state.patient = null;
    setStatus(`🧍 Picked up! Drop off within ${DROPOFF_TIMEOUT_SECONDS}s.`);
  }

  if(state.carrying){
    state.carryTtl -= dt;
    if(state.carryTtl <= 0){
      state.carrying = false;
      state.carryTtl = 0;
      state.money -= PATIENT_TIMEOUT_MONEY_PENALTY;
      state.timeLeft -= PATIENT_TIMEOUT_TIME_PENALTY;
      setStatus(`⌛ Drop-off missed! -$${PATIENT_TIMEOUT_MONEY_PENALTY} and -${PATIENT_TIMEOUT_TIME_PENALTY}s`);
      spawnPatient();
    } else {
      const h = nearestHospital(state.ambulance);
      if(Math.hypot(state.ambulance.x-h.x, state.ambulance.y-h.y) < 30){
        state.carrying = false;
        state.carryTtl = 0;
        state.saved += 1;
        state.timeLeft += 15;
        state.money += 220;
        setStatus('✅ Delivered! +15s and +$220. Find next patient.');
        spawnPatient();
      }
    }
  }

  if(state.timeLeft <= 0 || state.money <= 0){
    state.running = false;
    state.engineOn = false;
    if(state.survival > state.best){
      state.best = Math.floor(state.survival);
      localStorage.setItem('careroute_best_survival', String(state.best));
    }
    setStatus(`Game over. Survival ${Math.floor(state.survival)}s, rescues ${state.saved}. Submit your score to leaderboard!`);
    openLeaderboard(true);
    if(el('submitStatus')) el('submitStatus').textContent = 'Enter your name and submit your score.';
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

  // triangle obstacles
  state.obstacles.forEach(o => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.globalAlpha = Math.max(0.25, Math.min(1, o.ttl / TRIANGLE_OBSTACLE_TTL));
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

  // water splats (slow momentum only)
  state.waterSplats.forEach(w => {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.globalAlpha = Math.max(0.28, Math.min(1, w.ttl / WATER_SPLAT_TTL));
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2);
    ctx.arc(3, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // roadblocks (solid blockers)
  state.roadblocks.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = Math.max(0.35, Math.min(1, b.ttl / ROADBLOCK_TTL));
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-12, -8, 24, 16);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-10, -2, 20, 4);
    ctx.restore();
  });

  // moving cars (medium constant speed)
  state.cars.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.atan2(c.vy, c.vx));
    ctx.globalAlpha = Math.max(0.4, Math.min(1, c.ttl / CAR_TTL));
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(-6, -4, 12, 8);
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
}

function normalizeScores(payload){
  const docs = (payload.rows || []).map(r => r.doc).filter(Boolean);
  return docs
    .filter(d => d.type === 'high_score')
    .sort((a,b) => (b.score||0) - (a.score||0) || (b.timestamp||0) - (a.timestamp||0))
    .slice(0, 20);
}

function renderLeaderboard(rows){
  const list = el('leaderboardList');
  if(!list) return;
  list.innerHTML = rows.map((r, i) => `<li>#${i+1} <strong>${(r.name||'Player')}</strong> — ${r.score||0}s (rescues ${r.rescues||0})</li>`).join('');
  el('topOnlineScore').textContent = rows[0]?.score || 0;
}

function loadLeaderboard(){
  return new Promise((resolve) => {
    const cb = `careroute_score_cb_${Date.now()}`;
    window[cb] = (payload) => {
      try {
        const rows = normalizeScores(payload);
        renderLeaderboard(rows);
        resolve(rows);
      } finally {
        delete window[cb];
        script.remove();
      }
    };
    const script = document.createElement('script');
    script.src = `${SCORE_READ_URL}&callback=${cb}`;
    script.onerror = () => {
      delete window[cb];
      el('submitStatus').textContent = 'Leaderboard load failed.';
      resolve([]);
    };
    document.head.appendChild(script);
  });
}

function submitScore(){
  const name = (el('playerNameInput')?.value || '').trim() || 'Player';
  const payload = {
    name,
    score: Math.floor(state.survival),
    rescues: state.saved,
    money: Math.max(0, state.money).toFixed(2),
    timestamp: Date.now(),
    source: 'web-game'
  };

  const iframe = document.createElement('iframe');
  iframe.name = `score_post_${Date.now()}`;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const form = document.createElement('form');
  form.method = 'POST';
  form.target = iframe.name;
  form.action = SCORE_UPDATE_URL;
  Object.entries(payload).forEach(([k,v]) => {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = String(v);
    form.appendChild(i);
  });
  document.body.appendChild(form);
  form.submit();

  el('submitStatus').textContent = `Submitted ${payload.score}s for ${payload.name}. Refreshing leaderboard...`;
  setTimeout(() => {
    form.remove();
    iframe.remove();
    loadLeaderboard();
  }, 900);
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

el('startBtn').onclick = () => {
  resetRun();
  openLeaderboard(false);
};
el('leaderboardBtn').onclick = async () => {
  const panelHidden = el('leaderboardPanel').classList.contains('hiddenPanel');
  openLeaderboard(panelHidden);
  if(panelHidden) await loadLeaderboard();
};
el('refreshBoardBtn').onclick = () => loadLeaderboard();
el('submitScoreBtn').onclick = submitScore;

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

document.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  if(!state.running) return;
  if(e.key === 'ArrowLeft') state.steerLeft = true;
  if(e.key === 'ArrowRight') state.steerRight = true;
});
document.addEventListener('keyup', (e)=>{
  if(e.key === 'ArrowLeft') state.steerLeft = false;
  if(e.key === 'ArrowRight') state.steerRight = false;
});

preventDoubleTapZoom();
window.addEventListener('resize', fitCanvasToDisplay);
fitCanvasToDisplay();
loadLeaderboard();

renderHUD(); drawCity();
