# SmartCV 50-Pair Independent Ground-Truth Evaluation Benchmark

## 1. Overview
This benchmark dataset consists of **5 job descriptions** and **10 candidate resumes** ($5 \times 10 = 50$ resume–job pairs), specifically constructed for post-hoc empirical validation and ranking quality assessment of the SmartCV platform.

> **Crucial Academic Precaution**:
> - **Zero Model Training**: No supervised model training or fine-tuning is performed using this ground-truth evaluation dataset. Pretrained model parameters remain unchanged, and TF-IDF vectorization is performed according to a predefined, unsupervised feature-extraction procedure.
> - **SmartCV Role**: SmartCV does not train a new supervised ML model. It integrates pretrained NLP/ML techniques and evaluates their resume-ranking performance against independent human judgments.

## 2. Independent Blinded Human Annotation Protocol
* **Blinded Evaluation**: Two independent evaluators assess all 50 resume–job pairs **without access to model predictions, compatibility scores, or candidate rankings**.
* **Pre-Consensus Agreement Metric**: Inter-rater reliability is quantified using **Quadratic Weighted Cohen's Kappa ($\kappa_w$)** across all 50 raw pairs prior to adjudication.
* **Adjudication**: Where ratings differ, evaluators discuss the candidate's qualifications against the predefined four-level rubric to establish the definitive `consensus_label`.

## 3. Four-Level Relevance Rubric
| Score | Relevance Level | Detailed Interpretation |
|:---:|---|---|
| **0** | **Not Relevant** | The candidate does not meaningfully satisfy the job requirements; background is outside the computing discipline or completely mismatched. |
| **1** | **Low Match** | Limited overlap; candidate possesses minor adjacent skills (e.g., basic scripting or general tooling) but lacks required core competencies. |
| **2** | **Medium Match** | Satisfies several important technical requirements and educational background, but lacks one or two specialized frameworks/tools. |
| **3** | **High Match** | Strong direct alignment; candidate satisfies all mandatory technical competencies, educational qualifications, and relevant projects. |

## 4. Dataset Files
* `evaluation_config.json`: Frozen experimental parameters, metric thresholds, and model weights.
* `jobs.json`: 5 enterprise tech job specifications modeled after Saudi Vision 2030 digital sectors.
* `resumes.json`: 10 anonymized candidate profiles spanning different computing tracks and one cross-domain control.
* `annotations.csv`: 50 evaluation pairs recording `evaluator_1`, `evaluator_2`, `consensus_label`, and qualitative rationale.
