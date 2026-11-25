"use client";

import { useEffect } from "react";
import { found } from "@/lib/eggs";

/** Records the QR egg on whichever device read the code. Renders nothing. */
export function QFound() {
  useEffect(() => found("qr"), []);
  return null;
}
