# Model assumptions (v7)

## What is anchored to observed data
- **TT referrals (monthly)**: from NHS Talking Therapies monthly activity file (Aug 2025), MEASURE_ID = M001 (Count_ReferralsReceived) at Sub-ICB level aggregated to ICB using the GP registration mapping table.

- **Prevalent depression (N)**: practice-level QOF DEP register prevalence (%) (2024/25) multiplied by practice list size 18+ (2024/25), aggregated to ICB.

- **Registered population & GP practice count**: from GP registered patients totals and mapping (Jan 2026).

## Back-calculated volumes
You selected **C (TT-anchored)**. Therefore:
- Eligible for intervention:
  - eligible = baseline_tt_referrals / (TT share)
- GP consults (modelled):
  - gp_consults = eligible / gp_to_eligible_rate

Defaults:
- baseline TT share = 65%
- baseline BEAM share = 15%
- baseline other share = 20%
- gp_to_eligible_rate = 0.78

Scenario sliders change shares (auto-balanced to 100%), then recompute eligible and upstream back-calculations.
