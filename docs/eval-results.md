# Evaluation results

Model `jev-1.13.0` · 2026-09-29 · 50 emails · accuracy **100%**

| Category | Precision | Recall | Support |
|---|---|---|---|
| commercial | 100% | 100% | 12 |
| needs_reply | 100% | 100% | 12 |
| none | 100% | 100% | 2 |
| possible_scam | 100% | 100% | 12 |
| worth_reading | 100% | 100% | 12 |

| Language | Accuracy |
|---|---|
| es | 100% |
| en | 100% |

Confusion matrix (rows = expected, columns = predicted)

| | commercial | needs_reply | none | possible_scam | worth_reading |
|---|---|---|---|---|---|
| commercial | 12 | 0 | 0 | 0 | 0 |
| needs_reply | 0 | 12 | 0 | 0 | 0 |
| none | 0 | 0 | 2 | 0 | 0 |
| possible_scam | 0 | 0 | 0 | 12 | 0 |
| worth_reading | 0 | 0 | 0 | 0 | 12 |
