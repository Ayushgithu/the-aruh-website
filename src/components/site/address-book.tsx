"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Home, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { SavedAddress } from "@/lib/types";
import { INDIAN_STATES, savedAddressSchema } from "@/lib/validation";
import { postJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

type Values = z.input<typeof savedAddressSchema>;
const LABELS = ["Home", "Work", "Other"];

export function AddressForm({ initial, onSaved, onCancel }: { initial?: SavedAddress; onSaved: (list: SavedAddress[]) => void; onCancel: () => void }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: { label: initial?.label ?? "Home", name: initial?.name ?? "", phone: initial?.phone ?? "", line1: initial?.line1 ?? "", line2: initial?.line2 ?? "", city: initial?.city ?? "", state: initial?.state ?? "", pincode: initial?.pincode ?? "", isDefault: initial?.isDefault ?? false },
  });
  const label = watch("label");
  const submit = async (v: Values) => {
    try {
      const { addresses } = await postJson<{ addresses: SavedAddress[] }>(initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses", v, initial ? "PUT" : "POST");
      toast.success(initial ? "Address updated" : "Address saved");
      onSaved(addresses);
    } catch (e) { toast.error("Could not save the address", { description: e instanceof Error ? e.message : "Please try again." }); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-ink">Save as</p>
        <div className="flex flex-wrap gap-2">{LABELS.map((l) => <button key={l} type="button" aria-pressed={label === l} onClick={() => setValue("label", l)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${label === l ? "border-ink bg-ink text-card" : "border-line text-ink hover:border-ink"}`}>{l}</button>)}</div>
      </div>
      <Field label="Receiver's name" error={errors.name?.message}><Input autoComplete="name" {...register("name")} /></Field>
      <Field label="Mobile number" error={errors.phone?.message}><Input type="tel" inputMode="tel" {...register("phone")} /></Field>
      <Field label="House / flat, street" error={errors.line1?.message} className="sm:col-span-2"><Input {...register("line1")} /></Field>
      <Field label="Landmark / area (optional)" className="sm:col-span-2"><Input {...register("line2")} /></Field>
      <Field label="City" error={errors.city?.message}><Input {...register("city")} /></Field>
      <Field label="State" error={errors.state?.message}><Select {...register("state")}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
      <Field label="Pincode" error={errors.pincode?.message}><Input inputMode="numeric" maxLength={6} {...register("pincode")} /></Field>
      <label className="flex items-center gap-2.5 self-end pb-2 text-sm font-medium text-ink"><input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" {...register("isDefault")} /> Make this my default address</label>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save address</Button>
      </div>
    </form>
  );
}

export function AddressBook({ initial }: { initial: SavedAddress[] }) {
  const [list, setList] = React.useState(initial);
  const [editing, setEditing] = React.useState<SavedAddress | "new" | null>(null);
  const remove = async (a: SavedAddress) => {
    try { setList((await postJson<{ addresses: SavedAddress[] }>(`/api/account/addresses/${a.id}`, {}, "DELETE")).addresses); toast.success("Address removed"); }
    catch (e) { toast.error("Could not remove it", { description: e instanceof Error ? e.message : "Please try again." }); }
  };
  if (editing) return <AddressForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onSaved={(l) => { setList(l); setEditing(null); }} />;
  return (
    <div className="space-y-4">
      {list.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><MapPin className="h-8 w-8" /></span>
          <h2 className="mt-5 text-xl">No saved addresses yet</h2>
          <p className="mt-2 text-sm">Save your home and work address once, and check out faster next time.</p>
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold text-ink"><Home className="h-4 w-4 text-primary" /> {a.label}{a.isDefault && <span className="rounded-full bg-primary-faint px-2 py-0.5 text-[11px] font-bold text-primary">Default</span>}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Edit ${a.label} address`} onClick={() => setEditing(a)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${a.label} address`} onClick={() => void remove(a)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <address className="mt-3 text-sm not-italic leading-relaxed"><strong className="text-ink">{a.name}</strong><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />Phone: {a.phone}</address>
          </li>
        ))}
      </ul>
      {list.length < 8 && <Button onClick={() => setEditing("new")} className="rounded-full"><Plus className="h-4 w-4" /> Add new address</Button>}
    </div>
  );
}
