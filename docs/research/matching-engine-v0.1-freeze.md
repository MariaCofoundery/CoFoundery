# Matching Engine v0.1 – Specification Freeze

Status: FROZEN FOR FINAL HOLDOUT EVALUATION

The authoritative specification is:

- matching-engine-v0.1-spec.md
- matching-engine-v0.1-spec.json

Their SHA-256 hashes are stored in:

- matching-engine-v0.1-spec.sha256

Research basis:

- Matching Experiment v01
- Matching Experiment v02
- Matching Experiment v03
- Matching Experiment v03b

The selected model structure remains:

FIND:
- eligibility / constraint gate
- directional PH1 relevance
- capability family partial credit as tested
- mutuality = 0.6 × min(A→B, B→A) + 0.4 × mean(A→B, B→A)
- separate confidence

CONNECT:
- eligibility gate
- topic-required C1 relevance
- generic normalization + versioned dictionary
- separate confidence

Important constraints:

- Workstyle does not affect ranking.
- grow_into is not ownership.
- Capability depth and ownership may only be used for matching with explicit matching permission.
- No compatibility score or percentage is shown to users.
- Ranking and reasons must be transparent.
- IDF corpus must be versioned.

Holdout status at freeze:

- RP-001: CONTAMINATED / EXCLUDED
- RP-002: CONTAMINATED / EXCLUDED
- 38 pairs: CLEAN / UNOPENED

The 38 clean holdout pairs may be evaluated only after this specification freeze.
No further model or normalization changes may be made based on holdout results.
