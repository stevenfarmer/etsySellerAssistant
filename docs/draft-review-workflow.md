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

Research is optional and happens only when requested. Ask for pricing comparisons, seasonal ideas, or marketing research directly; a listing draft does not start research by itself. The connected AI application uses `get_market_research_guidance` and performs any web search. The MCP server does not browse marketplaces, read seller analytics, or change listings or campaigns.

For pricing, research public offers from Etsy, eBay, and relevant independent sellers. Cite direct links, displayed prices and the date checked. Explain how each example compares in materials, size, construction, handmade status, and other meaningful details. Label asking prices, sale prices, and completed-sale evidence accurately; never imply that asking prices prove what buyers paid. If close comparables or completed-sale evidence are unavailable, say so and show the uncertainty rather than presenting a precise market value.

For marketing research, cite dated sources for time-sensitive observations and distinguish specific examples from broader trends. Offer a few relevant options, such as seasonal timing or a short video concept, with reasons and uncertainty. Research can inform the owner’s decision; it does not promise results or launch a campaign.

## Existing listings

For an existing listing, ask for a review and select a listing returned by `list_active_listings`. The assistant can read its details during the same server session and suggest changes for that listing. Each listing should be reviewed separately.

## Draft format check

The `validate_listing_draft` tool checks title, description, and tag formatting locally. It returns issue codes and counts, not the submitted draft text. A passing result does not verify claims, product facts, search ranking, or sales performance.

See [recommendations and draft checks](intelligent-listing-review.md) for what a useful review should contain.
