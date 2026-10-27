"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  countUsers, endSession, getCurrentUser, hashPassword, loginBlocked, recordLoginFailure, requireUser, startSession, verifyPassword, type Role,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { locales } from "@/i18n/config";
import {
  addColor, addImages, deleteCar, deleteColor, deleteImage, getCarForEdit, parseCarForm, saveCar, saveColorStock, setCover, setRelated,
  updateColor, updateImage,
  type FieldErrors, type L10n,
} from "@/lib/admin/cars";
import { cancelSale, recordSale, type SaleResult } from "@/lib/admin/sales";
import { createUser, deleteUser, PASSWORD_MIN, setPassword, updateUser, validEmail } from "@/lib/admin/users";
import { LEAD_STATUSES, setLeadStatus, type LeadStatus } from "@/lib/admin/leads";
import { saveSectionTexts, sectionBySlug } from "@/lib/admin/texts";
import { saveSettings, SETTING_KEYS, type Settings, parseMapLocation } from "@/lib/settings";
import { saveImage, UploadError } from "@/lib/media";
import { interpolate } from "@/lib/format";
import { parseStockGrid } from "@/lib/colour-stock";
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, adminT } from "@/lib/admin/lang";
import { isAdminLang } from "@/lib/admin/i18n";

/*
 * Every action starts with requireUser(...) — the role check happens on the server,
 * so hiding a button is never the only protection.
 */

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isInteger(n) ? n : NaN;
};
/** Redirects with a message (?ok= / ?err=). The message goes before any #section, or the page wouldn't see it. */
const back = (path: string, msg: string, kind: "ok" | "err" = "ok"): never => {
  const [base, hash] = path.split("#");
  return redirect(`${base}${base.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}${hash ? `#${hash}` : ""}`);
};

/** Car pages on the public site are rendered per request; this clears any router cache too. */
function refreshSite() {
  revalidatePath("/", "layout");
}

/* ---------- Login ---------- */

/** `values` echoes what was typed, so the form shows it again after React resets it on submit. */
export type FormState = { error?: string; message?: string; errors?: FieldErrors; values?: Record<string, string> } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const t = await adminT();
  if (loginBlocked(email)) return { error: t.auth.tooMany };

  const db = await getDb();
  const [user] = await db.query<{ id: number; password_hash: string }>("SELECT id, password_hash FROM admin_users WHERE email = $1", [email]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    recordLoginFailure(email);
    return { error: t.auth.wrong };
  }
  await startSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/** Creates the first Full user. Only works while there are no users at all. */
export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  if ((await countUsers()) > 0) redirect("/admin/login");
  const email = str(form, "email").toLowerCase();
  const name = str(form, "name", 80);
  const password = String(form.get("password") ?? "");
  const t = await adminT();
  if (!validEmail(email)) return { error: t.auth.invalidEmail };
  if (password.length < PASSWORD_MIN) return { error: interpolate(t.auth.passwordShort, { min: PASSWORD_MIN }) };
  const db = await getDb();
  const [{ id }] = await db.query<{ id: number }>(
    "INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, 'FULL', $3) RETURNING id",
    [email, name || null, await hashPassword(password)],
  );
  await startSession(id);
  redirect("/admin");
}

/* ---------- Sales ---------- */

export async function sellAction(_: SaleResult | undefined, form: FormData): Promise<SaleResult> {
  const user = await requireUser();
  const t = (await adminT()).sell;
  const vehicleId = int(form, "vehicle_id");
  const quantity = int(form, "quantity") || 1;
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  const interiorId = str(form, "interior_id") ? int(form, "interior_id") : null;
  const priceRaw = str(form, "price_amd").replace(/[\s,]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  if (!Number.isInteger(vehicleId)) return { ok: false, error: t.chooseCar };
  if (quantity < 1 || quantity > 50) return { ok: false, error: t.quantityRange };
  if (price !== null && (!Number.isInteger(price) || price <= 0)) return { ok: false, error: t.priceWhole };

  const result = await recordSale(
    {
      vehicleId, colorId: Number.isInteger(colorId) ? colorId : null,
      interiorId: Number.isInteger(interiorId) ? interiorId : null, quantity, priceAmd: price,
      customerName: str(form, "customer_name", 120) || null,
      customerPhone: str(form, "customer_phone", 30) || null,
      note: str(form, "note", 500) || null,
    },
    user,
    t,
  );
  if (result.ok) {
    refreshSite();
    revalidatePath("/admin/sell");
  }
  return result;
}

export async function cancelSaleAction(form: FormData) {
  const user = await requireUser();
  const t = (await adminT()).sell;
  const error = await cancelSale(int(form, "sale_id"), user, t);
  if (!error) refreshSite();
  back("/admin/sell", error ?? t.undoneOk, error ? "err" : "ok");
}

/* ---------- Cars (Full only) ---------- */

export async function saveCarAction(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("FULL");
  const idRaw = str(form, "id");
  const id = idRaw ? Number(idRaw) : undefined;
  const values = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const t = (await adminT()).carForm;
  const { data, errors } = parseCarForm(form, t.errors);
  if (Object.keys(errors).length) return { error: t.fix, errors, values };
  const savedId = await saveCar(data, id);
  refreshSite();
  if (!id) redirect(`/admin/cars/${savedId}?ok=${encodeURIComponent(t.created)}`);
  return { message: t.saved, values: { ...values, slug: data.slug } };
}

export async function deleteCarAction(form: FormData) {
  await requireUser("FULL");
  const t = (await adminT()).carEdit;
  if (form.get("confirm") !== "on") back(`/admin/cars/${int(form, "id")}`, t.deleteTick, "err");
  await deleteCar(int(form, "id"));
  refreshSite();
  back("/admin/cars", t.carDeleted);
}

export async function togglePublishedAction(form: FormData) {
  await requireUser("FULL");
  const db = await getDb();
  await db.query("UPDATE vehicles SET published = NOT published, updated_at = now() WHERE id = $1", [int(form, "id")]);
  refreshSite();
  revalidatePath("/admin/cars");
}

export async function setStockAction(form: FormData) {
  await requireUser("FULL");
  const stock = str(form, "stock") === "" ? null : int(form, "stock");
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) back("/admin/cars", (await adminT()).cars.stockInvalid, "err");
  const db = await getDb();
  // Counted by colour: the total comes from the colours (set on the car's page).
  const [row] = await db.query<{ by_colour: boolean }>(
    `UPDATE vehicles SET stock = $1, updated_at = now()
     WHERE id = $2 AND NOT EXISTS (SELECT 1 FROM vehicle_color_stock s WHERE s.vehicle_id = $2)
     RETURNING false AS by_colour`,
    [stock, int(form, "id")],
  );
  if (!row) back("/admin/cars", (await adminT()).cars.stockByColour, "err");
  refreshSite();
  revalidatePath("/admin/cars");
}

const colorNames = (form: FormData): L10n => Object.fromEntries(locales.map((l) => [l, str(form, `name_${l}`, 60)])) as L10n;
const validHex = (h: string) => /^#[0-9a-f]{6}$/i.test(h);
const colorKind = (form: FormData) => (str(form, "kind") === "INTERIOR" ? "INTERIOR" : "EXTERIOR");

export async function addColorAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const hex = str(form, "hex");
  const names = colorNames(form);
  const t = (await adminT()).carEdit;
  if (!validHex(hex) || !names.en) back(`/admin/cars/${id}#colors`, t.colourNeeds, "err");
  await addColor(id, colorKind(form), hex, names);
  refreshSite();
  back(`/admin/cars/${id}#colors`, t.colourAdded);
}

export async function updateColorAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const hex = str(form, "hex");
  const t = (await adminT()).carEdit;
  if (!validHex(hex)) back(`/admin/cars/${id}#colors`, t.colourInvalid, "err");
  await updateColor(id, int(form, "color_id"), colorKind(form), hex, colorNames(form), int(form, "position") || 0);
  refreshSite();
  back(`/admin/cars/${id}#colors`, t.colourSaved);
}

export async function deleteColorAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await deleteColor(id, int(form, "color_id"));
  refreshSite();
  back(`/admin/cars/${id}#colors`, (await adminT()).carEdit.colourDeleted);
}

export async function saveColorStockAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const t = (await adminT()).carEdit;
  const car = await getCarForEdit(id);
  if (!car) back("/admin/cars", t.carNotFound, "err");
  const ids = (kind: string) => car!.colors.filter((c) => c.kind === kind).map((c) => c.id);
  const grid = parseStockGrid((name) => (form.get(name) as string | null), ids("EXTERIOR"), ids("INTERIOR"));
  if (grid.mode === "error") back(`/admin/cars/${id}#stock`, t.stockBad, "err");
  const total = await saveColorStock(id, grid.mode === "save" ? grid.cells : null);
  refreshSite();
  back(`/admin/cars/${id}#stock`, total === null
    ? interpolate(t.stockCleared, { count: car!.stock ?? 0 })
    : interpolate(t.stockSaved, { count: total }));
}

export async function uploadPhotosAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  const kind = str(form, "kind") === "INTERIOR" ? "INTERIOR" : "EXTERIOR";
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const t = (await adminT()).carEdit;
  if (!files.length) back(`/admin/cars/${id}#photos`, t.choosePhoto, "err");
  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveImage(file, `vehicles/${id}`, { type: t.uploadType, size: t.uploadSize }));
  } catch (err) {
    if (err instanceof UploadError) back(`/admin/cars/${id}#photos`, err.message, "err");
    throw err;
  }
  await addImages(id, colorId, kind, urls);
  refreshSite();
  back(`/admin/cars/${id}#photos`, interpolate(t.photosUploaded, { count: urls.length }));
}

export async function updatePhotoAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  await updateImage(id, int(form, "image_id"), colorId, str(form, "kind") === "INTERIOR" ? "INTERIOR" : "EXTERIOR", int(form, "position") || 0);
  refreshSite();
  back(`/admin/cars/${id}#photos`, (await adminT()).carEdit.photoSaved);
}

export async function setCoverAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await setCover(id, int(form, "image_id"));
  refreshSite();
  back(`/admin/cars/${id}#photos`, (await adminT()).carEdit.coverSet);
}

export async function deletePhotoAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await deleteImage(id, int(form, "image_id"));
  refreshSite();
  back(`/admin/cars/${id}#photos`, (await adminT()).carEdit.photoDeleted);
}

export async function saveRelatedAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const ids = form.getAll("related").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n !== id);
  const t = (await adminT()).carEdit;
  if (ids.length > 6) back(`/admin/cars/${id}#related`, t.relatedMax, "err");
  if (!(await getCarForEdit(id))) back("/admin/cars", t.carNotFound, "err");
  await setRelated(id, ids);
  refreshSite();
  back(`/admin/cars/${id}#related`, ids.length ? t.relatedSaved : t.relatedAuto);
}

/* ---------- Contact info (Full only) ---------- */

export async function saveSettingsAction(form: FormData) {
  await requireUser("FULL");
  const values: Partial<Settings> = {};
  for (const key of SETTING_KEYS) values[key] = str(form, key, 500);
  const t = (await adminT()).contact;
  const fieldNames = { instagram: t.instagram, facebook: t.facebook, map_url: t.mapUrl };
  for (const k of ["instagram", "facebook", "map_url"] as const) {
    if (values[k] && !/^https:\/\//.test(values[k]!)) back("/admin/contact", interpolate(t.mustHttps, { field: fieldNames[k] }), "err");
  }
  if (values.email && !validEmail(values.email)) back("/admin/contact", t.badEmail, "err");
  if (values.map_location && !parseMapLocation(values.map_location)) back("/admin/contact", t.badMap, "err");
  await saveSettings(values);
  refreshSite();
  back("/admin/contact", t.saved);
}

/* ---------- Users (Full only) ---------- */

const role = (f: FormData): Role => (str(f, "role") === "FULL" ? "FULL" : "SALES");

export async function createUserAction(form: FormData) {
  await requireUser("FULL");
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const t = await adminT();
  if (!validEmail(email)) back("/admin/users", t.auth.invalidEmail, "err");
  if (password.length < PASSWORD_MIN) back("/admin/users", interpolate(t.auth.passwordShort, { min: PASSWORD_MIN }), "err");
  const error = await createUser(email, str(form, "name", 80), role(form), password, t.users);
  back("/admin/users", error ?? interpolate(t.users.added, { email }), error ? "err" : "ok");
}

export async function updateUserAction(form: FormData) {
  await requireUser("FULL");
  const t = (await adminT()).users;
  const error = await updateUser(int(form, "id"), str(form, "name", 80), role(form), t);
  back("/admin/users", error ?? t.saved, error ? "err" : "ok");
}

export async function resetPasswordAction(form: FormData) {
  await requireUser("FULL");
  const password = String(form.get("password") ?? "");
  const t = await adminT();
  if (password.length < PASSWORD_MIN) back("/admin/users", interpolate(t.auth.passwordShort, { min: PASSWORD_MIN }), "err");
  await setPassword(int(form, "id"), password);
  back("/admin/users", t.users.passwordChanged);
}

export async function deleteUserAction(form: FormData) {
  const me = await requireUser("FULL");
  const id = int(form, "id");
  const t = (await adminT()).users;
  if (id === me.id) back("/admin/users", t.cantDeleteSelf, "err");
  const error = await deleteUser(id, t);
  back("/admin/users", error ?? t.deleted, error ? "err" : "ok");
}

/* ---------- Leads (Full only) ---------- */

export async function setLeadStatusAction(form: FormData) {
  await requireUser("FULL");
  const status = str(form, "status") as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) back("/admin/leads", (await adminT()).leads.unknownStatus, "err");
  await setLeadStatus(int(form, "id"), status);
  revalidatePath("/admin/leads");
}

/* ---------- Site texts (Full only) ---------- */

export type TextsState = { message?: string; error?: string; errors?: Record<string, string> } | undefined;

export async function saveTextsAction(_: TextsState, form: FormData): Promise<TextsState> {
  const user = await requireUser("FULL");
  const t = (await adminT()).texts;
  const section = sectionBySlug(str(form, "section"));
  if (!section) return { error: t.unknownSection };
  const { saved, errors } = await saveSectionTexts(section, form, user.name || user.email, t);
  if (Object.keys(errors).length) return { error: t.fix, errors };
  refreshSite();
  revalidatePath("/admin/texts");
  return { message: saved ? t.saved : t.savedDefaults };
}

/* ---------- Admin language ---------- */

/** Switches the admin panel language: saved on the user's account and in this browser. */
export async function setAdminLangAction(form: FormData) {
  const lang = str(form, "lang");
  if (!isAdminLang(lang)) return;
  (await cookies()).set(ADMIN_LANG_COOKIE, lang, { path: "/admin", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  const user = await getCurrentUser();
  if (user) {
    const db = await getDb();
    await db.query("UPDATE admin_users SET lang = $1 WHERE id = $2", [lang, user.id]);
  }
  revalidatePath("/admin", "layout");
}
