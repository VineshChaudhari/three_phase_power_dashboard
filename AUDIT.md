# Code audit — 3-phase power telemetry dashboard

## Executive assessment

The supplied build had useful safeguards already: anchored header patterns, a one-pass statistics function, a guarded one-row slice, Chart.js cleanup, and trapezoidal energy integration. The main correctness issues were not all crash bugs: several outputs could look plausible while representing an unsupported electrical assumption.

The reviewed build hardens parsing and charts, adds explicit topology and voltage-estimation controls, preserves signed PF/Q behavior, corrects balanced Delta conversions, gives each plotted signal its own extrema retention, and distinguishes measured neutral current from an estimate.

## 1. Parser and runtime

| Concern | Original source | Finding | Reviewed implementation |
|---|---:|---|---:|
| Header regex mapping | `app.js` 20–37, 40 | Patterns were anchored, which was good, but alias coverage was limited, headers with unit suffixes were not normalized, and there was no neutral-current input mapping. Unknown/missing columns otherwise become null rather than throwing. | `app.js` 20–42 |
| Numeric sanitization | `app.js` 47–52 | `parseFloat("230V")` returns 230, silently accepting malformed engineering data. | `app.js` 48–58 uses a full-string numeric grammar, handles valid thousands grouping and rejects placeholders/partial values. |
| Timestamp parsing | `app.js` 54–62 | D/M/Y parsing required a time component; numeric seconds/milliseconds were supported but microseconds were not. Invalid calendar dates could roll over through `Date`. | `app.js` 60–79 supports date-only D/M/Y, validates calendar/time fields, and recognizes epoch seconds, milliseconds and microseconds. |
| Stable sort/fallback | `app.js` 112–125 | Invalid/missing timestamps received synthetic one-minute spacing; sort ties had no explicit stable source-order key. | `app.js` 151–167 uses source index as a tie-breaker, retains imported measurements for topology re-derivation, and preserves fallback spacing. |
| One-row / empty windows | `app.js` 435–438 | Existing `n<=1` guard already prevented negative slice bounds. Empty parser output is rejected before loading. | `app.js` 490–494 retains the safe bounds. |
| Null gaps | `app.js` 235–237, 263–264 | `spanGaps:true` visually joined missing samples, potentially hiding telemetry dropouts. | `app.js` 286–288, 315–316, 329 and chart series use `spanGaps:false`; nulls remain visible as breaks. |
| Chart.js lifecycle | `app.js` 203–210 | Existing cleanup destroyed the chart on unmount, but construction/update was not guarded if the canvas or Chart global was unavailable, or if construction threw. | `app.js` 252–264 guards the canvas/global, catches construction/update errors and destroys the instance on unmount. |
| Large logs | `app.js` 147–164, 167–178 | Stack-safe statistics were already implemented. The old decimator chose extrema from only one priority signal (`kW`, else `Vavg`, else `Iavg`), so a voltage sag or current inrush could be lost whenever another signal was available. | `app.js` 188–208 retains min/max indices independently for the chart's requested series. `app.js` 210–222 keeps statistics iterative. |
| CSV parsing responsiveness | `app.js` 414–424 | Parsing ran on the main thread. | `app.js` 470–480 enables PapaParse worker mode, greedy blank-line skipping and warning counts. |

**Large-file note:** no array-spread reduction is used for the full input series. Sorting is O(N log N); stats and normalization are O(N) after sort; chart decimation scans the selected series per time bucket. The decimator is bounded by chart buckets times plotted series, not by the number of raw rows.

## 2. Electrical engineering review

### 2.1 Wye / Delta voltage synthesis

Original `app.js` 65–72 applied `V_LN = V_LL / sqrt(3)` and its inverse to every system. This is a balanced Wye magnitude relationship, not a universal Wye/Delta identity. In a Delta winding, phase voltage equals line-to-line voltage; there is no physical line-to-neutral voltage.

Reviewed `app.js` 81–104:
- Wye, balanced estimate enabled: `V_LN = V_LL / sqrt(3)` and `V_LL = sqrt(3) * V_LN`.
- Delta, balanced estimate enabled: winding phase voltage magnitude is set equal to corresponding line voltage magnitude.
- The “Estimate missing voltages” checkbox can disable inference. Directly measured values always take precedence.

These are magnitude-only estimates. For an unbalanced Wye system, exact line-to-line phasors cannot be reconstructed from three line-to-neutral RMS magnitudes without phase angles. Do not use inferred values as protection-grade or compliance-grade measurements.

### 2.2 Wye / Delta current synthesis

Original `app.js` 74–80 copied line current into phase current for every topology. That is valid for Wye but wrong for Delta.

Reviewed `app.js` 105–113:
- Wye: `I_L = I_ph`.
- Balanced Delta: `I_L = sqrt(3) * I_ph`, therefore `I_ph = I_L / sqrt(3)`.

The dashboard exposes Wye 4-wire and balanced Delta topology selection at `app.js` 453–454 and 524–528; the estimate checkbox is at 529–532. Reconfiguration re-derives rows from retained imported measurements rather than treating earlier estimates as new measurements. If a Delta load is unbalanced, the simple √3 magnitude conversion is not generally valid; phase-current measurements should be imported directly.

### 2.3 VUF and IUF

Original `app.js` 87–95 computed maximum deviation from the average magnitude. This is a useful magnitude-unbalance indicator, but it is not IEC symmetrical-component VUF/IUF.

Reviewed `app.js` 120–125 keeps that calculation but labels it a **magnitude-deviation proxy**:

`VUF_proxy (%) = 100 * max(|V_i - V_avg|) / V_avg`

`IUF_proxy (%) = 100 * max(|I_i - I_avg|) / I_avg`

A true negative-sequence ratio requires complex phase phasors:

`VUF_sequence (%) = 100 * |V_2| / |V_1|`

`IUF_sequence (%) = 100 * |I_2| / |I_1|`

The uploaded schema has no phase-angle columns, so a true sequence-component result cannot be calculated from the supplied magnitude-only data. The UI explicitly discloses this limitation at `app.js` 568 and 585.

### 2.4 Neutral current

Original `app.js` 91–95 used the 120° fundamental-frequency vector relation. That is a valid estimate from three RMS phase-current magnitudes under the balanced phase-angle assumption, but it cannot account for triplen harmonics and should not replace a neutral CT measurement.

Reviewed `app.js` 124–130:
- Estimated: `I_N = sqrt(I_R² + I_Y² + I_B² - I_R I_Y - I_Y I_B - I_B I_R)`.
- If an `IN`, `I_N`, `Ineutral`, or supported neutral-current header is present, the measured magnitude takes precedence.
- The UI identifies the value as measured or estimated at `app.js` 596; the limitations are stated at `app.js` 585.

For actual 4-wire power-quality work, a measured neutral CT RMS value is preferred, particularly where nonlinear loads create triplen harmonics.

### 2.5 Signed PF and complete power triangle

Original `app.js` 97–99 converted all PF values to absolute magnitude, losing signed leading information. Original `app.js` 106–108 derived reactive power as a positive square root, which always implied positive/inductive Q.

Reviewed `app.js` 132–147:
- PF is retained signed and clamped to [-1, +1].
- Convention: `Q > 0` inductive/lagging; `Q < 0` capacitive/leading.
- If Q is unavailable, negative PF is used as the leading indicator. When kW must be inferred from PF, only its magnitude is available and positive/import direction is assumed. Confirm the meter's sign convention before interpreting reverse-power or four-quadrant data.
- `S = sqrt(P² + Q²)` when kVA is absent and P/Q are present.
- `kW = kVA * |PF|` when kW is absent (positive/import direction is assumed because PF sign is reserved for leading/lagging).
- `Q = sign(Q) * sqrt(S² - P²)` when kVAR is absent; sign comes from the leading/lagging convention.
- When PF is absent, `PF = sign(lead/lag) * |kW| / kVA`; measured kW retains its import/export sign separately.
- If only line voltage/current are available, the estimate `S ≈ sqrt(3) * V_LL_avg * I_L_avg / 1000` is a balanced 3-phase approximation (`app.js` 138–141).

The PF trend axis now spans [-1, +1] at `app.js` 564–565, so negative values are not clipped. The gauge displays PF magnitude and the LEAD/LAG badge carries the sign convention; the PF statistics retain the signed values (`app.js` 325–343).

### 2.6 Energy integration

Original `app.js` 181–196 already used the trapezoidal rule. It integrated absolute Q, which erased the distinction between inductive and capacitive reactive energy, and it allowed long gaps up to 24 hours to contribute.

Reviewed `app.js` 224–246:
- `kWh += ((P_i + P_(i-1))/2) * Δt_hours`
- `kVArh_net += ((Q_i + Q_(i-1))/2) * Δt_hours`
- Positive net kVArh is inductive; negative net kVArh is capacitive.
- Intervals over five times the median positive sample interval (and intervals of 24 hours or more) are excluded to avoid integrating across major data gaps.

The output is net signed reactive energy, not separate import/export registers. For billing-grade energy, use meter-provided cumulative import/export registers and their documented reset/rollover semantics.

## 3. UI/UX and data-integrity changes

- Topology selector and voltage-estimation toggle: `app.js` 453–454, 524–532.
- Explicitly labelled magnitude-unbalance proxies and neutral-current limitations: `app.js` 568–585.
- Signed PF chart range: `app.js` 564–565.
- Net signed reactive-energy label and integration caveat: `app.js` 553–557.
- Keyboard focus and disabled-state styling, plus reduced-motion support: `styles.css` 26–44.
- Document description and browser theme metadata: `index.html` 6–8.
- Worker-based CSV parse and visible parser warning count: `app.js` 470–480.

## 4. Validation performed

`node --check app.js` passed.

`node test-harness.js` passed checks for:
- Strict numeric parsing (`1,234.50`, malformed suffixes and placeholders).
- Epoch seconds and invalid D/M/Y calendar dates.
- One-row CSV normalization and balanced Wye voltage/current synthesis.
- Balanced Delta current and voltage conversion.
- Measured neutral-current precedence.
- Signed Q and the 3-4-5 power triangle.
- Trapezoidal kWh and signed kVArh.
- Peak retention across a 65,001-row synthetic dataset.
- Stack-safe statistics.

The regression harness exercises pure functions in Node; it is not a full browser automation test. Validate actual vendor CSV headers, timezone conventions, CT/PT ratios, PF sign convention, phase sequence, and neutral CT scaling against the meter manual before operational use.

## 5. Flexible datalogger import update (v3)

This revision adds a vendor-tolerant import layer while preserving the dashboard's existing canonical fields and electrical calculations.

| Updated area | Revised implementation | Behaviour |
|---|---:|---|
| Header normalization and alias matching | `app.js` 20–51 | Supports common `U12`/`VAB`/`Voltage L1-L2`, `U1`/`V1`/`Voltage L1-N`, `I1`/`Current L1`, total P/Q/S, PF and frequency headers. Matching is anchored to avoid accidentally treating arbitrary substrings as electrical channels. |
| Unit recognition | `app.js` 74–93 | Reads common units in parentheses, square brackets or trailing tokens. Converts W→kW, var→kVAR, VA→kVA, kV→V, kA→A, mA→A and percent PF→ratio. Unitless values are assumed to be already in the dashboard's target units; magnitude-based unit guessing is deliberately avoided. |
| Number parsing | `app.js` 58–72 | Accepts numeric values, Western/Indian grouped thousands and decimal-comma forms; rejects partial strings and common meter placeholders. |
| Date and time columns | `app.js` 95–112, 174–194 | Combines separate `Date` and `Time` columns; retains one-minute synthetic timestamp fallback when no usable timestamp exists and discloses it in the import summary. |
| Extra columns | `app.js` 174–214 | Only recognized dashboard signals are copied into canonical measurement fields. Unmapped columns are retained in the import report as ignored; they do not create extra chart series or corrupt the dashboard. |
| Import validation/report | `app.js` 199–238, 486–519, 574–589, 656–657 | Reports imported, estimated, missing and empty signals; displays original-header-to-canonical mapping and ignored headers. Uploads containing no recognized electrical signal are rejected with an explanatory message. |
| Frequency display | `app.js` 664 | When a frequency column is recognized and contains numeric samples, a system-frequency KPI is shown on the Power page. |
| Topology-aware report refresh | `app.js` 635–642 | Changing Wye/Delta or the balanced-voltage estimate setting refreshes derived signal status along with the measurements. |

**Important boundaries:** No importer can safely infer the meaning of every proprietary header from values alone. If a manufacturer uses undocumented aliases, rename the columns to a supported alias. If unit labels are absent, the file must already use V, A, kW, kVAR, kVA and PF ratio (or the known target units described above). Extra measurements such as THD and cumulative energy registers are currently reported as ignored rather than silently being mixed into the dashboard's RMS/power-triangle calculations.

### Additional v3 validation
`node test-harness.js` now additionally checks separate Date/Time columns, vendor-style L1/L2/L3 header aliases, W/var/VA and PF-percent conversion, frequency extraction, ignored extra columns, unsupported files, standalone canonical unit headers and import-report status generation.

| Additional data-integrity guard | Revised implementation | Behaviour |
|---|---:|---|
| Full-set 3-phase apparent-power estimate | `app.js` 161–174 | The √3·VLL·IL estimate is attempted only when all three line voltages and all three line currents are present; one-phase or partial telemetry no longer creates a misleading total kVA. The power triangle also infers S from P/PF and P from S/Q when mathematically possible. |
| Energy display with incomplete/synthetic time | `app.js` 297–320, 607 | kWh/kVArh show unavailable when no valid adjacent power samples exist. If the CSV has no real timestamp column, synthetic times are used for graph plotting only and are not used to produce energy totals. Peak kVA remains visible when actual kVA samples are available. |

## 6. v6 review findings

**Fixed:** (1) energy `maxGap` used `max(5×median, 1 min)`, contradicting the documented rule for logs sampled faster than ~12 s; (2) Delta gauges labelled "V_RN" although no neutral exists; (3) `buildPowerEvents` re-ran on every App render (now memoised); (4) comma-expression in `derive`.

**Open, not changed (need a decision):**
- Header collision: bare `VA`/`Va` maps to phase-A voltage, so a volt-ampere column named `VA` is lost (verified). 
- R/Y/B vs A/B/C ambiguity: `Vb` maps to the *blue* phase and `Vc` is dropped; `IB` maps to Y when it appears before `IY`. Resolve by detecting the naming scheme from the whole header set.
- `pt()`: nanosecond epochs and Excel serial dates are misread; numeric epoch heuristics are by magnitude.
- `derive` rescales |PF| in (1,100] by 1/100 even though unitless values are otherwise never guessed.
- `handle()` captures topology/estimate settings at upload; changing them mid-parse is ignored for that file.
- Each row keeps a `_source` copy (about double memory on 65k+ rows); chart `datasets`/`opts` are rebuilt every render so all charts update on any App state change.
- `calcEnergy` and `PfCard` are unused (dead code). Slider resolution is 1/100000 of rows.
- Tailwind Play CDN is development-only and CDN scripts lack SRI; build Tailwind and vendor/pin scripts for the Vercel deployment.
- Home page embeds three full app iframes.

## 7. v7 changes
Header repair, device-prefix matching, populated-column preference, blank-row/column handling, availability-gated pages, and the file-contents pop-up (see README "v7"). Fixed along the way: a recognised-but-empty column was reported "Imported" when values were derived from other signals; status and waveform provenance now require data in the source column. Not verified in a real browser: PapaParse worker mode with string input (verified with non-worker PapaParse on the real file), modal focus behaviour, and mobile layout.
