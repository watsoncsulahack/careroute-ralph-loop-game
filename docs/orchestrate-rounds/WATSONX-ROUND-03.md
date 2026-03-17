# watsonx RALPH Round 3

- run_id: cad2f7fb-7351-462e-a6df-3132272f157b
- status: completed

**🚀 Highest‑Impact Next Improvement**  
Add the **core “pick‑up → deliver → reward” loop**:  
- Player can click/tap a patient icon to board the ambulance.  
- While the ambulance is moving, a **real‑time timer** counts down.  
- When the ambulance reaches the nearest hospital, the patient is “delivered” and the player receives a **time‑bonus + money‑bonus** proportional to the delivery speed.  

This gives a playable “win‑condition” slice, turning the empty map into a functional MVP that already demonstrates the central CareRoute mechanic.

---

## 📂 Patch Steps (Atomic)

| Step | Files Affected | Description |
|------|----------------|-------------|
| **1** | `src/game/state.js` | Add `patients`, `hospitals`, `money`, `timeRemaining` to the global state. Initialize with a few sample entities. |
| **2** | `src/game/logic.js` | Implement `pickUpPatient(patientId)`, `deliverPatient(patientId, hospitalId)`, and `updateBonuses(deliveryTime)`. |
| **3** | `src/game/render.js` | • Draw patient sprites on the map. <br>• Highlight the nearest hospital when a patient is on board. |
| **4** | `src/game/input.js` | Add click/tap handler: if a patient sprite is clicked → call `pickUpPatient`. If ambulance reaches a hospital → call `deliverPatient`. |
| **5** | `src/game/timer.js` | Continuous drain: `setInterval(() => state.timeRemaining -= 0.1, 100)` (adjusted for frame‑rate). |
| **6** | `src/ui/hud.js` | Show current **Time** and **Money** counters in the top‑right corner. |
| **7** | `src/tests/state.test.js` | Unit test that picking up a patient sets `state.ambulance.carrying` and that delivering adds the correct bonuses. |
| **8** | `README.md` | Update “Play” section with new controls (click/tap to pick up, drive to hospital). |
| **9** | `.github/workflows/ci.yml` | Ensure tests run on push (if not already). |
| **10** | `package.json` | Bump version to `0.1.1` (optional but keeps semantic versioning). |

**Implementation Sketch (for reference)**  

```js
// src/game/state.js
export const state = {
  ambulance: { x: 100, y: 100, speed: 120, carrying: null },
  patients: [
    { id: 'p1', x: 300, y: 200, urgency: 1 },
    { id: 'p2', x: 520, y: 410, urgency: 0.8 },
  ],
  hospitals: [
    { id: 'h1', x: 800, y: 100 },
    { id: 'h2', x: 150, y: 600 },
  ],
  money: 500,
  timeRemaining: 120, // seconds
};
```

```js
// src/game/logic.js
import { state } from './state';
import { distance } from './utils';

export function pickUpPatient(id) {
  const pat = state.patients.find(p => p.id === id);
  if (pat && !state.ambulance.carrying) state.ambulance.carrying = pat;
}

export function deliverPatient(hospitalId) {
  if (!state.ambulance.carrying) return;
  const hosp = state.hospitals.find(h => h.id === hospitalId);
  const pat = state.ambulance.carrying;
  const travelTime = state.lastTravelTime; // set by movement system
  const bonus = Math.max(0, 30 - travelTime) * 10; // simple formula
  state.timeRemaining += bonus / 10;   // add seconds
  state.money += bonus;                // add money
  // remove patient from world
  state.patients = state.patients.filter(p => p.id !== pat.id);
  state.ambulance.carrying = null;
}
```

```js
// src/game/input.js
canvas.addEventListener('click', e => {
  const { x, y } = getCanvasPos(e);
  const patient = state.patients.find(p => isInsideSprite(p, x, y));
  if (patient) return pickUpPatient(patient.id);
  // check hospital collision (simple bounding box)
  const hospital = state.hospitals.find(h => isInsideSprite(h, x, y));
  if (hospital) return deliverPatient(hospital.id);
});
```

---

## ✅ Acceptance Checks

| # | Check | How to Verify |
|---|-------|---------------|
| **1** | **Patient appears on map** | Open the game in a browser; you see at least two patient sprites at their init coordinates. |
| **2** | **Pick‑up works** | Click/tap a patient → ambulance sprite shows a “carrying” indicator (e.g., a small patient icon on the ambulance). |
| **3** | **Time & money drain continuously** | Observe the HUD counters decreasing by ~0.1 s per 100 ms and money staying steady while no deliveries happen. |
| **4** | **Delivery triggers bonuses** | Drive ambulance (with arrow keys / swipe) to the nearest hospital while carrying a patient → patient disappears, HUD shows increased time and money. |
| **5** | **Game ends when time ≤ 0** | Let the timer run out → game shows “Game Over” overlay (existing end‑screen logic). |
| **6** | **Unit test passes** | Run `npm test` → `state.test.js` passes, confirming state updates. |
| **7** | **CI pipeline passes** | Push to GitHub → GitHub Actions finishes with green status. |
| **8** | **Mobile usability** | Open the page on a mobile browser; tap a patient and swipe the ambulance; all above behaviours still work. |

---

## 📝 Atomic Commit Message

```
feat: implement core pick‑up/delivery loop with time & money bonuses

- Added state fields for patients, hospitals, money, and timer
- Implemented pickUpPatient, deliverPatient, and bonus calculation
- Rendered patient sprites and nearest‑hospital highlight
- Integrated click/tap input for boarding and delivery
- Added continuous time drain and HUD display
- Unit test for patient pickup & delivery logic
- Updated README and CI workflow
```

Once this patch lands, the MVP will have a playable core loop that clearly demonstrates the CareRoute flow and provides immediate, measurable progress for the hackathon demo. 🚑🎮
