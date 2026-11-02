"use client";

import { createContext, useContext, type ReactNode } from "react";

// Set by the server's deployment environment, never a query parameter. This
// suppresses automatic profile writes; it is not a database authorization rule.
const PreviewRuntimeContext = createContext(false);

export function PreviewRuntimeProvider({ preview, children }: { preview: boolean; children: ReactNode }) {
  return <PreviewRuntimeContext.Provider value={preview}>{children}</PreviewRuntimeContext.Provider>;
}

export function usePreviewRuntime() {
  return useContext(PreviewRuntimeContext);
}
