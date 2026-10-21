import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

/*
 * Receives offer / financing / contact requests from the site's forms,
 * validates them and saves them to the `leads` table.
 * Next step: notify the team on Telegram.
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
    locale: (body.locale === "en" || body.locale === "ru" ? body.locale : "hy") as "hy" | "en" | "ru",
    consent: body.consent === "on" || body.consent === true,
    extra: isPlainObject(body.extra) ? body.extra : null,
  };

  const errors: string[] = [];
  if (lead.name.length < 2) errors.push("name");
  if (!/^[+0-9 ()-]{6,20}$/.test(lead.phone)) errors.push("phone");
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push("email");
  if (!lead.consent) errors.push("consent");
  if (errors.length) return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });

  try {
    const id = await createLead(lead);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error("[lead] could not save", err);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && JSON.stringify(v).length < 2000;
}
