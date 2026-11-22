export const NEW_LISTING_DRAFT_WORKFLOW = {
  schemaVersion: 1,
  title: 'Create a complete, reviewable Etsy listing draft from the seller’s photos and answers.',
  instructions: [
    'Use this workflow when the owner shares photos of a new item or asks for help making a new listing. The connected AI client can inspect photos supplied in chat; the MCP server does not receive or upload image files.',
    'Start with a brief description of visible features, clearly labeled as observations. Ask one focused question at a time for important facts that cannot be established from the photos. Do not infer materials, dimensions, construction, origin, condition, safety, or other product claims.',
    'Use saved seller guidance automatically when it is available. If guidance is general, tell the owner the draft is not personalized to their shop and offer the configuration interview.',
    'Ask whether the item is physical or digital and have the owner confirm the Etsy category path before asking category-specific questions. Suggest plausible paths as choices, not confirmed categories.',
    'Use current seller taxonomy metadata for the confirmed category when available from an identified source, such as current Etsy category options provided by the owner. Ask required properties first and offer only supported values and units. If the metadata is unavailable or unverified, leave category requirements and supported choices unresolved rather than guessing.',
    'If the category changes, discard the previous category’s property requirements and allowed values. Recheck which properties and variation choices apply before carrying confirmed product facts into the new category.',
    'Work through only applicable fields. The owner may answer, correct, skip, or leave a field for later. Keep skipped required fields visible in the recap.',
    'Prepare one draft with confirmed facts, suggestions, and unresolved fields clearly labeled. If a required field or the applicable category requirements are unresolved, call it a partial draft and list the remaining Etsy entry steps.',
    'Run validate_listing_draft on the title, description, and tags. Explain its local checks do not establish factual accuracy, category fit, ranking, or sales results.',
    'This workflow does not create or publish an Etsy listing. It creates a draft in the conversation only; it does not call Etsy, upload photos, or change shop settings. Do not imply that the Etsy listing exists.',
  ],
  listingFields: [
    {
      group: 'Core listing copy',
      fields: ['title', 'description', 'tags'],
      handling:
        'Draft from confirmed facts; preserve item-specific details and use the existing local validator.',
    },
    {
      group: 'Category and attributes',
      fields: [
        'suggested category/taxonomy',
        'applicable category attributes',
        'materials',
        'styles',
      ],
      handling:
        'Suggest a category and attribute values only when supported. Mark Etsy-managed selection or confirmation as a seller step.',
    },
    {
      group: 'Item facts and eligibility',
      fields: [
        'who made it',
        'when it was made',
        'whether it is a supply or tool',
        'materials',
        'dimensions and weight',
        'contents and included parts',
        'care, condition, and other relevant details',
      ],
      handling:
        'Ask the owner; never fill these from appearance alone. Leave irrelevant fields out and unknown fields marked unresolved.',
    },
    {
      group: 'Price, quantity, and options',
      fields: [
        'price and currency',
        'quantity',
        'variations/options',
        'personalization choices and limits',
      ],
      handling:
        'These are owner decisions. Suggest options only when asked or when useful; do not claim a choice has been applied.',
    },
    {
      group: 'Fulfillment and shop settings',
      fields: [
        'processing time',
        'existing shipping profile',
        'package weight and dimensions',
        'existing return policy',
        'renewal or visibility choices when relevant',
      ],
      handling:
        'For physical items ask about applicable package, shipping and processing details. For digital items skip package and shipping questions and leave file selection and delivery setup to the owner. Do not invent fulfillment promises or imply that settings changed.',
    },
    {
      group: 'Photos',
      fields: ['owner-selected images for the eventual Etsy listing'],
      handling:
        'Review only images deliberately supplied in chat. The owner chooses and uploads listing photos separately.',
    },
  ],
  conversation: [
    '1. Observe the supplied images and summarize only visible details.',
    '2. Ask one targeted question at a time, prioritizing facts needed to avoid a misleading draft.',
    '3. Confirm item facts and owner choices; accept skip, correction, or “decide later.”',
    '4. Draft the title, description, tags, and applicable field suggestions with clear source labels.',
    '5. Validate the copy fields, show unresolved Etsy entry steps, and invite feedback.',
    '6. Revise for owner review and call it complete and ready to enter only after required fields and category requirements are resolved.',
  ],
} as const;
