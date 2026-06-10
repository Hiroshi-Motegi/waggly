"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import type { Profile, FavoriteCourse } from "@/types/database";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useProfile() {
  const { user } = useAuth();
  const key = (user || isNative()) ? "/api/profile" : null;
  const { data, isLoading, mutate: refetch } = useSWR<Profile>(key, fetcher);
  return { profile: data ?? null, isLoading, refetch };
}

export async function updateProfile(data: Partial<Profile>): Promise<Profile> {
  const res = await apiFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update profile");
  }
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export async function setUsername(username: string): Promise<Profile> {
  const res = await apiFetch("/api/profile/username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to set username");
  }
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export async function uploadAvatar(file: File): Promise<Profile> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload avatar");
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export function useFavoriteCourses() {
  const { user } = useAuth();
  const key = (user || isNative()) ? "/api/profile/courses" : null;
  const { data, isLoading, mutate: refetch } = useSWR<FavoriteCourse[]>(key, fetcher);
  return { courses: data ?? [], isLoading, refetch };
}

export async function addFavoriteCourse(course: Partial<FavoriteCourse>): Promise<FavoriteCourse> {
  const res = await apiFetch("/api/profile/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  if (!res.ok) throw new Error("Failed to add course");
  mutate("/api/profile/courses");
  return res.json();
}

export async function removeFavoriteCourse(id: string): Promise<void> {
  await apiFetch("/api/profile/courses", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  mutate("/api/profile/courses");
}
