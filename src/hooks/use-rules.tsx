"use client";
import * as React from "react";
import { DEFAULT_RULES, type StoreRules } from "@/lib/rules";

const RulesContext = React.createContext<StoreRules>(DEFAULT_RULES);

/** The owner's store rules (Dashboard → Store rules), loaded on the server and shared with every client component. */
export function RulesProvider({ rules, children }: { rules: StoreRules; children: React.ReactNode }) {
  return <RulesContext.Provider value={rules}>{children}</RulesContext.Provider>;
}
export const useRules = () => React.useContext(RulesContext);
