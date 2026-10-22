# Delta for Test Harness

## MODIFIED Requirements

### Requirement: Traceability to the QA cases

Automated tests MUST reference the QA case IDs in their titles: `CP-01`…`CP-35` from `Design/casos/hu-10-11-casos-de-prueba.md`, `CP-36`…`CP-44` from `Design/casos/hu-14-casos-de-prueba.md` and `CP-45`…`CP-58` from `Design/casos/hu-12-casos-de-prueba.md`. Every AC of HU-10, HU-11, HU-12 and HU-14 MUST be covered by at least one automated test. Cases superseded by HU-14 (CP-01, CP-22) keep their IDs and their tests assert the HU-14 rule.

#### Scenario: Coverage check
- GIVEN the test titles
- WHEN they are searched for `CP-` IDs
- THEN every case in the three coverage matrices appears at least once
