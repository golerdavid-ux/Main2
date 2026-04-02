export async function onRequestGet() {
  return Response.json({ status: 'ok', message: 'Money Book API is running' });
}
