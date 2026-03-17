const W = 10, H = 10;
const hospitals = [{x:1,y:1},{x:8,y:8}];
let ambulance = {x:5,y:5};
let patient = null;
let carrying = false;
let timeLeft = 120;
let moneyLeft = 1000;
let saved = 0;
let survival = 0;
let best = Number(localStorage.getItem('careroute_best_survival') || 0);
let timer = null;
let running = false;

const el = id => document.getElementById(id);

function randPos(){ return {x:Math.floor(Math.random()*W), y:Math.floor(Math.random()*H)}; }
function same(a,b){ return a && b && a.x===b.x && a.y===b.y; }
function dist(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }

function spawnPatient(){
  for(let i=0;i<200;i++){
    const p = randPos();
    if(!same(p,ambulance) && !hospitals.some(h=>same(h,p))){ patient=p; return; }
  }
}

function nearestHospital(p){
  return hospitals.slice().sort((a,b)=>dist(p,a)-dist(p,b))[0];
}

function setStatus(msg){ el('status').textContent = msg; }

function renderMap(){
  let out='';
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const pos={x,y};
      let ch='.';
      if(hospitals.some(h=>same(h,pos))) ch='H';
      if(patient && same(patient,pos)) ch='P';
      if(same(ambulance,pos)) ch= carrying ? 'A*' : 'A';
      out += ch.padEnd(3,' ');
    }
    out+='\n';
  }
  el('map').textContent = out;
  el('timeLeft').textContent = Math.max(0, Math.floor(timeLeft));
  el('moneyLeft').textContent = Math.max(0, Math.floor(moneyLeft));
  el('savedCount').textContent = saved;
  el('survivalTime').textContent = Math.floor(survival);
  el('bestScore').textContent = best;
}

function tick(){
  if(!running) return;
  timeLeft -= 1;
  moneyLeft -= 8; // burn rate
  survival += 1;

  if(timeLeft<=0 || moneyLeft<=0){
    running=false;
    clearInterval(timer);
    if(survival>best){ best = Math.floor(survival); localStorage.setItem('careroute_best_survival', String(best)); }
    setStatus(`Game over. Survival ${Math.floor(survival)}s, patients saved ${saved}.`);
  }
  renderMap();
}

function move(dx,dy){
  if(!running) return;
  ambulance.x = Math.max(0, Math.min(W-1, ambulance.x + dx));
  ambulance.y = Math.max(0, Math.min(H-1, ambulance.y + dy));

  if(!carrying && patient && same(ambulance, patient)){
    carrying = true;
    patient = null;
    setStatus('Patient picked up. Deliver to nearest hospital!');
  }

  if(carrying && hospitals.some(h=>same(h,ambulance))){
    carrying = false;
    saved += 1;
    const bonusTime = 12;
    const bonusMoney = 180;
    timeLeft += bonusTime;
    moneyLeft += bonusMoney;
    setStatus(`Patient delivered! +${bonusTime}s, +$${bonusMoney}. Keep going.`);
    spawnPatient();
  }

  if(!patient && !carrying) spawnPatient();
  renderMap();
}

function startGame(){
  ambulance = {x:5,y:5};
  carrying = false;
  timeLeft = 120;
  moneyLeft = 1000;
  saved = 0;
  survival = 0;
  running = true;
  spawnPatient();
  setStatus('Rescue started. Pick up patients and deliver fast.');
  if(timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
  renderMap();
}

el('startBtn').onclick = startGame;
el('upBtn').onclick = ()=>move(0,-1);
el('downBtn').onclick = ()=>move(0,1);
el('leftBtn').onclick = ()=>move(-1,0);
el('rightBtn').onclick = ()=>move(1,0);

document.addEventListener('keydown',(e)=>{
  if(e.key==='ArrowUp') move(0,-1);
  if(e.key==='ArrowDown') move(0,1);
  if(e.key==='ArrowLeft') move(-1,0);
  if(e.key==='ArrowRight') move(1,0);
  if(e.key.toLowerCase()==='s') startGame();
});

renderMap();
