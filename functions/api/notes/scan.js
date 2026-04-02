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

    const frontPrompt = `You are a world-class U.S. currency expert and numismatist analyzing a photo of the FRONT (obverse) of a U.S. banknote. You have deep knowledge of ALL types of U.S. paper currency from the 1860s to present day.

This note could be ANY type of U.S. currency including:
- Modern small-size notes (1929-present): Federal Reserve Notes, Silver Certificates, United States Notes
- Large-size notes (1861-1928): Legal Tender Notes, Silver Certificates, Gold Certificates, Treasury Notes, National Bank Notes, Federal Reserve Bank Notes, Compound Interest Treasury Notes, Demand Notes
- Fractional Currency (1862-1876)
- Military Payment Certificates
- National Gold Bank Notes
- Interest Bearing Notes

IMPORTANT: Older and rare notes have VERY different layouts than modern bills. Look carefully:
- The denomination may be spelled out in words or shown in Roman numerals
- The serial number format varies by era (may be shorter, different letter patterns, or in unusual locations)
- The note type is usually printed prominently (e.g. "SILVER CERTIFICATE", "GOLD CERTIFICATE", "NATIONAL CURRENCY", "UNITED STATES NOTE")
- Signatures on older notes may be hand-signed or different officials (Register of the Treasury, etc.)
- Look for bank names on National Bank Notes (e.g. "First National Bank of...")
- Look for charter numbers on National Bank Notes

Read ALL text on the note carefully, including ornate/decorative text. Do not skip text because it's in an unusual font or layout.

Return ONLY a valid JSON object with these fields (use empty string "" if you cannot determine a field):
{
  "denomination": "the face value as just a number, e.g. 1, 2, 5, 10, 20, 50, 100, 500, 1000, 5000, 10000",
  "seriesYear": "the series year if printed. Older notes may say 'Series of 1899' or just '1899'. Extract just the year/letter, e.g. 1899, 1928A, 2017A",
  "noteType": "the type of note printed on the bill. Read it exactly. Examples: Federal Reserve Note, Silver Certificate, Gold Certificate, United States Note, Legal Tender, National Currency, National Bank Note, Treasury Note, Federal Reserve Bank Note, Demand Note, Fractional Currency, Military Payment Certificate",
  "serialNumber": "the EXACT full serial number including all letters, digits, and star symbol if present. Read every character carefully. Older notes may have shorter serials or different formats.",
  "treasurerSignature": "the name of the Treasurer (or Register of the Treasury on older notes) if readable",
  "secretarySignature": "the name of the Secretary of the Treasury if readable",
  "grader": "the grading company if in a slab: PMG, PCGS, or CGC. Empty string if raw/ungraded.",
  "grade": "the numeric grade and any qualifiers from the slab label, e.g. 66 EPQ, 58 PPQ, 65 Star. Empty string if raw.",
  "certNumber": "the certification/serial number on the grading label. Empty string if raw.",
  "gradingComments": "any additional text on the grading label like note description. Empty string if none.",
  "bankName": "for National Bank Notes only: the full name of the issuing bank. Empty string if not applicable.",
  "errors": [],
  "condition": "brief description of the note's physical condition (e.g. Crisp Uncirculated, About Uncirculated, Very Fine, Fine, Very Good, Good, Poor)",
  "estimatedValue": "your best estimate of the note's current market value as a number (no $ sign). Consider denomination, series year, note type, condition, rarity, star note status, fancy serial patterns, errors, and grading. Rare types like Gold Certificates, large-size notes, and National Bank Notes can be worth hundreds to thousands even in lower grades. Return just the number, e.g. 1.50 or 250 or 5000."
}

IMPORTANT: Read the serial number character by character. Include all prefix letters, digits, and suffix letters. If there is a star (*) symbol, include it.

If the note is in a grading holder/slab, read the label carefully to extract grader, grade, and certification number.

If text is hard to read due to age, wear, or ornate fonts, make your best effort rather than returning empty strings. Use your numismatic knowledge to fill in what you can identify from the visual design, color of the seal, portrait, and other identifying features even if text is partially obscured.

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
            maxOutputTokens: 2048,
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

    const usage = geminiData.usageMetadata || {};

    const fields = [];
    if (extracted.denomination) fields.push(`$${extracted.denomination}`);
    if (extracted.seriesYear) fields.push(`Series ${extracted.seriesYear}`);
    if (extracted.serialNumber) fields.push(`S/N: ${extracted.serialNumber}`);

    const tokenInfo = `${usage.totalTokenCount || '?'} tokens (${usage.promptTokenCount || '?'} in / ${usage.candidatesTokenCount || '?'} out)`;

    return Response.json({
      success: true,
      extracted,
      tokens: {
        prompt: usage.promptTokenCount || 0,
        completion: usage.candidatesTokenCount || 0,
        total: usage.totalTokenCount || 0,
      },
      message: fields.length > 0
        ? `Found: ${fields.join(' | ')}. ${tokenInfo}`
        : `Analyzed photo. ${tokenInfo}. Review and fill in any missing details.`,
    });

  } catch (error) {
    return Response.json({
      error: 'Failed to scan photo: ' + error.message,
    }, { status: 500 });
  }
}
