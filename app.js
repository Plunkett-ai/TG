const fmtInt = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));
const fmtGBP = (n) => '£' + new Intl.NumberFormat('en-GB', {maximumFractionDigits:0}).format(Math.round(n));

let model, current, baseline;
let ttSlider, beamSlider;

async function load() {
  model = (window.__MODEL_DATA__ && window.__MODEL_DATA__.icbs) ? window.__MODEL_DATA__ : await (await fetch('./data.json', {cache:'no-store'})).json();
const sel = document.getElementById('icbSelect');
  sel.innerHTML = '';
  model.icbs.forEach(icb => {
    const opt = document.createElement('option');
    opt.value = icb.code;
    opt.textContent = icb.name;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => setICB(sel.value));
  document.getElementById('resetBtn').addEventListener('click', reset);

  ttSlider = document.getElementById('ttSlider');
  beamSlider = document.getElementById('beamSlider');
    [ttSlider, beamSlider].forEach(el => el.addEventListener('input', onSliderChange));

  setICB(model.icbs[0].code);
}

function setICB(code) {
  const icb = model.icbs.find(x => x.code === code);
  current = structuredClone(icb);
  baseline = structuredClone(icb);

  // lock TT anchor share for eligible back-calculation
  current.model_params._baseline_tt_share = icb.model_params.baseline_shares.tt_pct;

  // initialise sliders from baseline shares
  const b = icb.model_params.baseline_shares;
  setSliders(b.tt_pct, b.beam_pct, true);

  recomputeScenario();
  render();
}


function reset() {
  if (!baseline) return;
  current = structuredClone(baseline);
  const b = current.model_params.baseline_shares;
  setSliders(b.tt_pct, b.beam_pct, true);
  recomputeScenario();
  render();
}

function setSliders(tt, beam, silent=false) {
  ttSlider.value = tt;
  beamSlider.value = beam;
  if (!silent) updateAllocLabels(tt, beam);
}

function updateAllocLabels(tt, beam) {
  document.getElementById('allocTT').textContent = `${tt}%`;
  document.getElementById('allocBEAM').textContent = `${beam}%`;
}

function onSliderChange(e) {
  let tt = parseInt(ttSlider.value, 10);
  let beam = parseInt(beamSlider.value, 10);

  // Complementary split: TT + BEAM = 100
  if (e.target.id === 'beamSlider') {
    beam = clamp(beam, 0, 100);
    tt = 100 - beam;
  } else {
    tt = clamp(tt, 0, 100);
    beam = 100 - tt;
  }

  setSliders(tt, beam, true);
  updateAllocLabels(tt, beam);

  // Store scenario shares (other is removed)
  current.model_params.baseline_shares.tt_pct = tt;
  current.model_params.baseline_shares.beam_pct = beam;
  current.model_params.baseline_shares.other_pct = 0;

  recomputeScenario();
  render();
}


function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function recomputeScenario() {
  const n = current.nodes;
  const p = current.model_params;

  const baselineTT = n.baseline_tt || 0;

  const baselineTTshare = (p._baseline_tt_share || p.baseline_shares.tt_pct) / 100.0;
  const ttShare = (p.baseline_shares.tt_pct || 0) / 100.0;
  const beamShare = (p.baseline_shares.beam_pct || 0) / 100.0;

  // Eligible locked to baseline TT share (TT-anchored, stable denominator)
  const eligible = baselineTTshare > 0 ? Math.round(baselineTT / baselineTTshare) : 0;
  n.eligible = eligible;

  // Back-calc GP consults from eligible
  const rate = p.gp_to_eligible_rate || 0.78;
  n.gp_consults = rate > 0 ? Math.round(eligible / rate) : 0;

  // Scenario split (TT + BEAM only)
  n.to_tt = Math.round(eligible * ttShare);
  n.to_beam = Math.max(0, eligible - n.to_tt);
  n.other_pc = 0;

  // TT steps
  n.tt_step2 = Math.round(n.to_tt * 0.55);
  n.tt_step3 = Math.max(0, n.to_tt - n.tt_step2);

  n.beam_started = n.to_beam;
}


function render() {
  const k = current.kpis;
  document.getElementById('kpiPop').textContent = fmtInt(k.total_population);
  document.getElementById('kpiPractices').textContent = fmtInt(k.gp_practices);
  document.getElementById('kpiPrevPct').textContent = k.dep_prevalence_pct.toFixed(1) + '%';
  document.getElementById('kpiPrevN').textContent = fmtInt(k.prevalent_dep);
  document.getElementById('kpiTT').textContent = fmtInt(k.tt_referrals_month);

  const b = current.model_params.baseline_shares;
  updateAllocLabels(b.tt_pct, b.beam_pct);

  // Populate values
  document.querySelectorAll('[data-val]').forEach(el => {
    const key = el.dataset.val;
    const v = current.nodes[key];
    el.textContent = (typeof v === 'number') ? fmtInt(v) : '—';
  });

  // Units
  document.querySelectorAll('[data-unit]').forEach(el => {
    const key = el.dataset.unit;
    const v = current.costs[key];
    el.textContent = (typeof v === 'number') ? fmtGBP(v) : '—';
  });

  // Totals
  const n = current.nodes;
  const c = current.costs;
  const gp_total = (n.gp_consults||0) * (c.gp_appt||0);
  const assessment_total = (n.eligible||0) * (c.assessment||0);
  const tt2_total = (n.tt_step2||0) * (c.tt_step2||0);
  const tt3_total = (n.tt_step3||0) * (c.tt_step3||0);
  const tt_total = tt2_total + tt3_total;
  const beam_total = (n.to_beam||0) * (c.beam_device||0);
  const med_total = 0;

  const mapping = {gp_total, assessment_total, tt2_total, tt3_total, tt_total, beam_total, med_total};
  document.querySelectorAll('[data-cost]').forEach(el => {
    const key = el.dataset.cost;
    const v = mapping[key];
    el.textContent = (typeof v === 'number') ? fmtGBP(v) : '—';
  });

  // Branch totals (attribute upstream by branch share)
  const eligible = Math.max(1, n.eligible||0);
  const share_tt = (n.to_tt||0) / eligible;
  const share_beam = (n.to_beam||0) / eligible;
  const tot_tt = gp_total*share_tt + assessment_total*share_tt + tt_total;
  const tot_beam = gp_total*share_beam + assessment_total*share_beam + beam_total;

  document.getElementById('tot_tt').textContent = fmtGBP(tot_tt);
  document.getElementById('tot_beam').textContent = fmtGBP(tot_beam);
  // tot_other element may still exist in HTML but is no longer used
  const totOtherEl = document.getElementById('tot_other');
  if (totOtherEl) totOtherEl.textContent = fmtGBP(0);

// ===== Summary net impact (monthly) =====
// Baseline: all eligible go to TT at baseline Step 2/3 split (55/45)
const baseEligible = n.eligible;
const baseTT = baseEligible;
const baseTT2 = Math.round(baseTT * 0.55);
const baseTT3 = Math.max(0, baseTT - baseTT2);

const baseCost =
  (n.gp_consults * c.gp_appt) +
  (baseEligible * c.assessment) +
  (baseTT2 * c.tt_step2) +
  (baseTT3 * c.tt_step3);

// Scenario cost already computed above as:
// gp_total + assessment_total + tt_total + beam_total + med_total
const scenCost =
  gp_total +
  assessment_total +
  tt_total +
  beam_total +
  med_total;

const delta = scenCost - baseCost;

document.getElementById('baseCost').textContent = fmtGBP(baseCost);
document.getElementById('scenCost').textContent = fmtGBP(scenCost);
document.getElementById('netDelta').textContent =
  (delta <= 0 ? '−' : '+') + fmtGBP(Math.abs(delta));

// Capacity freed: reduction in TT Step 2/3 courses
const freedTT2 = baseTT2 - n.tt_step2;
const freedTT3 = baseTT3 - n.tt_step3;

const hoursFreed =
  (freedTT2 * 2.0) +   // Step 2 = 2 clinician hours
  (freedTT3 * 6.0);    // Step 3 = 6 clinician hours

const weeksFreed = hoursFreed / 37.5;

document.getElementById('capHours').textContent =
  (hoursFreed >= 0 ? '+' : '−') + Math.abs(Math.round(hoursFreed)) + ' hrs';
document.getElementById('capWeeks').textContent =
  (weeksFreed >= 0 ? '+' : '−') + Math.abs(weeksFreed).toFixed(1) + ' wks';

}

load();
