Power Dashboard – v9 Bug Fix Release

Package contents:
- app.js: updated dashboard JavaScript with v9 bug fixes (A/B/C vs R/Y/B phase scheme detection, bare VA header disambiguation, European decimal-comma CSV delimiter scoring, reachable empty-column status, PF unity overshoot clamping, extended timestamp parsing, window preset math, and chart memoization).
- styles.css: cleaned stylesheet with deduplicated responsive grid rules.
- index.html: main dashboard HTML shell.
- test-harness.js: expanded Node regression suite (v3 through v9).
- AUDIT.md: complete code audit and v9 bug fix report.
- README.md: project documentation and usage guide.
- example_vendor_style_export.csv: sample vendor datalogger export.

Validation:
- JavaScript syntax check (`node --check app.js`) passed.
- Node regression harness (`node test-harness.js`) passed all test suites.
