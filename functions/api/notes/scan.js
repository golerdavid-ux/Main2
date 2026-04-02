/**
 * POST /api/notes/scan
 * Upload a photo of a banknote and extract details using Workers AI vision model.
 */
export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    let imageBytes;

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const file = formData.get('photo');
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No photo uploaded' }, { status: 400 });
      }
      imageBytes = [...new Uint8Array(await file.arrayBuffer())];
    } else {
      return Response.json({ error: 'Please upload a photo as multipart/form-data' }, { status: 400 });
    }

    const prompt = `You are analyzing a photo of a U.S. banknote (paper currency). Extract the following details from the note. Be precise and only report what you can clearly see.

Return ONLY a JSON object with these fields (use empty string "" if you cannot determine a field):
{
  "denomination": "the face value as a number, e.g. 1, 5, 10, 20, 50, 100",
  "seriesYear": "the series year printed on the note, e.g. 2013 or 2017A",
  "serialNumber": "the full serial number including any letters and star symbol if present",
  "treasurerSignature": "name of the Treasurer of the United States printed on the note",
  "secretarySignature": "name of the Secretary of the Treasury printed on the note",
  "errors": "any visible printing errors like miscut, misalignment, ink smear, or empty array []",
  "condition": "brief description of the note's physical condition, e.g. crisp uncirculated, light fold, heavily worn"
}

Return ONLY the JSON object, no other text.`;

    const response = await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      image: imageBytes,
      max_tokens: 512,
    });

    const text = response.response || '';

    // Try to parse JSON from the response
    let extracted = {};
    try {
      // Find JSON in the response (it might have extra text around it)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract fields manually
      extracted = {
        raw: text,
        parseError: 'Could not parse structured data. Check the raw response.',
      };
    }

    // Normalize errors field
    if (typeof extracted.errors === 'string') {
      if (extracted.errors === '' || extracted.errors === '[]') {
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
