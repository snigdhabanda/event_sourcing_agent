import { auth } from "@/lib/auth/server";

// Catch-all for all Neon Auth / Better Auth endpoints (sign-in, callback, session…).
export const { GET, POST } = auth.handler();
