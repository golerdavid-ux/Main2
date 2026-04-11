function rowToInspiration(row) {
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    photoKey: row.photo_key || '',
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT * FROM inspiration_notes WHERE id = ?')
    .bind(context.params.id).first();
  if (!row) return Response.json({ error: 'Inspiration note not found' }, { status: 404 });
  return Response.json(rowToInspiration(row));
}

/**
 * PUT /api/inspiration/:id — update. Multipart form with optional new `photo` file.
 * If a new photo is uploaded, it replaces the previous one in R2.
 */
export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM inspiration_notes WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Inspiration note not found' }, { status: 404 });

    let title = existing.title;
    let body = existing.body;
    let photoFile = null;
    let clearPhoto = false;

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
        } else if (key === 'clearPhoto' && String(value) === 'true') {
          clearPhoto = true;
        }
      }
    } else {
      const json = await context.request.json();
      if (json.title !== undefined) title = json.title || '';
      if (json.body !== undefined) body = json.body || '';
      if (json.clearPhoto === true) clearPhoto = true;
    }

    let photoKey = existing.photo_key || '';
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
    } else if (clearPhoto && photoKey) {
      if (context.env.PHOTOS) {
        try { await context.env.PHOTOS.delete(photoKey); } catch {}
      }
      photoKey = '';
    }

    await context.env.DB.prepare(
      `UPDATE inspiration_notes SET title=?, body=?, photo_key=? WHERE id=?`,
    ).bind(title.trim(), body.trim(), photoKey, id).run();

    return Response.json({ success: true, photoKey });
  } catch (err) {
    return Response.json(
      { error: 'Failed to update inspiration note: ' + err.message },
      { status: 500 },
    );
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT * FROM inspiration_notes WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Inspiration note not found' }, { status: 404 });

  if (existing.photo_key && context.env.PHOTOS) {
    try { await context.env.PHOTOS.delete(existing.photo_key); } catch {}
  }
  await context.env.DB.prepare('DELETE FROM inspiration_notes WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
