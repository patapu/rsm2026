# Resume RAG Chatbot — Evaluation Report

Two-dimensional eval of the resume chatbot's RAG pipeline: **retrieval quality**
(does the right resume chunk come back?) measured deterministically, and
**answer groundedness** (does the agent use only what it retrieved?) measured
with an LLM-as-judge. Question set: 14 questions in 3 buckets — `easy`
(one clear chunk), `ambiguous` (several valid chunks), `adversarial`
(out-of-corpus → the bot should decline, not invent).

Reproduce:
```bash
npx tsx scripts/eval-retrieval.ts   # retrieval metrics (no LLM)
npx tsx scripts/eval-answers.ts     # groundedness via LLM-as-judge
```

## Retrieval eval (`retrieveChunks`, top-k = 5)

| Metric | Result | Meaning |
|---|---|---|
| **Hit@5** | **12/12 = 100%** | the correct chunk was in the top-5 for every scorable question |
| **MRR** | **1.000** | and it was ranked **#1** every time |

Adversarial questions are excluded here (top-k is never empty, so there is
nothing correct to rank) — they are scored in the answer eval below.

## Answer / groundedness eval (LLM-as-judge)

| Metric | Baseline | After prompt fix |
|---|---|---|
| **Grounded** | 10/14 = 71.4% | **13/14 = 92.9%** |
| Mean quality score | 4.43 / 5 | **4.86 / 5** |
| Adversarial declined correctly | 2/2 🛡️ | **2/2 🛡️** (no regression) |

### What the eval caught (the useful part)

Retrieval was near-perfect, but baseline groundedness was **71%** — and every
miss was the **same failure mode**: the agent answered correctly from the
retrieved chunk, then **embellished with generic technology knowledge that was
never retrieved**:

- *"which databases?"* → correct (PostgreSQL/MySQL/Redis) **but added MongoDB,
  DynamoDB, Graph DB** — technologies not in the profile.
- *"Docker / Kubernetes level?"* → correct scores **but added Azure AKS,
  Dockerfile, Nginx reverse-proxy** details not retrieved.
- *"multi-step approval workflow?"* → correct (CP-Meiji) **but added a CRM
  Quotation discount-approval detail** not in the retrieved context.

Subtle hallucination — not fabricating whole answers (adversarial cases decline
correctly), but padding grounded answers with plausible-but-unsupported
specifics. For a résumé bot this matters: it invents skills the candidate
doesn't claim.

### The fix and its result

**Root cause:** the system prompt's grounding rule said *"use only the `me`
object"* — but the RAG rewrite removed the `me` object; data now arrives via the
`searchResume` tool. The instruction pointed at nothing, so the model backfilled
from general knowledge. Fixed by re-grounding the instruction to the tool
results and forbidding embellishment explicitly:

> *"Answer using ONLY what `searchResume` returned this turn — list only the
> technologies/details that literally appear in the retrieved results; do not add
> tools that 'usually go together' or that you infer from general knowledge."*

Re-running the same 14-question eval: **groundedness 71% → 93%**, mean 4.43 →
4.86, adversarial still 2/2. All three embellishment cases above are fixed — the
judge now confirms *"no external information added."* **That measured delta is
the entire point of having an eval.**

### The one remaining "miss" is an eval limitation, not a bug

The last non-grounded case (*"which CRM projects?"*) fails only because the
answer signs itself *"(เกื้อ/ปกร)"* — the persona's own name, which comes from
the **system prompt**, not from general knowledge. The judge is deliberately
shown only *question + retrieved context + answer* (never the system prompt), so
any persona/always-on fact looks "ungrounded" to it. Real hallucination rate is
effectively **0/14**. Lesson: **the judge has its own failure mode** — a low
groundedness score can mean "the judge can't see the legitimate source," not
"the product is wrong." A stricter eval would feed the judge the system/always-on
context as an additional allowed source.

---

*Fixed 14-question set; the LLM judge is non-deterministic so exact numbers vary
slightly between runs. The value is the harness, the caught failure mode, and the
measured before/after — not the precise percentage.*
