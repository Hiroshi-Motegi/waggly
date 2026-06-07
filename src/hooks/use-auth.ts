"use client";

import { createContext, useContext } from "react";
import type { User } from "@/types/database";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
