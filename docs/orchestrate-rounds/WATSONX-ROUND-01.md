# watsonx RALPH Round 1

- run_id: fc92171b-99ce-4cc8-b95c-193f04fa85a0
- status: completed

**🚀 High‑Impact Improvement – “Transparent Decision Dashboard”**

Add a **pixel‑art “Decision Dashboard” overlay** that appears after every major hand‑off (Ambulance → Hospital → Insurance).  
It shows the exact data the next agent received, the rule‑based reasoning that drove the hand‑off, and a short “what‑if” preview of alternative outcomes.  
This gives players instant explainability, deepens the care‑route learning loop, and fits the cozy pixel‑art aesthetic (tiny scroll‑style panels with readable icons).

---

### 📋 Patch Overview
| File/Folder                | Purpose |
|----------------------------|---------|
| `src/components/DecisionDashboard.vue` | New Vue component (or React if you use React) rendering the overlay with pixel‑art UI. |
| `src/store/decisionLog.js` | Vuex/Redux module that records every hand‑off (payload, rule id, score). |
| `src/assets/ui/dashboard/*.png` | Pixel‑art sprites: background scroll, icons for ambulance, hospital, insurance, rule‑badge, “what‑if” arrows. |
| `src/middleware/decisionTracker.js` | Middleware that intercepts hand‑off actions, pushes a log entry to the store, and triggers the dashboard. |
| `src/pages/Game.vue` (or `App.jsx`) | Import & mount `<DecisionDashboard />` and wire a global hot‑key (`D`) for mobile tap‑area to toggle visibility. |
| `src/styles/dashboard.css` | Simple retro‑style CSS (8‑bit font, subtle drop‑shadow) to keep readability on mobile. |
| `README.md` (section **Gameplay UI**) | Document the new feature and how it teaches decision transparency. |
| `.github/workflows/ci.yml` | Add a step to lint new PNG assets (size 64×64, indexed PNG). |

---

### 🛠️ Exact Patch Steps

1. **Create UI assets**  
   - In `assets/ui/dashboard/` add:  
     - `bg-scroll.png` – 256×64, parchment‑style pixel art.  
     - `icon-ambulance.png`, `icon-hospital.png`, `icon-insurance.png` – 16×16 each.  
     - `badge-rule.png` – 12×12 badge with a number placeholder.  
   - Commit assets with message `Add pixel‑art dashboard sprites`.

2. **Add store module** (`src/store/decisionLog.js`)
   ```js
   // decisionLog.js
   const state = () => ({
     logs: []   // [{step, payload, ruleId, score, alternatives}]
   });

   const mutations = {
     PUSH_LOG(state, entry) { state.logs.push(entry); },
     CLEAR_LOG(state) { state.logs = []; }
   };

   export default {
     namespaced: true,
     state,
     mutations
   };
   ```
   - Register in `store/index.js`.
   - Commit: `Add decisionLog store module for transparent hand‑off tracking`.

3. **Middleware / interceptor** (`src/middleware/decisionTracker.js`)
   ```js
   export default store => next => action => {
     const result = next(action);
     const handoffActions = ['AMBULANCE_DELIVER', 'HOSPITAL_DISCHARGE', 'INSURANCE_EVALUATE'];
     if (handoffActions.includes(action.type)) {
       const entry = {
         step: action.type,
         payload: action.payload,
         ruleId: action.payload.ruleId,
         score: action.payload.score,
         alternatives: action.payload.alternatives // array of {ruleId, score}
       };
       store.commit('decisionLog/PUSH_LOG', entry);
       store.commit('ui/SHOW_DASHBOARD'); // UI flag
     }
     return result;
   };
   ```
   - Register middleware in the store setup.  
   - Commit: `Add decisionTracker middleware to log hand‑offs and trigger dashboard`.

4. **Dashboard component** (`src/components/DecisionDashboard.vue`)
   ```vue
   <template>
     <transition name="fade">
       <div v-if="visible" class="dashboard" @click.self="close">
         <img src="@/assets/ui/dashboard/bg-scroll.png" class="bg"/>
         <div class="content">
           <div class="row" v-for="(log,i) in logs" :key="i">
             <img :src="iconFor(log.step)" class="icon"/>
             <span class="rule">Rule {{ log.ruleId }}</span>
             <span class="score">Score: {{ log.score }}</span>
             <div class="whatif" v-if="log.alternatives.length">
               <span>What‑if:</span>
               <span v-for="alt in log.alternatives" :key="alt.ruleId">
                 {{ alt.ruleId }}→{{ alt.score }}
               </span>
             </div>
           </div>
         </div>
         <button class="close-btn" @click="close">✕</button>
       </div>
     </transition>
   </template>

   <script>
   import { mapState, mapMutations } from 'vuex';
   export default {
     computed: {
       ...mapState('decisionLog', ['logs']),
       visible() { return this.$store.state.ui.showDashboard; }
     },
     methods: {
       ...mapMutations('ui', ['HIDE_DASHBOARD']),
       close() { this.HIDE_DASHBOARD(); },
       iconFor(step) {
         const map = {
           AMBULANCE_DELIVER: require('@/assets/ui/dashboard/icon-ambulance.png'),
           HOSPITAL_DISCHARGE: require('@/assets/ui/dashboard/icon-hospital.png'),
           INSURANCE_EVALUATE: require('@/assets/ui/dashboard/icon-insurance.png')
         };
         return map[step];
       }
     }
   };
   </script>

   <style scoped src="./dashboard.css"></style>
   ```
   - Add CSS (`dashboard.css`) that uses an 8‑bit font like **Press Start 2P**, centers the scroll, and ensures touch‑friendly hit‑area.  
   - Commit: `Create DecisionDashboard component with pixel‑art UI`.

5. **UI state module** (`src/store/ui.js`)
   ```js
   const state = () => ({
     showDashboard: false
   });
   const mutations = {
     SHOW_DASHBOARD(state){ state.showDashboard = true; },
     HIDE_DASHBOARD(state){ state.showDashboard = false; }
   };
   export default { namespaced: true, state, mutations };
   ```
   - Register in store.  
   - Commit: `Add UI flag store for toggling dashboard`.

6. **Hook into main game page** (`src/pages/Game.vue` or `App.jsx`)
   ```js
   import DecisionDashboard from '@/components/DecisionDashboard.vue';
   // inside template
   <DecisionDashboard/>
   // add a global mobile‑friendly toggle
   mounted() {
     window.addEventListener('keydown', e => { if (e.key === 'd') this.$store.commit('ui/SHOW_DASHBOARD'); });
   }
   ```
   - Commit: `Mount DecisionDashboard and bind hot‑key/tap toggle`.

7. **Documentation** – update README  
   ```markdown
   ## New Feature: Decision Dashboard
   After each hand‑off a pixel‑art scroll appears (toggle with **D**).  
   It displays:
   * Which rule sent the data (`Rule 7`)
   * The calculated score
   * Alternative rules and their scores (what‑if)
   This gives players full transparency and teaches the underlying decision logic.
   ```

   - Commit: `Document Decision Dashboard in README`.

8. **CI lint for PNG size** (add to `.github/workflows/ci.yml`)
   ```yaml
   - name: Check PNG dimensions
     run: |
       find src/assets/ui/dashboard -name '*.png' -exec identify -format "%w %h %f\n" {} + | \
       awk '{if ($1!=64||$2!=64) exit 1}'
   ```
   - Commit: `Add CI step to enforce 64×64 pixel‑art assets`.

---

### 📌 Commit Message (single atomic commit)

```
feat(ui): Transparent Decision Dashboard with pixel‑art scroll

* Add DecisionDashboard component showing hand‑off payload, rule id,
  score and what‑if alternatives.
* Introduce decisionLog store module and middleware to record every
  ambulance → hospital → insurance transition.
* UI state module toggles dashboard visibility (hot‑key D / tap area).
* Pixel‑art assets (bg‑scroll, icons, badge) for cozy retro look.
* Update README with gameplay explanation.
* CI step added to enforce 64×64 indexed PNG assets.
```

---

### 🎉 Why this is the *most* impactful now
1. **Explainability** – directly satisfies the “explainability & decision transparency” requirement.  
2. **Visible Progress** – a UI overlay is instantly testable on desktop & mobile, showing the hackathon judges a concrete, playable feature.  
3. **Low Development Cost** – ~150 lines of code + a handful of 64×64 sprites; fits the rapid‑iteration RALPH loop.  
4. **Scalable** – later you can hook richer rule‑explanations, branching narratives, or even a “learning mode” without touching core gameplay.  

Deploy the patch, push to GitHub, and you’ll have a shiny new transparent layer that makes CareRoute both **fun** and **educational**. Happy coding! 🚑🏥📊
