# 3-Phase Power Telemetry Dashboard (reviewed build)

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
- **PF convention:** PF is retained as signed and clamped to [-1, 1], with negative denoting leading and positive denoting lagging in this dashboard convention. Negative Q is capacitive/leading; positive Q is inductive/lagging. kW retains its measured import/export sign; if kW is absent, it is estimated as kVA × |PF| (positive/import direction assumed). Confirm the sign convention used by the meter manufacturer.
- **Unbalance:** VUF/IUF cards are magnitude-deviation proxies. True IEC symmetrical-component unbalance requires phase phasor angles (and a defined sequence convention), which this CSV schema does not currently ingest.
- **Neutral current:** an exported neutral-current column (`IN`, `I_N`, `Ineutral`, `NeutralCurrent`, etc.) takes precedence. Otherwise the dashboard estimates the fundamental-frequency vector sum from three RMS phase currents at 120° displacement. The estimate does not include triplen harmonics.
- **Energy:** trapezoidal integration is applied to adjacent valid samples. Gaps greater than five times the median positive sample interval (or 24 hours) are excluded. Net kVArh is signed: positive inductive, negative capacitive.
- **Downsampling:** min/max extrema are retained independently for each plotted signal in time buckets. This protects major sags/spikes, but any finite decimator can omit secondary events within the same bucket; use the raw CSV for forensic power-quality analysis.

## Regression test
Run `node test-harness.js`. The included harness checks strict numeric parsing, timestamp handling, one-row normalization, Wye/Delta conversion, measured neutral-current precedence, power triangle, signed trapezoidal energy and peak retention on a 65,001-row synthetic series.
