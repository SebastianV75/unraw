import { NextResponse } from "next/server"
import { Webhook } from "svix"

// ============================================================
// Webhook de Resend (eventos de email: delivered, bounced, etc.)
// ------------------------------------------------------------
// Resend firma los webhooks con Svix. Si configuras
// RESEND_WEBHOOK_SECRET, verificamos la firma. Producción requiere
// el secreto; solo en desarrollo se permiten payloads sin firma.
//
// Configúralo en resend.com → Webhooks, apuntando a:
//   https://TU-DOMINIO/api/webhooks/resend
// ============================================================

export async function POST(request) {
  const payload = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 })
  }

  let event
  if (secret) {
    try {
      const wh = new Webhook(secret)
      const headers = {
        "svix-id": request.headers.get("svix-id"),
        "svix-timestamp": request.headers.get("svix-timestamp"),
        "svix-signature": request.headers.get("svix-signature"),
      }
      event = wh.verify(payload, headers)
    } catch (err) {
      console.error("[resend webhook] firma inválida:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } else {
    console.warn(
      "[resend webhook] RESEND_WEBHOOK_SECRET no configurado — aceptando sin verificar (solo dev)."
    )
    try {
      event = JSON.parse(payload)
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
  }

  if (!event || typeof event.type !== "string") {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 })
  }

  // event.type: "email.sent" | "email.delivered" | "email.bounced" | ...
  console.log("[resend webhook]", event.type, event.data?.email_id || "")

  // TODO: persistir el evento si lo necesitas (tabla events / analytics).
  return NextResponse.json({ ok: true })
}
