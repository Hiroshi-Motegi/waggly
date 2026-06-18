"use client";

import { useCallback, useState } from "react";
import { validateField, validateForm } from "@/lib/form-validation";
import type { ValidationRule, ValidationSchema } from "@/lib/form-validation";

const REALTIME_RULES = ["range", "maxLength"] as const;

export function useFormValidation<T extends Record<string, unknown>>(schema: ValidationSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateOnChange = useCallback(
    (field: string, value: unknown) => {
      const rule = schema[field as keyof T];
      if (!rule) {
        setErrors((prev) => {
          if (!prev[field]) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return;
      }

      if (submitted) {
        const error = validateField(value, rule);
        setErrors((prev) => {
          if (error) return { ...prev, [field]: error };
          const next = { ...prev };
          delete next[field];
          return next;
        });
      } else {
        const realtimeRule: ValidationRule = {};
        if (rule.range) realtimeRule.range = rule.range;
        if (rule.maxLength) realtimeRule.maxLength = rule.maxLength;
        if (Object.keys(realtimeRule).length === 0) return;

        const error = validateField(value, realtimeRule);
        setErrors((prev) => {
          if (error) return { ...prev, [field]: error };
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [schema, submitted]
  );

  const validateOnSubmit = useCallback(
    (form: Record<string, unknown>): boolean => {
      setSubmitted(true);
      const newErrors = validateForm(form, schema as ValidationSchema<Record<string, unknown>>);
      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        const firstField = Object.keys(newErrors)[0];
        setTimeout(() => {
          document
            .querySelector(`[data-field="${firstField}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
        return false;
      }
      return true;
    },
    [schema]
  );

  const fieldError = useCallback(
    (field: string): string | null => errors[field] ?? null,
    [errors]
  );

  return { errors, validateOnChange, validateOnSubmit, fieldError };
}
