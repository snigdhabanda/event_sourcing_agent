"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Browser-side auth client. Talks to the same-origin /api/auth handler. */
export const authClient = createAuthClient();
