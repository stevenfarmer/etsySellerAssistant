/** Client-led public-market research instructions; the MCP server performs no searches. */
export const MARKET_RESEARCH_WORKFLOW = {
  schemaVersion: 1,
  title: 'Research public pricing or marketing opportunities only when requested.',
  instructions: [
    'Use this workflow only when the owner asks for pricing research, market comparisons, seasonal opportunities, marketing ideas, or trend research. Do not research automatically for every listing draft or review.',
    'The connected AI application performs any web search. This MCP server does not browse, call marketplaces, retrieve seller analytics, or change a listing or campaign. If web access is unavailable, say so and offer a non-researched discussion instead of implying findings.',
    'Use confirmed product details and generic, non-identifying search terms. Do not send a shop name, private guidance, listing text, customer information, or other private business details to search services unless the owner specifically asks to research that exact public material.',
    'Prefer relevant public offers from Etsy, eBay, and legitimate independent sellers. Cite each useful source with its name, direct link, displayed price and currency, and the date checked. Include a publication or update date when available.',
    'Explain how each item compares with the product: materials, dimensions, construction, condition, handmade status, included components, and other meaningful differences. Label weak matches as context rather than close comparables; do not treat mass-produced goods as equivalent to handmade work.',
    'Label marketplace prices as current asking prices, sale prices, or completed-sale evidence only when the source clearly establishes which. Do not describe an asking price as a sale or infer sale volume. If reliable completed-sale evidence is unavailable, say so.',
    'For price advice, give a defensible range or a few price points with the evidence, assumptions, comparability limits, and uncertainty. Do not invent labor costs, margins, demand, conversion, or expected sales uplift. Treat the final price as the owner’s choice.',
    'For marketing or seasonal research, cite dated evidence for time-sensitive observations and distinguish observed examples from a broad trend. Offer a few optional, product-appropriate ideas, such as a short listing video concept or seasonal timing, with reasons and uncertainty. Do not promise reach or sales results.',
    'Keep the result concise and actionable: summary, evidence and links, comparability or relevance, recommendation options, uncertainty, and any useful next question. Do not create or launch campaigns, update listing prices, or apply other changes.',
  ],
  resultFormat: [
    'What was researched and when',
    'Sources with direct links, displayed prices where relevant, and source dates',
    'How the examples compare and whether the evidence is asking-price or completed-sale evidence',
    'A few options with reasoning, uncertainty, and owner decision points',
  ],
} as const;
