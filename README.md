# Fan Trim Balance — 3-Shot Plot

React/TypeScript engineering calculation and decision-support application for recording a CFM56-7B fan trim-balance 3-shot workflow.

## Current safety and applicability status

This application is **not approved maintenance data, an aircraft maintenance instruction, or a release-to-service record**. Its calculation method and the `831.8 cm·g` W6/sensitivity constant are based on the August 1999 CFM56-7B training manual, whose applicability to a specific aircraft/engine and current approved procedures has not been verified.

The supplied `www.pdf` is an Airbus A318/A319/A320/A321 AMM balancing-screw figure (Revision 62, 1 May 2026) with a stated MSN/effectivity. It does not establish applicability to the CFM56-7B workflow and is not used for physical hardware selection. The app intentionally leaves PO weight selection and physical installation unavailable.

Final-run thresholds may be recorded with source references, but their applicability and comparison semantics are unverified. The app therefore reports `NOT EVALUATED` for maintenance compliance and separately shows screening against configured thresholds. Equality is not flagged by the current software comparison; this behavior is not represented as an approved maintenance rule.

Step 7 validates that a selected point belongs to the common overlap of the three run circles. The training manual's instruction to select the *center* of that common area is graphical; the app does not compute or enforce a centroid/center point. That graphical judgment remains with the engineer. The boundary allowance is one SVG viewBox unit (one plotted-radius unit divided by 192), or the greater floating-point allowance (32 machine epsilons or 1e-9 of plot scale). This is only a geometry/pointer tolerance, not a vibration tolerance.

## Data required before enabling hardware selection

Do not infer a PO screw mapping from the worked example in `TRIM.pdf` or from the unrelated screw table in `www.pdf`. Enabling a future chart-based hardware-selection feature requires the complete, current approved chart/worksheet that applies to the target aircraft and engine, including:

- Document title, authority, revision/date, section/figure/sheet, and aircraft/engine serial-number effectivity.
- The complete PO weight/moment lookup, including all allowed weight combinations and their effective moments.
- The full angular-position mapping, position numbering/direction/view convention, angle bins, and how the selected weight is centered across screw locations.
- Required rounding/nearest-value rules, tie handling, permitted hardware/location constraints, and any excluded combinations.
- The approved source for the three-shot test-weight configuration and confirmation of whether `831.8 cm·g` applies to that configuration.
- Approved final-run limits with sensor/N1 application, units, the precise comparison operator/equality treatment, and source revision/effectivity.

All of the above must be independently checked against approved data for the recorded configuration before the app could present a hardware selection. The application currently has no populated PO-chart schema or guessed mapping.

## Development

```sh
npm install
npm run dev
npm run build
npm run lint
npm run test:run
```

Calculation records are stored locally in the browser. Confirmed plot resultants are retained at full numeric precision and revalidated against current run geometry when a record is restored.
