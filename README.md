# 3-Phase Power Telemetry Dashboard (reviewed v5 build)

## Run locally
1. Keep `app.js`, `index.html`, and `styles.css` in the same directory.
2. Start a static server in that directory: `python3 -m http.server 8000`
3. Open `http://localhost:8000` in a modern browser.

The page loads React, HTM, Chart.js, PapaParse and Tailwind from CDNs, so an internet connection is required. CSV parsing is performed in the browser; the CSV is not sent to an application server.

## Files
- `index.html` — document shell, metadata and CDN dependencies.
- `app.js` — CSV parsing, electrical derivations, downsampling, energy integration, React UI and Chart.js lifecycle.
- `styles.css` — global styling, focus indicators and reduced-motion handling.
- `AUDIT.md` — source review, formulas, limitations and line references.
- `test-harness.js` — Node-based regression checks for pure parsing and calculation functions.

## Configuration and interpretation
- **Topology:** Wye 4-wire is the default. Select Delta for balanced-delta current/phase conversions. Changing the topology re-derives calculated values from retained imported measurements.
- **Header mapping:** header labels are normalized, including common bracketed/parenthesized engineering units such as `V_RY (V)` and `I_R (A)`.
- **Estimate missing voltages:** enabled by default. Disable it if you do not want inferred voltage magnitudes. In Wye, the balanced-system magnitude relationship is `V_LL = sqrt(3) * V_LN`; in Delta, winding phase voltage equals line voltage and there is no neutral voltage.
- **Current conversion:** Wye uses `I_line = I_phase`; balanced Delta uses `I_line = sqrt(3) * I_phase`.
- **PF convention:** PF always carries the sign of Q (negative = leading/capacitive, positive = lagging/inductive) and is clamped to [-1, 1]. Table/gauge statistics use |PF| so lead and lag cannot cancel; the window card shows the energy-weighted PF (∫|P|dt ÷ ∫S dt). Negative Q is capacitive/leading; positive Q is inductive/lagging. kW retains its measured import/export sign; if kW is absent, it is estimated as kVA × |PF| (positive/import direction assumed). Confirm the sign convention used by the meter manufacturer.
- **Unbalance:** **VUF** is the exact IEC negative/positive-sequence ratio computed from the three *measured* line-to-line RMS voltages (they always form a closed triangle, so angles are not needed): `β=(a⁴+b⁴+c⁴)/(a²+b²+c²)²`, `VUF=100·√((1−√(3−6β))/(1+√(3−6β)))`. It is blank if line-to-line voltages were not measured. **IUF** uses the same formula on line currents and is exact only when ΣI=0 (3-wire/Delta); with neutral current it is approximate or blank. The NEMA max-deviation figures are shown alongside as `proxy` cards.
- **Neutral current:** an exported neutral-current column (`IN`, `I_N`, `Ineutral`, `NeutralCurrent`, etc.) takes precedence. Otherwise (Wye only; Delta has no neutral) the dashboard estimates the fundamental-frequency vector sum from three RMS phase currents at 120° displacement. The estimate does not include triplen harmonics.
- **Energy:** trapezoidal integration is applied to adjacent valid samples. Gaps greater than five times the median positive sample interval (or 24 hours) are excluded. Integration is split exactly at zero crossings into import/export kWh and inductive/capacitive kVArh (net values also shown), plus kVAh and energy-weighted PF.
- **Downsampling:** min/max extrema are retained independently for each plotted signal in time buckets, and rows at every missing-value boundary and time gap (>5× median interval) are kept so dropouts stay visible. This protects major sags/spikes, but any finite decimator can omit secondary events within the same bucket; use the raw CSV for forensic power-quality analysis.

## Regression test
Run `node test-harness.js` (Node 18+). It checks numeric parsing, timestamp/date handling, A/B/C and R/Y/B mapping, one-row normalization, Wye/Delta conversion, neutral precedence, signed PF, VUF vs an independent Fortescue computation, power triangle, dropout retention in the decimator, zero-crossing energy split and peak retention on a 65,001-row series.

## CSV import
Common vendor header names are recognised (examples: `U12`, `VAB`, `Voltage L1-L2`, `U1`, `Voltage L1-N`, `I1`, `Current L1`, `P total`, `Active Power Total`, `cos phi`, `Frequency`) plus **A/B/C naming** (`Va Vb Vc`, `Ia Ib Ic`, mapped to R/Y/B when a `C` phase header is present). Units in parentheses/brackets/trailing tokens are converted (W→kW, var→kVAR, VA→kVA, kV→V, kA→A, mA→A, PF %→ratio); unitless values are assumed to be in dashboard units. Columns named with Min/Max are never mapped as the RMS channel. Unrecognised columns (THD, energy registers, temperature…) are listed as ignored. `.csv`, `.tsv` and `.txt` are accepted; delimiter is auto-detected and decimal commas are handled.

**Timestamps:** `Timestamp`/`Date`+`Time`, time-of-day only (midnight roll-over inferred), ISO, `D/M/Y`, `M/D/Y` (auto-detected from the data; default D/M), `Y/M/D`, 12-hour clock, Excel serial days and epoch s/ms/µs/ns. Unreadable stamps among valid ones are held at the previous valid time and counted in the report. If fewer than half the rows have a usable timestamp, evenly spaced synthetic times are used for plotting only and **energy totals are withheld (—)**.

After upload, the **CSV import check** (bottom of the page) marks each signal Imported / Estimated / Not available and shows the header mapping. `example_vendor_style_export.csv` demonstrates mapping plus ignored columns.

## Visual notes
Space Grotesk / DM Sans / IBM Plex Mono (Google Fonts with system fallbacks), restrained entrance motion and hover lift, `prefers-reduced-motion` respected, forced-colors borders, chart `aria-label`s.

## Production notes
Pin and **add SRI hashes** to the CDN scripts or self-host them; the Tailwind Play CDN is for prototypes. See `AUDIT.md` for the full defect list, formulas and line references.
