"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  countUsers, endSession, hashPassword, loginBlocked, recordLoginFailure, requireUser, startSession, verifyPassword, type Role,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { locales } from "@/i18n/config";
import {
  addColor, addImages, deleteCar, deleteColor, deleteImage, getCarForEdit, parseCarForm, saveCar, setCover, setRelated, updateColor, updateImage,
  type FieldErrors, type L10n,
} from "@/lib/admin/cars";
import { cancelSale, recordSale, type SaleResult } from "@/lib/admin/sales";
import { createUser, deleteUser, PASSWORD_MIN, setPassword, updateUser, validEmail } from "@/lib/admin/users";
import { LEAD_STATUSES, setLeadStatus, type LeadStatus } from "@/lib/admin/leads";
import { saveSettings, SETTING_KEYS, type Settings, parseMapLocation } from "@/lib/settings";
import { saveImage, UploadError } from "@/lib/media";

/*
 * Every action starts with requireUser(...) — the role check happens on the server,
 * so hiding a button is never the only protection.
 */

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isInteger(n) ? n : NaN;
};
const back = (path: string, msg: string, kind: "ok" | "err" = "ok"): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);

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
  if (loginBlocked(email)) return { error: "Too many attempts. Wait 15 minutes and try again." };

  const db = await getDb();
  const [user] = await db.query<{ id: number; password_hash: string }>("SELECT id, password_hash FROM admin_users WHERE email = $1", [email]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    recordLoginFailure(email);
    return { error: "Wrong email or password." };
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
  if (!validEmail(email)) return { error: "Enter a valid email." };
  if (password.length < PASSWORD_MIN) return { error: `Password must be at least ${PASSWORD_MIN} characters.` };
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
  const vehicleId = int(form, "vehicle_id");
  const quantity = int(form, "quantity") || 1;
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  const priceRaw = str(form, "price_amd").replace(/[\s,]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  if (!Number.isInteger(vehicleId)) return { ok: false, error: "Choose a car." };
  if (quantity < 1 || quantity > 50) return { ok: false, error: "Quantity must be between 1 and 50." };
  if (price !== null && (!Number.isInteger(price) || price <= 0)) return { ok: false, error: "Price must be a whole number in AMD." };

  const result = await recordSale(
    {
      vehicleId, colorId: Number.isInteger(colorId) ? colorId : null, quantity, priceAmd: price,
      customerName: str(form, "customer_name", 120) || null,
      customerPhone: str(form, "customer_phone", 30) || null,
      note: str(form, "note", 500) || null,
    },
    user,
  );
  if (result.ok) {
    refreshSite();
    revalidatePath("/admin/sell");
  }
  return result;
}

export async function cancelSaleAction(form: FormData) {
  const user = await requireUser();
  const error = await cancelSale(int(form, "sale_id"), user);
  if (!error) refreshSite();
  back("/admin/sell", error ?? "Sale undone, stock restored.", error ? "err" : "ok");
}

/* ---------- Cars (Full only) ---------- */

export async function saveCarAction(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("FULL");
  const idRaw = str(form, "id");
  const id = idRaw ? Number(idRaw) : undefined;
  const values = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const { data, errors } = parseCarForm(form);
  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", errors, values };
  const savedId = await saveCar(data, id);
  refreshSite();
  if (!id) redirect(`/admin/cars/${savedId}?ok=${encodeURIComponent("Car created. Now add colours and photos below.")}`);
  return { message: "Saved.", values: { ...values, slug: data.slug } };
}

export async function deleteCarAction(form: FormData) {
  await requireUser("FULL");
  if (form.get("confirm") !== "on") back(`/admin/cars/${int(form, "id")}`, "Tick the box to confirm deleting.", "err");
  await deleteCar(int(form, "id"));
  refreshSite();
  back("/admin/cars", "Car deleted.");
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
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) back("/admin/cars", "Stock must be 0 or more (or empty for not counted).", "err");
  const db = await getDb();
  await db.query("UPDATE vehicles SET stock = $1, updated_at = now() WHERE id = $2", [stock, int(form, "id")]);
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
  if (!validHex(hex) || !names.en) back(`/admin/cars/${id}#colors`, "Colour needs a code and an English name.", "err");
  await addColor(id, colorKind(form), hex, names);
  refreshSite();
  back(`/admin/cars/${id}#colors`, "Colour added.");
}

export async function updateColorAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const hex = str(form, "hex");
  if (!validHex(hex)) back(`/admin/cars/${id}#colors`, "Invalid colour code.", "err");
  await updateColor(id, int(form, "color_id"), colorKind(form), hex, colorNames(form), int(form, "position") || 0);
  refreshSite();
  back(`/admin/cars/${id}#colors`, "Colour saved.");
}

export async function deleteColorAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await deleteColor(id, int(form, "color_id"));
  refreshSite();
  back(`/admin/cars/${id}#colors`, "Colour and its photos removed.");
}

export async function uploadPhotosAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  const kind = str(form, "kind") === "INTERIOR" ? "INTERIOR" : "EXTERIOR";
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) back(`/admin/cars/${id}#photos`, "Choose at least one photo.", "err");
  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveImage(file, `vehicles/${id}`));
  } catch (err) {
    if (err instanceof UploadError) back(`/admin/cars/${id}#photos`, err.message, "err");
    throw err;
  }
  await addImages(id, colorId, kind, urls);
  refreshSite();
  back(`/admin/cars/${id}#photos`, `${urls.length} photo${urls.length > 1 ? "s" : ""} uploaded.`);
}

export async function updatePhotoAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const colorId = str(form, "color_id") ? int(form, "color_id") : null;
  await updateImage(id, int(form, "image_id"), colorId, str(form, "kind") === "INTERIOR" ? "INTERIOR" : "EXTERIOR", int(form, "position") || 0);
  refreshSite();
  back(`/admin/cars/${id}#photos`, "Photo saved.");
}

export async function setCoverAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await setCover(id, int(form, "image_id"));
  refreshSite();
  back(`/admin/cars/${id}#photos`, "Cover photo set.");
}

export async function deletePhotoAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  await deleteImage(id, int(form, "image_id"));
  refreshSite();
  back(`/admin/cars/${id}#photos`, "Photo deleted.");
}

export async function saveRelatedAction(form: FormData) {
  await requireUser("FULL");
  const id = int(form, "vehicle_id");
  const ids = form.getAll("related").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n !== id);
  if (ids.length > 6) back(`/admin/cars/${id}#related`, "Choose up to 6 cars.", "err");
  if (!(await getCarForEdit(id))) back("/admin/cars", "Car not found.", "err");
  await setRelated(id, ids);
  refreshSite();
  back(`/admin/cars/${id}#related`, ids.length ? "“You may also like” saved." : "Back to automatic suggestions (same body type).");
}

/* ---------- Contact info (Full only) ---------- */

export async function saveSettingsAction(form: FormData) {
  await requireUser("FULL");
  const values: Partial<Settings> = {};
  for (const key of SETTING_KEYS) values[key] = str(form, key, 500);
  for (const k of ["instagram", "facebook", "map_url"] as const) {
    if (values[k] && !/^https:\/\//.test(values[k]!)) back("/admin/contact", `${k} must start with https://`, "err");
  }
  if (values.email && !validEmail(values.email)) back("/admin/contact", "Email doesn't look right.", "err");
  if (values.map_location && !parseMapLocation(values.map_location)) {
    back("/admin/contact", "Couldn't find coordinates in the map location. In Google Maps right-click the showroom and click the numbers (e.g. 40.2231, 44.5315), then paste them here.", "err");
  }
  await saveSettings(values);
  refreshSite();
  back("/admin/contact", "Contact info saved. It's live on the site.");
}

/* ---------- Users (Full only) ---------- */

const role = (f: FormData): Role => (str(f, "role") === "FULL" ? "FULL" : "SALES");

export async function createUserAction(form: FormData) {
  await requireUser("FULL");
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!validEmail(email)) back("/admin/users", "Enter a valid email.", "err");
  if (password.length < PASSWORD_MIN) back("/admin/users", `Password must be at least ${PASSWORD_MIN} characters.`, "err");
  const error = await createUser(email, str(form, "name", 80), role(form), password);
  back("/admin/users", error ?? `User ${email} added.`, error ? "err" : "ok");
}

export async function updateUserAction(form: FormData) {
  await requireUser("FULL");
  const error = await updateUser(int(form, "id"), str(form, "name", 80), role(form));
  back("/admin/users", error ?? "User saved.", error ? "err" : "ok");
}

export async function resetPasswordAction(form: FormData) {
  await requireUser("FULL");
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) back("/admin/users", `Password must be at least ${PASSWORD_MIN} characters.`, "err");
  await setPassword(int(form, "id"), password);
  back("/admin/users", "Password changed. That user is logged out everywhere.");
}

export async function deleteUserAction(form: FormData) {
  const me = await requireUser("FULL");
  const id = int(form, "id");
  if (id === me.id) back("/admin/users", "You can't delete yourself.", "err");
  const error = await deleteUser(id);
  back("/admin/users", error ?? "User deleted.", error ? "err" : "ok");
}

/* ---------- Leads (Full only) ---------- */

export async function setLeadStatusAction(form: FormData) {
  await requireUser("FULL");
  const status = str(form, "status") as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) back("/admin/leads", "Unknown status.", "err");
  await setLeadStatus(int(form, "id"), status);
  revalidatePath("/admin/leads");
}
