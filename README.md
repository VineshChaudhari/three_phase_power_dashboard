# Electrical Measurements Dashboard

A browser-based dashboard that turns a datalogger CSV into readable three-phase measurements: voltage, current, power, power factor, frequency, demand and energy. Everything runs locally in the browser; the CSV is never uploaded to a server.

## Run
1. Keep `index.html`, `app.js` and `styles.css` in one folder.
2. Start a static server there: `python3 -m http.server 8000`, then open `http://localhost:8000`.
3. Upload a CSV, or use the built-in sample data.

React, Chart.js, PapaParse and Tailwind load from CDNs, so an internet connection is needed. The site deploys as-is to any static host (for example Vercel).

## Files
| File | Purpose |
|---|---|
| `index.html` | Page shell and library imports |
| `app.js` | CSV import, calculations, charts and interface |
| `styles.css` | Styling |
| `test-harness.js` | Optional checks: `node test-harness.js` |

## What it shows
- **Voltage:** R, Y, B phase and line voltages, averages, unbalance (VUF).
- **Current:** line and phase current, averages, neutral current, unbalance (IUF).
- **Power:** active, reactive and apparent power, signed power factor shown on a lag / unity / lead speedometer (needle = latest reading, grey arc = range in the window), frequency, summary statistics.
- **Demand and energy (selected window):** net, import and export kWh; net, inductive and capacitive kVArh; kVAh; energy-weighted PF; peak active, reactive and apparent demand with times.
- **Find a date and time:** pick an exact date and time to see every reading at that instant.
- **Definitions:** hover, tab to, or tap an underlined parameter name for a one-line explanation.

Pages appear only for quantities present in the file. A pop-up after upload lists what was found, what was estimated and what is missing; the **File info** button in the header reopens it. On phones the navigation moves to a bottom bar.

## CSV import
- Header names are matched flexibly (A/B/C and R/Y/B phase naming are told apart, and a bare `VA` column is read as volt-amperes unless Va/Vb/Vc all exist) (`VRY`, `U12`, `Voltage L1-L2`, `Irms_A_avg`, `Active Power Total`, `cos phi` and similar), including names with a device prefix such as `Device > Voltage L1-N`.
- Units in the header are converted: W, var and VA to kW, kVAR and kVA; kV, kA and mA to V and A; PF percent to a ratio. With no unit, values are assumed to already be in V, A, kW, kVAR, kVA.
- Separate `Date` and `Time` columns are combined. Numbers with thousands separators or decimal commas are accepted; placeholders such as `—` or `OL` are treated as missing.
- Headers that contain the separator character are repaired. Blank rows and completely empty columns are skipped. When two columns offer the same quantity, the one with data is used.
- **Elspec-style trend exports** (`Trend_Period` with `_avg/_min/_max` columns): averages are used, and unit-less power is read as W / VA / var. If the Start column has only minutes and seconds, the timeline is rebuilt from `Trend_Period`, starting at the `YYMMDD_HHMM` stamp in the file name. Check that start time with whoever exported the file. Without such a stamp, no date is invented and energy stays unavailable.
- A file with no timestamps gets placeholder times for plotting; energy totals are then unavailable.

## Settings and conventions
- **Topology:** Wye 4-wire (default) or balanced Delta. **Estimate missing voltages** can be switched off.
- Wye: V_LL = √3 · V_LN and I_line = I_phase. Balanced Delta: winding voltage equals line voltage, and I_line = √3 · I_phase. Estimates are magnitude-only and are labelled as estimated.
- **Power factor and reactive power:** positive kVAR and PF are inductive (lagging); negative are capacitive (leading). Positive kW is import, negative kW is export.
- **Energy:** trapezoidal integration of adjacent samples. Gaps longer than 5× the median sample interval (or 24 hours) are skipped. kVArh and kWh are net, with import/export and inductive/capacitive split shown.
- **Peak demand** is the highest single sample in the window, not a rolling-interval billing demand.
- **Neutral current:** a measured neutral column takes precedence; otherwise it is estimated from the three phase currents at 120° (no harmonics).
- Large files are downsampled for plotting with min/max kept per bucket.

## Limitations
- VUF and IUF are magnitude-deviation proxies, not IEC symmetrical-component values, because phase angles are not in the CSV.
- Estimated values are for visualisation, not protection or billing. For billing, use the meter's own energy registers.
- Confirm CT/PT scaling, phase sequence, timezone and PF sign convention against your meter's manual.
