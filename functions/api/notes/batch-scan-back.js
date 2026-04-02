/**
 * POST /api/notes/batch-scan-back
 * Upload a photo of the BACKS of multiple banknotes and extract error/condition details.
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

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const file = formData.get('photo');
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

    const prompt = `You are an expert U.S. currency cataloger analyzing a photo of the BACKS (reverse) of multiple U.S. banknotes laid out together. Extract details visible from each note's back.

Return ONLY a valid JSON array where each element represents one banknote's back:
[
  {
    "denomination": "face value as just a number if visible from the back",
    "errors": [],
    "condition": "brief condition description from the back (e.g. Crisp Uncirculated, About Uncirculated, Very Fine, Fine, Very Good, Good, Poor)"
  }
]

IMPORTANT RULES:
- Return one object per banknote visible in the photo, in LEFT-TO-RIGHT, TOP-TO-BOTTOM order (same as how fronts would be laid out)
- Look for any printing errors like miscuts, misalignment, ink smears, inverted back, gutter folds, offset printing, board breaks
- If you can see the denomination from the back design, include it
- Assess the physical condition from what you can see
- Return ONLY the JSON array, no other text`;

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
            maxOutputTokens: 4096,
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

    let notes = [];
    try {
      let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      notes = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      try {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          notes = JSON.parse(arrayMatch[0]);
        }
      } catch {
        return Response.json({
          error: 'Could not parse the back scan results. Try a clearer photo.',
        }, { status: 500 });
      }
    }

    // Normalize errors
    notes = notes.map(note => {
      if (typeof note.errors === 'string') {
        if (!note.errors || note.errors === '[]' || note.errors.toLowerCase() === 'none') {
          note.errors = [];
        } else {
          note.errors = [note.errors];
        }
      }
      if (!Array.isArray(note.errors)) note.errors = [];
      return note;
    });

    const usage = geminiData.usageMetadata || {};
    const tokenInfo = `${usage.totalTokenCount || '?'} tokens (${usage.promptTokenCount || '?'} in / ${usage.candidatesTokenCount || '?'} out)`;

    return Response.json({
      success: true,
      notes,
      count: notes.length,
      tokens: {
        prompt: usage.promptTokenCount || 0,
        completion: usage.candidatesTokenCount || 0,
        total: usage.totalTokenCount || 0,
      },
      message: `Scanned backs of ${notes.length} note${notes.length !== 1 ? 's' : ''}. ${tokenInfo}`,
    });

  } catch (error) {
    return Response.json({
      error: 'Failed to batch scan backs: ' + error.message,
    }, { status: 500 });
  }
}
