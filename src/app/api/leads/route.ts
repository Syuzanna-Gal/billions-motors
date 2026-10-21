import { NextResponse } from "next/server";

/*
 * Receives offer / financing / contact requests from the site's forms.
 * For now it validates and logs the lead. Next step: insert into the `leads`
 * table and notify the team on Telegram.
 */

const TYPES = ["OFFER", "FINANCING", "CONTACT"] as const;
const CHANNELS = ["WHATSAPP", "PHONE", "TELEGRAM", "EMAIL"] as const;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lead = {
    type: TYPES.find((t) => t === body.type) ?? "CONTACT",
    name: str(body.name, 120),
    phone: str(body.phone, 30),
    email: str(body.email, 160) || null,
    channel: CHANNELS.find((c) => c === body.channel) ?? "PHONE",
    message: str(body.message, 2000) || null,
    vehicleSlug: str(body.vehicleSlug, 200) || null,
    locale: body.locale === "en" || body.locale === "ru" ? body.locale : "hy",
    consent: body.consent === "on" || body.consent === true,
    createdAt: new Date().toISOString(),
  };

  const errors: string[] = [];
  if (lead.name.length < 2) errors.push("name");
  if (!/^[+0-9 ()-]{6,20}$/.test(lead.phone)) errors.push("phone");
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push("email");
  if (!lead.consent) errors.push("consent");
  if (errors.length) return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });

  // TODO(db): INSERT INTO leads … ; TODO(notify): send to the team's Telegram chat.
  console.info("[lead]", JSON.stringify(lead));

  return NextResponse.json({ ok: true }, { status: 201 });
}
