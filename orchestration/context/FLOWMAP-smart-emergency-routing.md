# Flowmap — Smart Emergency Routing Platform

![Smart Emergency Routing Flowmap](./assets/flowmap-smart-emergency-routing.jpg)

## Pipeline in the diagram

### 1) Stakeholders
- Patient
- Hospital
- Insurance provider
- EMS / Ambulance

### 2) Business process inputs
- Condition, acuity, and location captured
- Hospital capacity, specialty, wait, accepted plan checked
- Insurance eligibility, coverage, and pricing confirmed
- Unit availability, ETA, and transport cost calculated

### 3) Process overlap / normalized decision factors
- Clinical fit: patient need ↔ hospital capability
- Coverage + price fit: insurance ↔ accepted plan
- Route score: ETA + wait + cost

### 4) Decision + execution
- CareRoute decision engine
- Select best ambulance
- Select best hospital
- Dispatch, pickup, and transport

### 5) Outcomes
- Appropriate facility match
- Lower patient cost exposure
- Faster pickup and arrival

## Mapping to created watsonx agents
- `serp_insurance_verification_agent` → insurance eligibility/coverage constraints
- `serp_patient_intake_triage_agent` → condition/acuity/location normalization
- `serp_ambulance_dispatch_optimizer_agent` → ETA + availability + transport scoring
- `serp_hospital_match_agent` → capability/capacity/wait/accepted plan scoring
- `serp_cost_risk_agent` → patient cost exposure analysis
- `serp_orchestrator_agent` → final recommendation + dispatch package
