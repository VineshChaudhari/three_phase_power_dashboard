# Code audit v5 — 3-phase power telemetry dashboard

Scope: `app.js`, `index.html`, `styles.css` (the supplied v4 build). Line numbers: **v4** = the file you supplied, **v5** = the file in this archive.
Verification: `node --check app.js`, `node test-harness.js` (v4 tests + ~60 new assertions), a jsdom render of all four pages with real React 18.3.1 (0 runtime errors), and a 300 000-row timing run.

## Executive summary

The supplied v4 build was crash-safe on 1-row, empty and column-less input (the one-row slice, `n<=1` guards, Chart.js teardown and iterative `st()` were all sound). Its remaining problems were **silent wrong answers** rather than crashes:

| # | Severity | Defect (v4) | Effect |
|---|---|---|---|
| 1 | High | A/B/C phase headers (`Va Vb Vc`, `Ia Ib Ic`) collide with R/Y/B (v4 L35: `ib` **and** `ic` both feed `IB`; `vb` feeds `VB`; `va`/`vc` unmapped) | `Ib` lands in the Blue slot, `Ic` is dropped, **Y-phase gauges blank**, V_A/V_C missing |
| 2 | High | VUF/IUF were only a max-deviation proxy, and the v4 audit stated true VUF "cannot be calculated" from magnitudes. **It can**, exactly, for line-to-line voltages | The headline unbalance metric was not the IEC/IEEE quantity |
| 3 | High | `hasTimestamp = !!map.t` (v4 L219): a timestamp *column* that is unreadable still enabled energy totals on invented 1-minute spacing | Fabricated kWh |
| 4 | High | One unreadable timestamp among valid ones got `Date.now()+i·60 s` (v4 L186) | Time axis stretches from 2026 to "now"; the row sorts to the end; the energy gap rule then drops everything near it |
| 5 | Med | Dates hard-wired D/M/Y (v4 L99–116): `12/25/2026` → NaN for every row; `11/08/2026` silently read as 11 Aug | Whole file falls back to synthetic time, or wrong day |
| 6 | Med | Excel/Sheets serial dates (e.g. `46334.5`) were treated as epoch seconds → 1970 with ×1000 spacing | Time axis and energy wrong by ~10⁷ |
| 7 | Med | Decimator kept only finite extrema, so null runs and time gaps vanished from the plotted line even with `spanGaps:false` (v4 L265–285) | Telemetry dropouts were bridged on every file >300 rows |
| 8 | Med | Delta topology still produced a neutral-current estimate (v4 L156) | A neutral value for a system with no neutral conductor |
| 9 | Med | PF kept the meter's sign, but `lead` came from kVAR (v4 L160): kVAR<0 with PF=+0.9 plotted +0.9 while the badge said LEAD. Mean of a signed PF cancels (0.9 lag + 0.9 lead → 0.0) | Contradictory trend/gauge; meaningless "Avg PF" |
| 10 | Med | `Min/Max` statistic columns (`V1 (Max)`) normalised to the same key as the RMS column and could win the mapping | Peak values plotted as the RMS channel |
| 11 | Med | `load(sample())` ignored the selected topology / estimate toggle (v4 L622, L650) | Selector said Delta, data was Wye-derived |
| 12 | Low | CSS `animation-fill-mode: both` pinned the final `translate`, so the `:hover` lift never applied; `will-change` on every card | Dead hover, extra compositor layers |
| 13 | Low | Throughput on >65k rows: per-cell header-unit regexes, `Object.entries/fromEntries` per row, `delete` on 300k objects, Panel/Kpi recomputing decimation on every render | 300 000 rows: **8.1 s → 3.8 s** normalise (worker parse is separate); no more O(N) work per unrelated re-render |

## 1. Parser & runtime

| Area | v4 | Finding | v5 |
|---|---|---|---|
| Header mapping | 20–40 | Anchored patterns were right; A/B/C collision (#1) and Min/Max columns (#10) were not handled | `ABC` map L252, `isExtrema` L253, scheme detection `abc` L257 (a `Vc`/`Ic`/`Uc` header switches the file to A→R, B→Y, C→B), exclusion applied in the pattern loop L258–262 |
| Timestamp parser | 99–116 | D/M/Y only (#5); serial dates (#6); no `D.M.Y`, 2-digit years, AM/PM, `Y/M/D`, ns epochs | `pt()` L129–152: month-first auto-detected by `detectDateOrder` L154 (a field >12 proves the order; default D/M); Excel serial → local wall-clock via `excelToLocalMs` L116; µs/ns epochs; AM/PM; `Y/M/D`; calendar validation in `mkLocal` L120 |
| Time-only / date+time | 186–196 | `Time` alone was ignored | `parseClock` L167 + normalize L255–296: time-of-day column with midnight roll-over |
| Bad timestamps | 186, 219 | #3, #4 | normalize L265–296: `valid/n ≥ 0.5` required (`useReal` L290); isolated bad stamps are held at the previous valid time and counted (`badTimestamps`); otherwise synthetic times are used **for plotting only** and energy is withheld |
| Numeric sanitation | 47–52 | Strict grammar was already correct | unchanged (`toNum` L62) |
| 1-row / empty / slicing | 598–606 | Guards were correct (`i0`, `i1` clamps) | unchanged; the preset start now uses `Math.floor` (L764) so the first in-window sample is not skipped |
| Null gaps & dropouts | 265–285 | #7 | `dsIdx` L388–414 keeps both rows at every finite↔null boundary (per series) and at every time gap >5× median interval; `linePts` L416 inserts an explicit `null` point where a gap spans adjacent kept rows so Chart.js breaks the line; capped at 4×maxPts extra rows |
| Transient preservation | 265 | Per-series min/max per bucket was already correct | retained; keys now include VUF/IUF proxies |
| Chart.js lifecycle | 330–345 | Guarded construction, destroyed on unmount — correct | unchanged `Cv` L481; adds `role="img"` + `aria-label` |
| Memoisation | 361–400 | Decimation and dataset objects rebuilt on every render (slider drag, toast timer) | `useMemo` in `Panel` L512–523, `Kpi` L547, `PfCard` L559–565; `medianDt` cached per rows array in a `WeakMap` L375 |
| Parse/derive cost | 180–220 | #13 | unit scales resolved once per column (L298); plain `for…in` copy instead of `Object.fromEntries` in `derive` (L180); no `delete`; stable `Array.sort` replaces the source-index tie-break (L306) |
| File types | 612 | `.csv` only | `.csv/.tsv/.txt` (L743; `accept` on both inputs) |

**>65 000-row behaviour.** `ds` is bucket-bounded (≈ buckets × plotted series), never spread-based. Measured on 300 000 rows: decimation 112 ms; a 900 A inrush row, a 300 V sag row and both edges of a 1-hour time gap were all retained.

## 2. Electrical derivations

### 2.1 Voltages (Wye / Delta)
`derive` L178–200. Wye with balanced estimate: `V_LN = V_LL/√3`, `V_LL = √3·V_LN`. Delta: winding voltage = line voltage, no L-N. Measured values always win; the toggle disables inference. These are magnitude relations only — exact for balanced Wye, approximate otherwise, and **not** compliance-grade. With the A/B/C fix (#1), 4-wire CT-meter exports using `Va/Vb/Vc` and `Ia/Ib/Ic` now populate every R/Y/B gauge; before, Y was blank.

### 2.2 Currents
`I_L = I_ph` (Wye); balanced Delta `I_L = √3·I_ph`. Unchanged and correct; unbalanced Delta needs measured winding currents.

### 2.3 VUF / IUF (corrected)
Three phasors that sum to zero are fully determined by their magnitudes (they close a triangle). Line-to-line voltages always sum to zero (KVL), so with measured `a=V_RY, b=V_YB, c=V_BR`:

```
β   = (a⁴ + b⁴ + c⁴) / (a² + b² + c²)²
VUF = 100 · √[ (1 − √(3 − 6β)) / (1 + √(3 − 6β)) ]   = 100·|V₂|/|V₁|
```
`seqUnbalance` L104, used at L213. The test harness cross-checks it against an explicit Fortescue computation on a constructed phasor triangle (415/400/430 V → 4.177 %).
- Computed **only from measured** line-to-line values (`source.VRY…`), never from √3-synthesised ones (which would give a false 0 %).
- Returns `null` when the triangle cannot close (a > b+c).
- **IUF (sequence)** (L219) uses the same math on the three line currents. It is exact only if ΣI = 0 (3-wire/Delta, no zero-sequence). With real neutral current it is approximate or `null`; the UI says so. Zero-sequence current cannot be resolved from magnitudes alone.
- The NEMA deviation `100·max|X−X̄|/X̄` is retained as `VUFp`/`IUFp` (L216–218) and shown beside the true value.

### 2.4 Neutral current
Measured `IN` takes precedence (L224). Otherwise (Wye only — L220) `I_N = √(I_R²+I_Y²+I_B² − I_R I_Y − I_Y I_B − I_B I_R)`, which assumes 120° displacement and excludes triplen harmonics. Delta: no estimate (#8).

### 2.5 Signed PF and the power triangle
Convention (L228–233): `Q>0` inductive/lagging, `Q<0` capacitive/leading; **PF carries the sign of Q** (if Q is absent or 0, the PF sign decides). So the trend, gauge badge and statistics can never disagree (#9). `PFa=|PF|` is stored (L246).
Triangle (L234–245): `S=√(P²+Q²)`; `P=S·|PF|`; `Q=±√(S²−P²)`; `PF=±|P|/S`; `S≈√3·V̄_LL·Ī_L/1000` only when all three LL voltages and three line currents exist.
**Statistics:** the PF panel table and gauge footer use **|PF|** (`st(rows,k,abs)` L427; `Foot` L541), the gauge shows % of samples leading, and the window card shows the **energy-weighted PF = ∫|P|dt ÷ ∫S dt** — the meaningful average. The trend chart keeps the signed value on a [−1, +1] axis. Caveat: meters that report **negative PF for export** rather than for lead conflict with this convention; confirm in the meter manual (a kW<0 sign is still preserved separately).

### 2.6 Energy
`calcEnergy` L449–478. Trapezoid per interval, now split **exactly at zero crossings** (`posArea` L443: area of the positive part of a line segment is `hi²/(2(hi−lo))·dt`):
`kWh_imp, kWh_exp, kVArh_ind, kVArh_cap, kVAh`, plus net `kWh = imp−exp` and `kVArh = ind−cap`. Gap rule unchanged (> 5× median interval, ≥ 24 h excluded). Median now via `Float64Array` sort (cached). Energy is `null` without real timestamps or adjacent valid samples.

## 3. UI / UX / accessibility
- Voltage page: VUF (sequence) + NEMA deviation; Current page: IUF + proxy + neutral (L857, L875). Notes rewritten to state exactly what each number is.
- Power page: four energy cards incl. import/export, inductive/capacitive split, kVAh and weighted PF (L836).
- Import report: timestamp mode, unreadable-timestamp count, detected date order, A/B/C re-mapping disclosed.
- Charts: `role="img"` + labels; legend toggles expose `aria-pressed`; PF gauge has an `aria-label`.
- Sample data now honours the selected topology (L739).
- CSS: `backwards` fill-mode restores hover lift (styles.css L64–82); `will-change` removed; `100dvh`; forced-colors borders (L132).
- `index.html`: `<noscript>` message.

## 4. Remaining limitations (not defects, but know them)
- Sequence IUF cannot separate zero-sequence current; use a neutral CT or phase angles for 4-wire work.
- Downsampling bounds the points but cannot guarantee a secondary event inside one bucket is kept; use the raw CSV for forensics.
- CDN scripts are pinned to exact versions but have **no SRI hashes** (they could not be fetched/verified here); add `integrity=` + `crossorigin` before any production use, or self-host. The Tailwind Play CDN is not intended for production.
- Parsing the whole file into memory is fine to a few hundred thousand rows; multi-million-row logs need chunked parsing.
- Validate CT/PT ratios, phase sequence, time zone and PF sign convention against the logger manual.
