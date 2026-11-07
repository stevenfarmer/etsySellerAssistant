# Guided private-guidance setup: functional design proposal

> **Current behavior update:** The owner later removed the separate activation step. T-043 now directs the alpha to use a saved playbook automatically for seller-assistance conversations, or return general guidance marked as not customized. Disabling the MCP server is the off switch. The interview and reviewed-save requirements below remain useful; activation-specific rows describe the earlier proposal, not current behavior.

Status: approved by the owner on 6 November 2026. T-039 implements first-time setup and safe
creation; T-040 implements natural-language update entry, reviewed replacement, manual edit
instructions and separate activation/deactivation in PR #58. Local validation and all five PR/main
CI checks passed. Supported-client acceptance remains. This design does not authorize Etsy access,
listing edits or publication.

## Goal

Let a seller describe how their store and products work, review a concise set of tailored
instructions, and save those instructions locally without finding or editing a file by hand. The
interview prepares the assistant to help draft complete listings from owner-provided product
photos, review existing listings one by one, and provide pricing, seasonal-sales and marketing
research when asked. It should record the owner's preferences for how those capabilities are used,
not promise results or grant permission for listing changes. The server stores the owner's
approved document; the selected AI client conducts the conversation, interprets photos and drafts
the text.

## Proposed experience

| Step         | Seller experience                                                                                                                                  | Product behavior                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start        | Ask the connected assistant to help set up private seller guidance.                                                                                | The assistant retrieves a generic setup prompt from the local server. Nothing is loaded automatically at startup.                                                                                                       |
| Disclosure   | Before asking questions, learn that answers and any existing guidance shown to the assistant are sent to the selected AI client/provider.          | The assistant explains that the setup conversation makes no Etsy requests, asks for no credentials or customer records, and can be stopped or skipped at any time.                                                      |
| Interview    | Answer one short question at a time; skip anything or say “not sure.”                                                                              | The assistant adapts follow-up questions to the answers and asks only for information that could materially change its recommendations.                                                                                 |
| Check facts  | Review and correct a short recap before research.                                                                                                  | The recap separates owner-confirmed facts, preferences, and unanswered or uncertain points. The assistant does not fill gaps with guesses.                                                                              |
| Research     | See a short research plan based on the interview; remove or edit topics before external research.                                                  | The assistant researches a few relevant topics using generalized, non-identifying queries and current, credible sources. It returns dated sources, useful findings, limits, and practical options.                      |
| Review draft | Read and edit the complete proposed document, including the research notes. Confirm facts and decide whether it reflects the seller's preferences. | The assistant produces a concise private file, distinguishes evidence from recommendations, keeps unknowns explicit, and makes no local changes yet. The seller can revise, restart, or cancel.                         |
| Save         | Read the complete document in chat and choose Save or Don’t save in one clear question.                                                            | The assistant waits for an explicit Save reply, then calls the fixed-path create-only MCP tool with `ownerConfirmed: true`. The server cannot verify the chat transcript; the flag records the assistant’s assertion.   |
| Turn on      | After saving, separately choose “Turn on private guidance” or “Keep it off” in chat.                                                               | Only a clear affirmative choice enables private guidance for this installation. This does not retrieve the file; later content is sent to the selected AI provider only when the owner explicitly requests it.          |
| Finish       | Get a clear saved/on or saved/off result and know how to change the choice later.                                                                  | Saving and activation are separate actions. The server does not read the file on startup or status checks; the existing explicit `get_review_guidance` call contract remains. Turning it off is also available in chat. |

## Interview outline

Ask these as optional topics, one at a time, with skip and “unknown” answers supported:

1. Store focus, the kinds of products sold, and what help the owner wants when developing a new item.
2. How products are made, what details can be confirmed from photos, what materials/features need
   owner confirmation, and what claims should never be assumed.
3. Intended buyers or uses, expressed as general audience descriptions rather than customer records.
4. Preferred writing voice, terms to use or avoid, and how much editing the owner wants.
5. How the owner wants new listing drafts to feel: a conversational, form-like flow; useful field
   suggestions; how to handle skips, corrections and feedback; and how much detail to show at once.
6. How the owner wants existing listings reviewed, including whether multiple listings should be
   handled one at a time with separate recommendations.
7. Current marketing activities, seasonal opportunities, and interest in video, timely themes,
   trend research or comparable-product pricing.
8. Business priorities, practical constraints, and any owner-defined boundaries for recommendations.

The assistant should not request passwords, tokens, buyer identities, order details, or other
customer records. It may ask for broad, optional context, but must label unsupported claims and
leave missing facts blank rather than generating them.

The goal is a reusable guide for those workflows, not a list of mandatory questions to ask on every
future request. The assistant should ask only for facts that materially affect a specific listing
or recommendation, preserve the owner's review of each listing separately, and do pricing/trend
research when requested. Photo observations do not establish hidden product details. A new-listing
draft remains a proposal; the current server does not create or publish listings.

## Required research stage

After the owner corrects the interview recap, the assistant must propose a short research plan for
the private guidance, show it to the owner, and research the selected topics before drafting. The
plan should reflect the owner's goals and may cover listing presentation/search guidance,
comparable-product pricing across Etsy, eBay and other legitimate online sellers, seasonal sales
planning, or marketing ideas such as video and timely themes. Explain why each topic may help; let
the owner remove, add or defer topics. Do not force a topic that does not fit the owner's answers.
The private guidance should also tell the future assistant to perform deeper market or trend
research only when the owner asks for it, unless the owner chooses another preference. If useful
evidence is unavailable, say so and leave the topic open rather than filling the gap with generic
advice.

Use current primary sources where available and reputable specialist sources for broader strategy.
For pricing research, compare genuinely similar public offers and describe material differences
such as product type, materials, size, condition and included components when the source shows
them; distinguish asking prices from completed sales. Never imply access to private sales,
conversion or competitor-performance data. For trends and seasonal suggestions, state when the
source was checked and whether the idea is a current observation or a general planning option.
Record each source's title, link, publication/update date when available, and the date checked.
Separate sourced facts, the assistant's interpretation, and optional recommendations; note
conflicts, uncertainty, and limits. Do not invent benchmarks or promise results. Keep research
queries generic: do not send the shop name, location, listing details, customer information,
private-document text, or other identifying facts to search services.

Keep the research useful and high-level by default: explain why a finding may matter, outline a
small number of options and trade-offs, and flag any decision the owner may want to make. Do not
turn research into business-specific operating instructions, settings, commitments, or finished
copy unless the owner asks for that. If deeper work would require choosing operational details,
ask whether the owner wants to explore it before drafting those details.

## Private document structure

The draft should use generic headings that make later review easy:

- Business and product overview — only owner-confirmed facts.
- Product facts and claim boundaries — confirmed details, plus what needs checking.
- New-listing workflow — how to combine owner-provided photos with confirmed details, ask about
  facts that photos cannot establish, and guide the seller through suggestions, feedback and revision.
- Existing-listing reviews — how to make separate recommendations for each selected listing.
- Intended audiences and uses — owner preferences, not individual customer data.
- Writing preferences — tone, terminology, and editing preferences.
- Current marketing context — channels and observations supplied by the owner; no invented
  benchmarks or performance conclusions.
- Requested research — preferences for when to explore comparable prices, seasonal opportunities,
  marketing ideas, video and timely themes; cite sources and explain limits when research is asked
  for. Use dated research findings in this private setup draft only, not as permanently current facts.
- Research-informed opportunities — a few concise findings, options, trade-offs, and open decisions,
  with dated sources, evidence limits, and a note to verify time-sensitive advice before relying on
  it. This is not a business-specific operations manual.
- Priorities, constraints, and open questions.
- Review note — owner should revisit the file when products or priorities change.

Keep it short enough to review as a whole. Do not include credentials, private buyer information,
or instructions that grant permission to change listings or weaken server safeguards.

## Save and update behavior

The proposed MCP interface has three parts:

- A read-only, empty-input setup-prompt tool returns the generic interview instructions. It contains
  no seller-specific content and can be used before private mode is enabled.
- A local create tool accepts the final document and requires `ownerConfirmed: true`. Before
  calling it, the assistant must show the complete exact document in chat, ask one Save/Don’t save
  question, and wait for the owner's explicit Save reply. The argument is an assistant assertion;
  the server cannot inspect or independently verify the conversation. The tool has no path,
  filename, Etsy, or settings argument and only creates a file if none exists.
- A separate in-chat activation action records the owner's explicit “Turn on private guidance”
  choice for this installation. “Keep it off” leaves the saved file inactive. Activation does not
  fetch the file, and future delivery still requires an explicit `get_review_guidance` request. The
  owner can turn guidance off through a separate in-chat request. This action must not silently
  alter MCP client configuration or broaden Etsy access.

For `create`, the server uses the existing fixed private filename and refuses to overwrite any
existing file. For a future `replace` action, the owner must first choose to use their existing
guidance in the AI conversation, review the complete replacement, and explicitly choose Replace in
chat. The server keeps a private recovery copy before an atomic replacement; if the existing file
or recovery copy cannot be handled safely, it leaves the current file unchanged and reports
failure. No file content goes to logs, audits, tests, or project tracking.

Use the existing configured private directory and size/content rules. Do not create an arbitrary
path option. The default remains off. After saving, the assistant asks separately whether to turn
private guidance on, explains that later explicit retrieval sends the file to the selected AI
provider, and records only an affirmative choice. It must not enable private use as a side effect of
saving or alter the MCP client's configuration.

## Failure and privacy behavior

- If the owner declines, the response is unclear, or the assistant has not received an explicit
  Save choice, do not call the save tool. If `ownerConfirmed: true` is missing, the server refuses
  the call. The server cannot prove that the assistant waited for the owner's reply.
- If the file already exists during `create`, preserve it and offer the explicit update path.
- If the file is invalid, unsafe, too large, or cannot be backed up/replaced safely, preserve it and
  explain that no update was saved.
- Never include private content in success diagnostics, logs, errors, audit records, Git, or the
  connected project tracker.
- The setup conversation and any existing private document deliberately shown to the assistant are
  visible to the selected AI provider. Local saving does not make that conversation private from
  the provider.
- Research queries use generalized topics only; do not expose identifying seller information or
  private guidance to search services. Research findings and source links are part of the private
  draft and stay out of project records.
- This flow does not contact Etsy, change OAuth scopes, make listing edits, or publish anything.

## Proposed acceptance criteria

- An owner can start from a plain-language request without locating or editing a file manually.
- The provider and external-research disclosure appears before private questions, external searches,
  or an existing private document is read.
- Questions are optional, focused, and adaptive; the owner can skip, mark unknown, revise, or stop.
- After the recap is corrected, the assistant researches a few relevant topics and cites dated,
  credible sources; queries contain no identifying seller details.
- Research is concise decision support, not prescriptive business-specific setup or finished
  operational copy. The assistant explores detailed operational choices only at the owner's
  request.
- The draft distinguishes confirmed facts, preferences, and open questions and contains no invented
  store/product claims.
- The draft includes a concise research section that distinguishes source evidence from
  recommendations and states uncertainty and freshness limits.
- The owner reviews the complete exact document in chat before one final Save/Don’t save choice.
- Save uses only the fixed private location, preserves existing content unless an explicit reviewed
  replacement is accepted, and fails closed on unsafe or uncertain file operations.
- After saving, the owner separately opts in or keeps guidance off in chat. Activation itself does
  not read the file; private guidance is returned only through a later explicit
  `get_review_guidance` call. The owner can turn it off in chat.
- Automated tests use fabricated content and temporary directories only. A Mac acceptance check
  verifies interview/research disclosure, source presentation, save confirmation, create behavior,
  no-overwrite/update recovery, and separate in-chat activation/deactivation.

## Implementation gate

The owner approved this flow, including the separate explicit in-chat opt-in after saving. After
the Codex host did not open the MCP form, the owner chose one explicit in-chat Save/Don’t save
choice. T-039 implements the generic interview/research prompt and fixed-path, create-only save.
T-040 adds a natural-language update prompt, explicit permission before the existing file is read,
full-text replacement review, one Replace/Don't replace reply, revision checking, and a private
recovery copy before replacement. It also records a separate persistent activation choice without
reading the guidance text. Tool descriptions guide the connected agent; the server cannot inspect
ordinary chat text or verify the agent waited for the owner's reply. A saved activation choice
takes precedence over the legacy mode setting. Manual editing remains available at the documented
fixed/configured file location. Supported-client behavior still requires owner acceptance.
