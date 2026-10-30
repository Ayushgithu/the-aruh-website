"use client";
import * as React from "react";
import type { Product } from "@/lib/types";
import { useVariant } from "./variant-picker";

type Ctx = ReturnType<typeof useVariant>;
const VariantCtx = React.createContext<Ctx | null>(null);

/** Wraps the product page so the photo gallery and the buy box share the chosen colour / size. */
export function VariantProvider({ product, children }: { product: Product; children: React.ReactNode }) {
  const v = useVariant(product);
  return <VariantCtx.Provider value={v}>{children}</VariantCtx.Provider>;
}
export const useSharedVariant = () => React.useContext(VariantCtx);
