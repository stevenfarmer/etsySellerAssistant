# Guided private-guidance setup: functional design proposal

Status: proposed for owner review under T-034. This document describes a user experience; it does
not authorize implementation or change the current private-guidance storage contract.

## Goal

Let a seller describe how their store and products work, review a concise set of tailored
instructions, and save those instructions locally without finding or editing a file by hand.
The server stores the owner's approved document; the selected AI client conducts the conversation
and drafts the text.

## Proposed experience

| Step         | Seller experience                                                                                                                         | Product behavior                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start        | Ask the connected assistant to help set up private seller guidance.                                                                       | The assistant retrieves a generic setup prompt from the local server. Nothing is loaded automatically at startup.                                                                             |
| Disclosure   | Before asking questions, learn that answers and any existing guidance shown to the assistant are sent to the selected AI client/provider. | The assistant explains that the setup conversation makes no Etsy requests, asks for no credentials or customer records, and can be stopped or skipped at any time.                            |
| Interview    | Answer one short question at a time; skip anything or say “not sure.”                                                                     | The assistant adapts follow-up questions to the answers and asks only for information that could materially change its recommendations.                                                       |
| Check facts  | Review a short recap before drafting.                                                                                                     | The recap separates owner-confirmed facts, preferences, and unanswered or uncertain points. The assistant does not fill gaps with guesses.                                                    |
| Review draft | Read and edit the complete proposed document. Confirm facts and decide whether it reflects the seller's preferences.                      | The assistant produces a concise private file, keeps unknowns explicit, and makes no local changes yet. The seller can revise, restart, or cancel.                                            |
| Save         | Choose Save in one host confirmation that shows the exact document and fixed destination.                                                 | A local MCP save action writes only the approved text to the configured private-guidance location. It accepts no model-supplied path and never changes Etsy, credentials, or client settings. |
| Finish       | Get a clear saved/not-saved result and the next step for using private guidance.                                                          | Saving does not activate private mode. The server keeps the current explicit opt-in and `get_review_guidance` call contract; it does not read the file on startup or status checks.           |

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

## Private document structure

The draft should use generic headings that make later review easy:

- Business and product overview — only owner-confirmed facts.
- Product facts and claim boundaries — confirmed details, plus what needs checking.
- Intended audiences and uses — owner preferences, not individual customer data.
- Writing preferences — tone, terminology, and editing preferences.
- Current marketing context — channels and observations supplied by the owner; no invented
  benchmarks or performance conclusions.
- Priorities, constraints, and open questions.
- Review note — owner should revisit the file when products or priorities change.

Keep it short enough to review as a whole. Do not include credentials, private buyer information,
or instructions that grant permission to change listings or weaken server safeguards.

## Save and update behavior

The proposed MCP interface has two parts:

- A read-only, empty-input setup-prompt tool returns the generic interview instructions. It contains
  no seller-specific content and can be used before private mode is enabled.
- A local save tool accepts the final document and a closed operation choice (`create` or
  `replace`). It has no path, filename, Etsy, or settings argument. The host confirmation displays
  the exact document and uses one Accept/Deny choice; host acceptance is required before any write.

For `create`, the server uses the existing fixed private filename and refuses to overwrite any
existing file. For `replace`, the owner must first choose to use their existing guidance in the AI
conversation, review the complete replacement, and accept a host confirmation. The server keeps a
private recovery copy before an atomic replacement; if the existing file or recovery copy cannot
be handled safely, it leaves the current file unchanged and reports failure. No file content goes
to logs, audits, tests, or project tracking.

Use the existing configured private directory and size/content rules. Do not create an arbitrary
path option. The default mode remains generic; after saving, the assistant explains how the owner
can explicitly opt into private mode and call `get_review_guidance`. It must not silently enable
private use or alter the MCP client's configuration.

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
- This flow does not contact Etsy, change OAuth scopes, make listing edits, or publish anything.

## Proposed acceptance criteria

- An owner can start from a plain-language request without locating or editing a file manually.
- The provider disclosure appears before private questions or an existing private document is read.
- Questions are optional, focused, and adaptive; the owner can skip, mark unknown, revise, or stop.
- The draft distinguishes confirmed facts, preferences, and open questions and contains no invented
  store/product claims.
- The owner reviews the complete exact document before the host asks for one final save decision.
- Save uses only the fixed private location, preserves existing content unless an explicit reviewed
  replacement is accepted, and fails closed on unsafe or uncertain file operations.
- Startup and status remain unchanged; private guidance is returned only through explicit opt-in and
  an explicit `get_review_guidance` call.
- Automated tests use fabricated content and temporary directories only. A Mac acceptance check
  verifies the prompt, host confirmation, create behavior, and a no-overwrite/update recovery case.

## Owner decision before implementation

The design keeps the existing one-time private-mode setting as an explicit user action and does not
change MCP client configuration from the server. If that setup step should also be handled from the
chat, scope a separate explicit local opt-in design before implementation. No code or tool changes
should start until the owner reviews this flow and resolves that choice.
