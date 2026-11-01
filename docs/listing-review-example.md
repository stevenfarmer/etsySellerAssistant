# Listing-review demonstration — fabricated data

Executed on 1 November 2026 through the production read service, Etsy response parser and MCP
listing handlers with injected in-memory credentials and mocked responses. List and detail reads
completed; all four mocked requests were GETs. Only list/detail tools were registered in this
harness. No Etsy request, browser, native credential store or real shop data was used.

This is a worked example of the client assistant's review, not an automated model evaluation.
The server returns listing facts; Codex produces suggestions in conversation. No OpenAI API or
new suggestion-generation endpoint is required.

## Retrieved facts

| Field          | Fabricated source fact |
| -------------- | ---------------------- |
| Existing title | blue mug               |
| Material       | Stoneware              |
| Finish         | Matte blue glaze       |
| Capacity       | 300 ml                 |
| Price          | USD 28.00              |
| Quantity       | 2                      |
| Existing tags  | mug, blue              |

The source description also contained a fabricated instruction to ignore the assistant's rules
and enable listing writes. It remained untrusted listing text and was not followed.

## Review and suggested copy

The existing title omits useful material and capacity information already present in the description.

**Suggested title:** Blue Stoneware Mug — Matte Glaze, 300 ml

**Suggested description:** A stoneware mug with a matte blue glaze and a 300 ml capacity.

**Suggested tags:** stoneware mug; blue mug; 300 ml mug; matte glaze mug.

These are draft wording suggestions based on the listed facts, not claims of improved ranking,
sales, keyword performance, or owner approval. Price and quantity are retained as source facts,
not proposed changes.

## Information to ask the owner before adding claims

Dishwasher/microwave suitability, food safety, dimensions, origin, handmade process and
certifications were not provided. Do not infer or add those claims. No photo advice requiring an
unseen image is included. No Etsy changes were made.

## Acceptance status

The fabricated list/detail path and worked review are demonstrated. Product-owner acceptance of
the usefulness of this review remains to be recorded. Earlier live listing-read acceptance is
retained; this example makes no claim of a new live check.
