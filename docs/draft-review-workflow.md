# Listing draft workflow

A connected AI application can help prepare a listing draft from product photos and confirmed details.

## Start a draft

Share the product photos in the conversation and ask for a complete listing draft. The client calls `start_new_listing_draft` and guides the conversation one question at a time.

The assistant should:

1. Describe visible features cautiously and label them as photo observations.
2. Ask for facts that photos cannot establish, such as materials, measurements, quantity, construction, and personalization.
3. Accept corrections, skipped questions, and later feedback.
4. Keep confirmed facts, suggestions, and unknowns distinct.
5. Prepare the relevant listing fields and revise the draft until it is ready for review.

The MCP server does not receive, upload, or store the photos. The draft remains in the conversation; no Etsy listing is created or published.

## Research

When requested, the connected AI application may research comparable public prices or timely marketing ideas if it has web access. It should cite sources and dates, explain how close the comparisons are, and distinguish asking prices from evidence of completed sales. The MCP server itself does not retrieve external marketplace data.

## Existing listings

For an existing listing, ask for a review and select a listing returned by `list_active_listings`. The assistant can read its details during the same server session and suggest changes for that listing. Each listing should be reviewed separately.

## Draft format check

The `validate_listing_draft` tool checks title, description, and tag formatting locally. It returns issue codes and counts, not the submitted draft text. A passing result does not verify claims, product facts, search ranking, or sales performance.

See [recommendations and draft checks](intelligent-listing-review.md) for what a useful review should contain.
