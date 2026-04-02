/**
 * POST /api/notes/sync-sheets
 * Sync the entire Money Book collection to a Google Sheet.
 *
 * Requires environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL - service account email
 *   GOOGLE_PRIVATE_KEY - service account private key (PEM format)
 *   GOOGLE_SHEET_ID - the spreadsheet ID from the Google Sheet URL
 */

async function getAccessToken(email, privateKey) {
  // Create JWT for Google OAuth2
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));

  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  // Import the private key — handle literal \n from env vars
  const pemBody = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const toSign = new TextEncoder().encode(`${header}.${claim}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, toSign);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${claim}.${sig}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function onRequestPost(context) {
  try {
    const email = context.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = context.env.GOOGLE_PRIVATE_KEY;
    const sheetId = context.env.GOOGLE_SHEET_ID;

    if (!email || !privateKey || !sheetId) {
      return Response.json({
        error: 'Google Sheets not configured. Add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in your Pages environment variables.',
      }, { status: 400 });
    }

    // Get all notes from D1
    const { results } = await context.env.DB.prepare('SELECT * FROM notes ORDER BY date_added DESC').all();

    const parseJSON = (str) => {
      try { return JSON.parse(str || '[]'); } catch { return []; }
    };

    // Determine the site URL from the request
    const siteUrl = new URL(context.request.url).origin;

    // Build rows: header + data
    const headers = [
      'Photo (Front)', 'Photo (Back)',
      'Denomination', 'Series Year', 'Serial Number',
      'Friedberg #', 'Star Note', 'Fancy Serials', 'Errors',
      'Treasurer', 'Secretary',
      'Grade', 'Grader', 'Cert #', 'Grading Comments',
      'Estimated Value', 'Cost Paid', 'Flags', 'Notes', 'Date Added',
    ];

    const rows = results.map(r => [
      r.photo_front_key ? `=IMAGE("${siteUrl}/api/photos/${r.photo_front_key.replace('notes/', '')}", 1)` : '',
      r.photo_back_key ? `=IMAGE("${siteUrl}/api/photos/${r.photo_back_key.replace('notes/', '')}", 1)` : '',
      `$${r.denomination}`,
      r.series_year,
      r.serial_number,
      r.friedberg_number,
      r.is_star_note ? 'Yes' : 'No',
      parseJSON(r.fancy_serials).join(', '),
      parseJSON(r.errors).join(', '),
      r.treasurer_signature,
      r.secretary_signature,
      r.grade,
      r.grader,
      r.cert_number,
      r.grading_comments,
      r.estimated_value ? `$${r.estimated_value}` : '',
      r.cost_paid ? `$${r.cost_paid}` : '',
      parseJSON(r.flags).join(', '),
      r.user_notes,
      r.date_added,
    ]);

    const values = [headers, ...rows];

    // Get OAuth2 access token
    const accessToken = await getAccessToken(email, privateKey);

    // Clear the sheet first
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:U:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // Write the data
    const writeResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    const writeResult = await writeResponse.json();

    if (writeResponse.ok) {
      return Response.json({
        success: true,
        message: `Synced ${results.length} notes to your Google Sheet!`,
        updatedCells: writeResult.updatedCells,
      });
    } else {
      return Response.json({
        error: 'Failed to write to Google Sheet: ' + (writeResult.error?.message || JSON.stringify(writeResult)),
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({
      error: 'Failed to sync to Google Sheets: ' + error.message,
    }, { status: 500 });
  }
}
