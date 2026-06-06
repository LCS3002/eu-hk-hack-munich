export async function GET() {
  return Response.json({
    ok: true,
    service: 'Harbour backend',
    timestamp: new Date().toISOString(),
  })
}
