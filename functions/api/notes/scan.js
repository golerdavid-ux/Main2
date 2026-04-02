/**
 * POST /api/notes/scan
 * Upload a photo of a banknote and extract details using Google Gemini Vision.
 */

export async function onRequestPost(context) {
  try {
    const GEMINI_API_KEY = context.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const contentType = context.request.headers.get('content-type') || '';
    let imageBase64;
    let mimeType = 'image/jpeg';
    let side = 'front';

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const file = formData.get('photo');
      side = formData.get('side') || 'front';
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No photo uploaded' }, { status: 400 });
      }
      mimeType = file.type || 'image/jpeg';
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      imageBase64 = btoa(binary);
    } else {
      return Response.json({ error: 'Please upload a photo as multipart/form-data' }, { status: 400 });
    }

    const frontPrompt = `You are an expert U.S. currency cataloger analyzing a photo of the FRONT (obverse) of a U.S. banknote. The note may be loose or inside a grading slab/holder (PMG, PCGS, CGC). Extract every detail you can see with precision.

Return ONLY a valid JSON object with these fields (use empty string "" if you cannot determine a field):
{
  "denomination": "the face value as just a number, e.g. 1, 5, 10, 20, 50, 100",
  "seriesYear": "the exact series year printed on the note, e.g. 2013 or 2017A",
  "serialNumber": "the EXACT full serial number including all letters, digits, and star symbol if present. Read every character carefully.",
  "treasurerSignature": "full name of the Treasurer of the United States printed on the note",
  "secretarySignature": "full name of the Secretary of the Treasury printed on the note",
  "grader": "the grading company if in a slab: PMG, PCGS, or CGC. Empty string if raw/ungraded.",
  "grade": "the numeric grade and any qualifiers from the slab label, e.g. 66 EPQ, 58 PPQ, 65 Star. Empty string if raw.",
  "certNumber": "the certification/serial number on the grading label. Empty string if raw.",
  "gradingComments": "any additional text on the grading label like note description. Empty string if none.",
  "errors": [],
  "condition": "brief description of the note's physical condition"
}

IMPORTANT: Read the serial number character by character. Include the prefix letter(s), all 8 digits, and the suffix letter. If there is a star (*) symbol, include it.

If the note is in a grading holder/slab, read the label carefully to extract grader, grade, and certification number. Look for text like "PMG", "PCGS Banknote", or "CGC" on the label.

Return ONLY the JSON object, no other text.`;

    const backPrompt = `You are an expert U.S. currency cataloger analyzing a photo of the BACK (reverse) of a U.S. banknote. Extract any details visible.

Return ONLY a valid JSON object with these fields (use empty string "" if you cannot determine a field):
{
  "denomination": "the face value as just a number if visible",
  "errors": [],
  "condition": "brief description of the note's physical condition from the back"
}

Look for any printing errors like miscuts, misalignment, ink smears, inverted back, gutter folds, or offset printing.

Return ONLY the JSON object, no other text.`;

    const prompt = side === 'back' ? backPrompt : frontPrompt;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const errMsg = geminiData.error?.message || JSON.stringify(geminiData);
      return Response.json({ error: 'Gemini API error: ' + errMsg }, { status: 500 });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response — handle markdown code blocks
    let extracted = {};
    try {
      // Strip markdown code fences if present
      let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      extracted = { raw: text };
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

    const fields = [];
    if (extracted.denomination) fields.push(`$${extracted.denomination}`);
    if (extracted.seriesYear) fields.push(`Series ${extracted.seriesYear}`);
    if (extracted.serialNumber) fields.push(`S/N: ${extracted.serialNumber}`);

    return Response.json({
      success: true,
      extracted,
      message: fields.length > 0
        ? `Found: ${fields.join(' | ')}. Review and correct if needed.`
        : 'I analyzed the photo. Please review and fill in any missing details.',
    });

  } catch (error) {
    return Response.json({
      error: 'Failed to scan photo: ' + error.message,
    }, { status: 500 });
  }
}
