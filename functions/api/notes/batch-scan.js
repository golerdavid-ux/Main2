/**
 * POST /api/notes/batch-scan
 * Upload a photo containing multiple banknotes and extract details for each.
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

    const prompt = `You are an expert U.S. currency cataloger. This photo contains MULTIPLE U.S. banknotes laid out together. Identify and extract details for EACH individual note visible in the image.

Return ONLY a valid JSON array where each element represents one banknote:
[
  {
    "denomination": "face value as just a number, e.g. 1, 5, 20, 100",
    "seriesYear": "the exact series year, e.g. 2013 or 2017A",
    "noteType": "the type of note, e.g. Federal Reserve Note, Silver Certificate, Gold Certificate, United States Note",
    "serialNumber": "the EXACT full serial number if readable. Include prefix letters, all digits, suffix letter, and star if present.",
    "treasurerSignature": "full name if readable",
    "secretarySignature": "full name if readable",
    "grader": "PMG, PCGS, or CGC if in a slab. Empty string if raw.",
    "grade": "numeric grade from slab label. Empty string if raw.",
    "certNumber": "certification number from slab. Empty string if raw.",
    "errors": [],
    "condition": "brief condition description"
  }
]

IMPORTANT RULES:
- Return one object per banknote visible in the photo
- If a serial number is partially obscured or unreadable, use "" instead of guessing
- Read serial numbers character by character when visible
- If notes are overlapping and details can't be read, still include the note with whatever you CAN see
- The array should have as many objects as there are distinct banknotes visible
- If you can only see 1 note, return an array with 1 object
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
      // Try to find array in response
      try {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          notes = JSON.parse(arrayMatch[0]);
        }
      } catch {
        return Response.json({
          error: 'Could not parse the scan results. Try a clearer photo with bills laid flat.',
        }, { status: 500 });
      }
    }

    // Normalize each note's errors field
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

    return Response.json({
      success: true,
      notes,
      count: notes.length,
      message: `Found ${notes.length} note${notes.length !== 1 ? 's' : ''} in the photo. Review details below.`,
    });

  } catch (error) {
    return Response.json({
      error: 'Failed to batch scan: ' + error.message,
    }, { status: 500 });
  }
}
