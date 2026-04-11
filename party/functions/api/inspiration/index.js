import { generateId, nowIso } from '../_auth.js';

function rowToInspiration(row) {
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    photoKey: row.photo_key || '',
    createdAt: row.created_at,
  };
}

/**
 * GET /api/inspiration — list.
 */
export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM inspiration_notes ORDER BY created_at DESC`,
  ).all();
  return Response.json({ items: results.map(rowToInspiration), count: results.length });
}

/**
 * POST /api/inspiration — create. Multipart form with optional `photo` file.
 */
export async function onRequestPost(context) {
  try {
    const id = generateId();
    let title = '';
    let body = '';
    let photoFile = null;

    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'photo' && value instanceof File && value.size > 0) {
          photoFile = value;
        } else if (key === 'title') {
          title = String(value || '');
        } else if (key === 'body') {
          body = String(value || '');
        }
      }
    } else {
      const json = await context.request.json();
      title = json?.title || '';
      body = json?.body || '';
    }

    if (!title.trim() && !body.trim() && !photoFile) {
      return Response.json(
        { error: 'Provide at least a title, body, or photo' },
        { status: 400 },
      );
    }

    let photoKey = '';
    if (photoFile) {
      if (!context.env.PHOTOS) {
        return Response.json(
          { error: 'R2 bucket not bound; cannot upload photos yet. Run deploy.sh to provision.' },
          { status: 500 },
        );
      }
      photoKey = `inspiration/${id}.jpg`;
      const buffer = await photoFile.arrayBuffer();
      await context.env.PHOTOS.put(photoKey, buffer, {
        httpMetadata: { contentType: photoFile.type || 'image/jpeg' },
      });
    }

    const now = nowIso();
    await context.env.DB.prepare(
      `INSERT INTO inspiration_notes (id, title, body, photo_key, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, title.trim(), body.trim(), photoKey, now).run();

    return Response.json({ success: true, id, photoKey }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: 'Failed to create inspiration note: ' + err.message },
      { status: 500 },
    );
  }
}
