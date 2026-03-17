# watsonx RALPH Round 2

- run_id: 522e3bd0-371f-48e5-892f-c8a97d89842c
- status: completed

**🚀 Highest‑impact next improvement**

Add the **“Pick‑up / Drop‑off” interaction layer** so the player can actually click on a patient icon, have the ambulance drive to that location, pick the patient up, then automatically route to the nearest hospital and complete the delivery. This gives a visible, playable core loop (time‑money drain → pickup → delivery → reward) and turns the static map into an interactive demo.

---

### 📋 Exact patch steps (apply on `main` branch)

| Step | Files / Actions | Description |
|------|----------------|-------------|
| 1 | `src/constants.js` | Add new constants: `PICKUP_TIME = 2000` (ms), `DELIVERY_REWARD = {time: 15, money: 100}`. |
| 2 | `src/state.js` | Extend the global state shape: <br>```js<br>player: { time, money, ambulancePos, carrying: null },<br>patients: [{id, pos, rescued:false}],<br>hospitals: [{id, pos}]<br>``` |
| 3 | `src/data/patients.json` | Create a small array of 3 patient objects with random positions inside map bounds. |
| 4 | `src/data/hospitals.json` | Define 2–3 hospital positions (fixed). |
| 5 | `src/utils/geo.js` | Add helper `distance(a,b)` and `nearestHospital(pos, hospitals)` returning the closest hospital object. |
| 6 | `src/engine/ambulance.js` | - Implement `moveTo(targetPos, onArrive)` that animates the ambulance using requestAnimationFrame and calls `onArrive` when reached. <br>- Export `pickUpPatient(patientId)` and `deliverToHospital()` that use the helpers above. |
| 7 | `src/ui/Map.jsx` | - Render patient sprites (`<img src="/assets/patient.png" .../>`) at their `pos`. <br>- Attach `onClick={() => dispatch(pickUp(patient.id))}` to each patient that is not rescued. |
| 8 | `src/redux/actions.js` | Add actions: `PICKUP_REQUEST`, `PICKUP_SUCCESS`, `DELIVER_REQUEST`, `DELIVER_SUCCESS`. <br>Implement thunks: <br>```js\nexport const pickUp = patientId => async (dispatch, getState) => {\n  const {ambulancePos} = getState().player;\n  const patient = getState().patients.find(p=>p.id===patientId);\n  dispatch({type:PICKUP_REQUEST});\n  await moveAmbulanceTo(patient.pos);\n  dispatch({type:PICKUP_SUCCESS, payload:{patientId}});\n  dispatch(deliver());\n};\n\nexport const deliver = () => async (dispatch, getState) => {\n  const {carrying} = getState().player;\n  const hospital = nearestHospital(carrying.pos, getState().hospitals);\n  dispatch({type:DELIVER_REQUEST});\n  await moveAmbulanceTo(hospital.pos);\n  dispatch({type:DELIVER_SUCCESS});\n};\n``` |
| 9 | `src/redux/reducers.js` | Handle the new actions: <br>• On `PICKUP_SUCCESS` set `player.carrying = patientId` and mark patient `rescued: true`. <br>• On `DELIVER_SUCCESS` add `DELIVERY_REWARD.time` to `player.time` and `DELIVERY_REWARD.money` to `player.money`; clear `player.carrying`. |
| 10 | `src/engine/tick.js` | Ensure the continuous drain still runs (already exists) – no change needed. |
| 11 | `public/assets/` | Add two placeholder PNGs: `patient.png` (8×8 pixel sprite) and `hospital.png` (8×8). |
| 12 | `README.md` | Add a **“Play the demo”** section with a GIF screenshot (optional) and note the new “click a patient → ambulance drives → delivery → time/money reward” loop. |
| 13 | `package.json` | Ensure `redux-thunk` is listed (already used). No version bump needed. |
| 14 | **Run tests** (if any) and **lint**. |
| 15 | **Commit & push** (see commit message below). |

---

### ✅ Acceptance checks (manual + automated)

1. **Map renders** patient and hospital sprites at the coordinates defined in the JSON files.  
2. Clicking a patient:
   - Ambulance animates from its current position to the patient (duration ≈ distance / speed).  
   - After arrival, the patient disappears (or shows a “rescued” overlay).  
   - Ambulance immediately starts moving to the nearest hospital.
3. Upon reaching the hospital:
   - Player’s time increases by `DELIVERY_REWARD.time` (e.g., +15 s).  
   - Player’s money increases by `DELIVERY_REWARD.money` (e.g., +100).  
   - `player.carrying` is cleared, allowing next pickup.
4. Continuous drain still decreases time and money each second; the game ends when either reaches ≤ 0 (screen shows “Game Over”).  
5. Mobile: tapping works the same as clicking; ambulance path is visible on small screens.  
6. **Unit test** (if project has Jest): add a test that dispatching `pickUp(patientId)` results in state changes: patient.rescued → true, carrying set, then after `deliver()` rewards are applied.  
7. **Lint** passes (`npm run lint`).  
8. **GitHub Actions** (if CI is set) reports green build.

---

### 🏷️ Atomic commit message

```
feat: implement core pick‑up / delivery loop

- Add constants for pickup time and delivery rewards
- Extend global state with patients, hospitals and carrying flag
- Create static patient & hospital data files
- Geo helpers for distance & nearest hospital
- Ambulance engine: moveTo, pickUpPatient, deliverToHospital
- UI: render patient sprites with click handlers
- Redux actions & thunks for pickup & delivery flow
- Reducer updates: mark rescued, apply rewards, clear carrying
- Add placeholder pixel‑art assets
- Update README with demo instructions
```

Apply this patch, run the acceptance checklist, and the MVP will now showcase the essential “Rescue → Deliver → Reward” mechanic, giving judges a tangible, playable experience. 🎮🚑
