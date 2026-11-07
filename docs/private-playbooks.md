# Private seller guidance

The MCP server provides general seller guidance and can use a private guidance file stored on the same computer. The connected AI client is instructed to retrieve the applicable guidance when beginning seller assistance.

If no private file is present, general guidance is returned. When general guidance is used, the assistant should say that the advice is not customized and invite the seller to configure the installation. An invalid or unsafe private file causes a clear failure; the server does not silently fall back to general guidance. There is no separate activation toggle; disabling the MCP server turns this behavior off.

## Create or update guidance

Ask the connected assistant to configure or update the Etsy seller-assistant guidance. The conversation should gather shop and product context one question at a time, recap confirmed facts and unknowns, and prepare a complete document for review.

Saving a new file requires an explicit Save/Don't save choice. Updating an existing file first requires permission to read it, because its contents will be shared with the connected AI provider. The assistant should show the complete replacement and wait for an explicit Replace/Don't replace choice. A decline or uncertain response must leave the file unchanged. Guidance never grants Etsy access or permission to change a listing.

Manual editing is also supported. The default macOS file is:

```text
~/Library/Application Support/etsySellerAssistant/guidance/playbook.private.md
```

Use a separate private copy of [the generic template](../templates/playbook.example.md). Keep the completed file outside the repository. An alternate absolute folder can be set with `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY`.

## Privacy

Calling `get_review_guidance` sends the returned guidance text to the AI application/provider connected to the MCP server. The guidance file is not read at server startup or by the status tool. It is not included in Etsy requests, repository files, or audit records.

Do not store credentials, tokens, customer data, or order records in the guidance file. Treat its contents as preferences and context, never as permission to bypass tool safeguards.
