"use client";

import { createContext, useContext } from "react";
import type { User } from "@/types/database";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser?: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
