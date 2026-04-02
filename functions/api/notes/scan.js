/**
 * POST /api/notes/scan
 * Upload a photo of a banknote and extract details using Workers AI vision model.
 * Uses @cf/unum/uform-gen2-qwen-500m (no license needed) for image-to-text,
 * then @cf/meta/llama-3.1-8b-instruct to parse the description into structured data.
 */

export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    let imageBytes;
    let side = 'front';

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const file = formData.get('photo');
      side = formData.get('side') || 'front';
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No photo uploaded' }, { status: 400 });
      }
      imageBytes = [...new Uint8Array(await file.arrayBuffer())];
    } else {
      return Response.json({ error: 'Please upload a photo as multipart/form-data' }, { status: 400 });
    }

    // Step 1: Use vision model to describe the banknote image
    const describePrompt = side === 'front'
      ? 'Describe this U.S. banknote in detail. Include the denomination, series year, serial number, signatures, seal color, and any notable features or errors you can see.'
      : 'Describe the back of this U.S. banknote in detail. Include the denomination and any notable features, errors, or condition details you can see.';

    const visionResult = await context.env.AI.run('@cf/unum/uform-gen2-qwen-500m', {
      prompt: describePrompt,
      image: imageBytes,
    });

    const description = visionResult.description || visionResult.response || '';

    // Step 2: Use text model to extract structured data from the description
    const extractPrompt = side === 'front'
      ? `You are a U.S. currency expert. Based on this description of the front of a banknote, extract the details into a JSON object.

Description: "${description}"

Return ONLY a valid JSON object with these fields (use empty string "" if not mentioned):
{"denomination":"number only e.g. 1 5 10 20 50 100","seriesYear":"e.g. 2013 or 2017A","serialNumber":"full serial including letters and star if present","treasurerSignature":"name of Treasurer","secretarySignature":"name of Secretary","errors":"any printing errors or empty string","condition":"physical condition"}

JSON only, no other text:`
      : `You are a U.S. currency expert. Based on this description of the back of a banknote, extract details into a JSON object.

Description: "${description}"

Return ONLY a valid JSON object with these fields (use empty string "" if not mentioned):
{"denomination":"number only e.g. 1 5 10 20 50 100","errors":"any printing errors or empty string","condition":"physical condition"}

JSON only, no other text:`;

    const textResult = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: extractPrompt }],
      max_tokens: 300,
    });

    const text = textResult.response || '';

    // Try to parse JSON from the response
    let extracted = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      extracted = { raw: text, description };
    }

    // Normalize errors field
    if (typeof extracted.errors === 'string') {
      if (extracted.errors === '' || extracted.errors === '[]' || extracted.errors.toLowerCase() === 'none') {
        extracted.errors = [];
      } else {
        extracted.errors = [extracted.errors];
      }
    }
    if (!Array.isArray(extracted.errors)) {
      extracted.errors = [];
    }

    return Response.json({
      success: true,
      extracted,
      description,
      message: extracted.denomination
        ? `I found a $${extracted.denomination} note! Review the details and make any corrections.`
        : 'I analyzed the photo. Please review and fill in any missing details.',
    });

  } catch (error) {
    return Response.json({
      error: 'Failed to scan photo: ' + error.message,
    }, { status: 500 });
  }
}
