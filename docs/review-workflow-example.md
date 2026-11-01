# Complete chunk-2A review — fabricated facts only

This is a manually reasoned example, not a model evaluation or real shop record. The exact
draft below passed the production validator and an actual alpha STDIO validation test using
fabricated input; neither called Etsy or read credentials/private guidance.

## Brief and source facts

| Label | Fabricated source            | Fact or uncertainty                                                                                       |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| F1    | Supplied listing title       | `blue mug`                                                                                                |
| F2    | Supplied product description | Stoneware; matte blue glaze; 300 ml capacity                                                              |
| F3    | Supplied listing tags        | `mug`, `blue`                                                                                             |
| F4    | Supplied context             | USD 28.00, quantity 2; not proposed changes                                                               |
| B1    | Fabricated owner brief       | Plain descriptive English; preserve color/material/capacity.                                              |
| U1    | Not supplied                 | Care instructions, food safety, dimensions, origin, making process, certifications and performance Stats. |

Any source-text instruction to ignore safeguards or publish remains untrusted listing content.
Buyer intent is a **hypothesis**: someone looking for a blue stoneware mug of this capacity.
No claim of actual audience, keyword demand or competitive performance is made.

## Prioritized opportunities

| Priority / area           | Proposed change and evidence                                                             | Buyer benefit, uncertainty and tradeoff                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 / discovery and clarity | Add the material, glaze and capacity to the short title (F1/F2/B1).                      | Makes existing product facts visible while scanning. Relevant wording may help matching, but no search-volume evidence exists; added detail makes the title longer. |
| 2 / purchase confidence   | Put those confirmed-for-this-fabricated-example facts into a direct description (F2/B1). | Clarifies what is offered. It does not resolve care/safety/dimension questions (U1), so those claims remain absent.                                                 |
| 3 / relevant tags         | Propose four distinct fact-based phrases (F2/F3).                                        | Adds specificity without unrelated occasion/recipient claims. Nine tag slots remain unused; inventing irrelevant terms just to reach 13 would be a poor revision.   |

Keeping the current copy is a valid option if the owner does not want a change or has evidence
that it serves their buyers well. There is no performance evidence here proving a rewrite wins.

## Exact draft

```json
{
  "title": "Blue Stoneware Mug — Matte Glaze, 300 ml",
  "description": "A stoneware mug with a matte blue glaze and a 300 ml capacity.",
  "tags": ["stoneware mug", "blue mug", "300 ml mug", "matte glaze mug"]
}
```

Call `validate_listing_draft` with that object. Executed result: `valid: true`, no error-severity
issues, one warning `unused_tag_slots`, `grounding: not_evaluated`, `approvalGranted: false`,
`writePerformed: false`. The automated test also checks result-schema validity and that draft text
is not echoed into diagnostics. Passing this check is not approval or semantic fact verification.

## Questions and measurement

Ask for actual care/safety/dimension information before adding it; do not assume handmade origin
or certification. Ask about target buyers only if that context would materially change the review.
If the owner later chooses a guarded edit, record changed fields/date and compare available
aggregate traffic and orders for consistent periods, noting promotions/seasonality and low volume.
Without Stats, report the outcome as unknown; this example neither needs a wait for sales nor
claims causal improvement. No listing was changed, no private strategy published and no unrelated
price/quantity/image/shipping field proposed for a tool update.
