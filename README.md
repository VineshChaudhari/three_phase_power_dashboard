# 3-Phase Power Telemetry Dashboard (reviewed v3 build)

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

## Flexible datalogger CSV import (v3)
The importer recognizes common vendor naming variations and keeps only the dashboard's supported electrical signals. Examples include:
- Line voltages: `VRY`, `VAB`, `U12`, `Voltage L1-L2`, `Voltage A-B`.
- Phase voltages: `VR`, `V1`, `U1`, `Voltage L1-N`, `Phase A Voltage`.
- Currents: `IR`, `I1`, `IA`, `Current L1`, plus explicit phase-current and neutral-current labels.
- Total power: `P`, `P total`, `Active Power Total`, `Q total`, `S total`, `cos phi`, and total/system PF labels.
- Frequency: `Frequency`, `Freq`, or `Hz`.

When units are present in header parentheses, brackets or trailing tokens, the importer converts W→kW, var→kVAR, VA→kVA, kV→V, kA→A, mA→A and PF percent→ratio. If a unit is absent, values are assumed to already be in the dashboard's target unit; the application does not guess a unit from the magnitude alone. Separate `Date` and `Time` columns are combined. Additional columns that do not map to supported dashboard signals (for example THD, energy registers, temperature, demand or operator details) are ignored by the charts and listed in the import summary.

After upload, the **CSV import check** identifies each supported signal as **Imported**, **Estimated**, **Not available**, or **Column found · no numeric data**. Estimates are derived only where the selected topology and balanced-system setting permit it. Unrecognized electrical column names cannot be safely inferred from values alone; use standard meter labels or rename those headers to a supported alias. If no supported electrical field is recognized, the upload is rejected with a clear message rather than showing an empty dashboard.

The dashboard still relies on meter-specific configuration being correct: confirm CT/PT scaling, phase sequence, channel naming, unit labels, timestamp timezone and PF convention against the logger manual.

### Import example
`example_vendor_style_export.csv` is included as a small sample. It contains useful dashboard fields alongside unrelated THD/energy/operator columns; upload it to see the automatic mapping and ignored-column report.

- **Timestamp / energy safety:** if a file has no usable timestamp column, synthetic one-minute times are used only to place points on the charts. Energy totals remain unavailable (`—`) rather than being calculated from an invented sampling interval. Energy also remains unavailable when there are no adjacent valid power samples to integrate.
- **Power-triangle inference:** kVA can be inferred from kW and kVAR, or from kW and non-zero PF. kW can be inferred from kVA and PF or from kVA and kVAR. A voltage/current-based kVA estimate is made only when all three line-voltage and all three line-current channels are available; it is still a balanced-system approximation.
