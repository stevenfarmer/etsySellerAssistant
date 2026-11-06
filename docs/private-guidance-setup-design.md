# Guided private-guidance setup: functional design proposal

Status: proposed for owner review under T-034. This document describes a user experience; it does
not authorize implementation or change the current private-guidance storage contract.

## Goal

Let a seller describe how their store and products work, review a concise set of tailored
instructions, and save those instructions locally without finding or editing a file by hand.
The server stores the owner's approved document; the selected AI client conducts the conversation
and drafts the text.

## Proposed experience

| Step         | Seller experience                                                                                                                                  | Product behavior                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start        | Ask the connected assistant to help set up private seller guidance.                                                                                | The assistant retrieves a generic setup prompt from the local server. Nothing is loaded automatically at startup.                                                                                                       |
| Disclosure   | Before asking questions, learn that answers and any existing guidance shown to the assistant are sent to the selected AI client/provider.          | The assistant explains that the setup conversation makes no Etsy requests, asks for no credentials or customer records, and can be stopped or skipped at any time.                                                      |
| Interview    | Answer one short question at a time; skip anything or say “not sure.”                                                                              | The assistant adapts follow-up questions to the answers and asks only for information that could materially change its recommendations.                                                                                 |
| Check facts  | Review and correct a short recap before research.                                                                                                  | The recap separates owner-confirmed facts, preferences, and unanswered or uncertain points. The assistant does not fill gaps with guesses.                                                                              |
| Research     | See a short research plan based on the interview; remove or edit topics before external research.                                                  | The assistant researches a few relevant topics using generalized, non-identifying queries and current, credible sources. It returns dated sources, useful findings, limits, and practical options.                      |
| Review draft | Read and edit the complete proposed document, including the research notes. Confirm facts and decide whether it reflects the seller's preferences. | The assistant produces a concise private file, distinguishes evidence from recommendations, keeps unknowns explicit, and makes no local changes yet. The seller can revise, restart, or cancel.                         |
| Save         | Choose Save in one host confirmation that shows the exact document and fixed destination.                                                          | A local MCP save action writes only the approved text to the configured private-guidance location. It accepts no model-supplied path and never changes Etsy, credentials, or client settings.                           |
| Turn on      | After saving, separately choose “Turn on private guidance” or “Keep it off” in chat.                                                               | Only a clear affirmative choice enables private guidance for this installation. This does not retrieve the file; later content is sent to the selected AI provider only when the owner explicitly requests it.          |
| Finish       | Get a clear saved/on or saved/off result and know how to change the choice later.                                                                  | Saving and activation are separate actions. The server does not read the file on startup or status checks; the existing explicit `get_review_guidance` call contract remains. Turning it off is also available in chat. |

## Interview outline

Ask these as optional topics, one at a time, with skip and “unknown” answers supported:

1. Store focus and the kinds of products the owner wants help with.
2. How products are made, what materials or features are confirmed, and what claims should never be assumed.
3. Intended buyers or uses, expressed as general audience descriptions rather than customer records.
4. Preferred writing voice, terms to use or avoid, and how much editing the owner wants.
5. Current marketing activities, what the owner has observed, and what they would like help improving.
6. Business priorities, practical constraints, and any owner-defined boundaries for recommendations.

The assistant should not request passwords, tokens, buyer identities, order details, or other
customer records. It may ask for broad, optional context, but must label unsupported claims and
leave missing facts blank rather than generating them.

## Required research stage

After the owner corrects the interview recap, the assistant must identify and research a small set
of relevant, actionable topics before drafting the guidance. Use the interview and owner-approved
research plan to choose topics; suitable examples include search visibility and listing
presentation for one-off goods, promotion planning for limited-inventory releases, useful ways to
evaluate results when each item is unique, and costing or pricing for handmade low-volume work.
Do not force a topic that does not fit the owner's answers. If useful evidence is unavailable, say
so and leave that topic as an open question rather than filling the gap with generic advice.

Use current primary sources where available and reputable specialist sources for broader strategy.
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
- Intended audiences and uses — owner preferences, not individual customer data.
- Writing preferences — tone, terminology, and editing preferences.
- Current marketing context — channels and observations supplied by the owner; no invented
  benchmarks or performance conclusions.
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
- A local save tool accepts the final document and a closed operation choice (`create` or
  `replace`). It has no path, filename, Etsy, or settings argument. The host confirmation displays
  the exact document and uses one Accept/Deny choice; host acceptance is required before any write.
- A separate in-chat activation action records the owner's explicit “Turn on private guidance”
  choice for this installation. “Keep it off” leaves the saved file inactive. Activation does not
  fetch the file, and future delivery still requires an explicit `get_review_guidance` request. The
  owner can turn guidance off through a separate in-chat request. This action must not silently
  alter MCP client configuration or broaden Etsy access.

For `create`, the server uses the existing fixed private filename and refuses to overwrite any
existing file. For `replace`, the owner must first choose to use their existing guidance in the AI
conversation, review the complete replacement, and accept a host confirmation. The server keeps a
private recovery copy before an atomic replacement; if the existing file or recovery copy cannot
be handled safely, it leaves the current file unchanged and reports failure. No file content goes
to logs, audits, tests, or project tracking.

Use the existing configured private directory and size/content rules. Do not create an arbitrary
path option. The default remains off. After saving, the assistant asks separately whether to turn
private guidance on, explains that later explicit retrieval sends the file to the selected AI
provider, and records only an affirmative choice. It must not enable private use as a side effect of
saving or alter the MCP client's configuration.

## Failure and privacy behavior

- If confirmation is declined or unavailable, do not write anything.
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
- The owner reviews the complete exact document before the host asks for one final save decision.
- Save uses only the fixed private location, preserves existing content unless an explicit reviewed
  replacement is accepted, and fails closed on unsafe or uncertain file operations.
- After saving, the owner separately opts in or keeps guidance off in chat. Activation itself does
  not read the file; private guidance is returned only through a later explicit
  `get_review_guidance` call. The owner can turn it off in chat.
- Automated tests use fabricated content and temporary directories only. A Mac acceptance check
  verifies interview/research disclosure, source presentation, save confirmation, create behavior,
  no-overwrite/update recovery, and separate in-chat activation/deactivation.

## Implementation gate

The owner has requested a separate explicit in-chat opt-in after saving; it must not be bundled with
the save confirmation or trigger automatic retrieval. The exact local activation mechanism is an
implementation-design question. No code or tool changes should start until the owner reviews this
revised flow, especially the research stage and the distinction between saving, turning guidance
on, and explicitly retrieving it.
