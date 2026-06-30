import { useState, useEffect } from "react";
import { getCurrentUser, AUTH_EVENT, type AqariUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AqariUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const handler = () => setUser(getCurrentUser());
    window.addEventListener(AUTH_EVENT, handler);
    return () => window.removeEventListener(AUTH_EVENT, handler);
  }, []);

  return { user, isLoggedIn: !!user };
}
