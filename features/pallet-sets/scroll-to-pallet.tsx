"use client";

import { useEffect, type ReactNode } from "react";

export function ScrollToPallet(): ReactNode {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("pallet-")) {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, []);

  return null;
}
