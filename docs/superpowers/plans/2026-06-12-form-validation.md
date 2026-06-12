# Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline validation with real-time error feedback to club and item forms

**Architecture:** Shared validation utility with declarative schema definitions, a React hook for state management, and a FieldError component for display. Forms integrate via the hook's `validateOnChange` (real-time) and `validateOnSubmit` (save-time) functions.

**Tech Stack:** TypeScript, React hooks, Vitest

---

## File Structure

| File | Responsibility |
|---|---|
| Create: `src/lib/form-validation.ts` | Validation rules, schemas, pure validation functions |
| Create: `src/hooks/use-form-validation.ts` | React hook for validation state + timing logic |
| Create: `src/components/ui/field-error.tsx` | Error message display component |
| Create: `__tests__/lib/form-validation.test.ts` | Unit tests for validation functions |
| Modify: `src/components/club/club-form.tsx` | Club form validation integration |
| Modify: `src/components/club/club-detail-specs.tsx` | Pass errors to spec fields |
| Modify: `src/app/items/new/page.tsx` | Item creation validation |
| Modify: `src/app/items/[id]/page-client.tsx` | Item edit validation |

---

### Task 1: Validation utility with tests (TDD)

**Files:**
- Create: `src/lib/form-validation.ts`
- Create: `__tests__/lib/form-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/form-validation.test.ts
import { describe, it, expect } from "vitest";
import {
  validateField,
  validateForm,
  clubValidationSchema,
  accessoryValidationSchema,
} from "@/lib/form-validation";

describe("validateField", () => {
  describe("required", () => {
    const rule = { required: "必須です" };
    it("returns error for empty string", () => {
      expect(validateField("", rule)).toBe("必須です");
    });
    it("returns error for null", () => {
      expect(validateField(null, rule)).toBe("必須です");
    });
    it("returns error for undefined", () => {
      expect(validateField(undefined, rule)).toBe("必須です");
    });
    it("returns null for valid value", () => {
      expect(validateField("hello", rule)).toBeNull();
    });
  });

  describe("maxLength", () => {
    const rule = { maxLength: { value: 5, message: "5文字以内" } };
    it("returns null for short string", () => {
      expect(validateField("abc", rule)).toBeNull();
    });
    it("returns null for exact length", () => {
      expect(validateField("abcde", rule)).toBeNull();
    });
    it("returns error for too long", () => {
      expect(validateField("abcdef", rule)).toBe("5文字以内");
    });
    it("returns null for empty/null (not required)", () => {
      expect(validateField("", rule)).toBeNull();
      expect(validateField(null, rule)).toBeNull();
    });
  });

  describe("range", () => {
    const rule = { range: { min: 0, max: 90, message: "0〜90の範囲" } };
    it("returns null for value in range", () => {
      expect(validateField(45, rule)).toBeNull();
    });
    it("returns null for min boundary", () => {
      expect(validateField(0, rule)).toBeNull();
    });
    it("returns null for max boundary", () => {
      expect(validateField(90, rule)).toBeNull();
    });
    it("returns error for below min", () => {
      expect(validateField(-1, rule)).toBe("0〜90の範囲");
    });
    it("returns error for above max", () => {
      expect(validateField(91, rule)).toBe("0〜90の範囲");
    });
    it("returns null for empty/undefined (optional)", () => {
      expect(validateField(undefined, rule)).toBeNull();
      expect(validateField(null, rule)).toBeNull();
      expect(validateField("", rule)).toBeNull();
    });
  });

  describe("pattern", () => {
    const rule = { pattern: { value: /^https?:\/\/.+/, message: "有効なURLを入力してください" } };
    it("returns null for valid URL", () => {
      expect(validateField("https://example.com", rule)).toBeNull();
    });
    it("returns error for invalid URL", () => {
      expect(validateField("not-a-url", rule)).toBe("有効なURLを入力してください");
    });
    it("returns null for empty (optional)", () => {
      expect(validateField("", rule)).toBeNull();
      expect(validateField(null, rule)).toBeNull();
    });
  });

  describe("combined rules", () => {
    const rule = {
      required: "必須です",
      maxLength: { value: 50, message: "50文字以内" },
    };
    it("required takes priority over maxLength", () => {
      expect(validateField("", rule)).toBe("必須です");
    });
    it("checks maxLength when value present", () => {
      expect(validateField("a".repeat(51), rule)).toBe("50文字以内");
    });
  });
});

describe("validateForm", () => {
  it("returns empty object when all valid", () => {
    const schema = { name: { required: "必須" } };
    expect(validateForm({ name: "test" }, schema)).toEqual({});
  });
  it("returns errors for invalid fields", () => {
    const schema = {
      name: { required: "名前は必須" },
      age: { range: { min: 0, max: 150, message: "範囲外" } },
    };
    const result = validateForm({ name: "", age: -1 }, schema);
    expect(result).toEqual({ name: "名前は必須", age: "範囲外" });
  });
});

describe("clubValidationSchema", () => {
  it("has required rules for category and club_number", () => {
    expect(clubValidationSchema.category?.required).toBeTruthy();
    expect(clubValidationSchema.club_number?.required).toBeTruthy();
  });
  it("has range rules for numeric fields", () => {
    expect(clubValidationSchema.loft?.range).toBeTruthy();
    expect(clubValidationSchema.purchase_price?.range?.min).toBe(0);
  });
});

describe("accessoryValidationSchema", () => {
  it("has required rule for category", () => {
    expect(accessoryValidationSchema.category?.required).toBeTruthy();
  });
  it("has pattern rule for purchase_url", () => {
    expect(accessoryValidationSchema.purchase_url?.pattern).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/form-validation.test.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Implement the validation utility**

```typescript
// src/lib/form-validation.ts

export type ValidationRule = {
  required?: string;
  maxLength?: { value: number; message: string };
  range?: { min: number; max: number; message: string };
  pattern?: { value: RegExp; message: string };
};

export type ValidationSchema<T = any> = Partial<Record<keyof T, ValidationRule>>;

/**
 * Validate a single field value against a rule.
 * Returns error message or null.
 */
export function validateField(value: any, rule: ValidationRule): string | null {
  // Required check
  if (rule.required) {
    if (value === null || value === undefined || value === "") {
      return rule.required;
    }
  }

  // Skip other checks if value is empty (optional fields)
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Max length
  if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength.value) {
    return rule.maxLength.message;
  }

  // Range (numeric)
  if (rule.range) {
    const num = typeof value === "number" ? value : Number(value);
    if (!isNaN(num) && (num < rule.range.min || num > rule.range.max)) {
      return rule.range.message;
    }
  }

  // Pattern
  if (rule.pattern && typeof value === "string" && !rule.pattern.value.test(value)) {
    return rule.pattern.message;
  }

  return null;
}

/**
 * Validate all fields in a form against a schema.
 * Returns a record of field → error message (only for fields with errors).
 */
export function validateForm<T extends Record<string, any>>(
  form: T,
  schema: ValidationSchema<T>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, rule] of Object.entries(schema)) {
    if (!rule) continue;
    const error = validateField(form[field], rule);
    if (error) errors[field] = error;
  }
  return errors;
}

// --- Schemas ---

const currentYear = new Date().getFullYear();

export const clubValidationSchema: ValidationSchema = {
  category: { required: "カテゴリを選択してください" },
  club_number: { required: "番手を選択してください" },
  maker: { maxLength: { value: 50, message: "50文字以内で入力してください" } },
  model: { maxLength: { value: 50, message: "50文字以内で入力してください" } },
  shaft_name: { maxLength: { value: 50, message: "50文字以内で入力してください" } },
  loft: { range: { min: 0, max: 90, message: "0〜90の範囲で入力してください" } },
  lie: { range: { min: 0, max: 90, message: "0〜90の範囲で入力してください" } },
  length: { range: { min: 0, max: 60, message: "0〜60の範囲で入力してください" } },
  distance: { range: { min: 0, max: 400, message: "0〜400の範囲で入力してください" } },
  weight: { range: { min: 0, max: 1000, message: "0〜1000の範囲で入力してください" } },
  swing_weight: { maxLength: { value: 10, message: "10文字以内で入力してください" } },
  frequency: { range: { min: 0, max: 500, message: "0〜500の範囲で入力してください" } },
  kick_point: { maxLength: { value: 20, message: "20文字以内で入力してください" } },
  head_volume: { range: { min: 0, max: 600, message: "0〜600の範囲で入力してください" } },
  head_weight: { range: { min: 0, max: 400, message: "0〜400の範囲で入力してください" } },
  release_year: { range: { min: 1950, max: currentYear + 1, message: `1950〜${currentYear + 1}の範囲で入力してください` } },
  purchase_price: { range: { min: 0, max: 100000000, message: "0以上の値を入力してください" } },
  purchase_shop: { maxLength: { value: 100, message: "100文字以内で入力してください" } },
};

export const accessoryValidationSchema: ValidationSchema = {
  category: { required: "カテゴリを選択してください" },
  brand: { maxLength: { value: 50, message: "50文字以内で入力してください" } },
  model: { maxLength: { value: 50, message: "50文字以内で入力してください" } },
  memo: { maxLength: { value: 500, message: "500文字以内で入力してください" } },
  purchase_url: { pattern: { value: /^https?:\/\/.+/, message: "有効なURLを入力してください" } },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/form-validation.test.ts`

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/form-validation.ts __tests__/lib/form-validation.test.ts
git commit -m "feat: add form validation utility with club and accessory schemas"
```

---

### Task 2: useFormValidation hook and FieldError component

**Files:**
- Create: `src/hooks/use-form-validation.ts`
- Create: `src/components/ui/field-error.tsx`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/use-form-validation.ts
"use client";

import { useCallback, useState } from "react";
import { validateField, validateForm } from "@/lib/form-validation";
import type { ValidationSchema } from "@/lib/form-validation";

/** Rule types that fire on every keystroke (not just on submit) */
const REALTIME_RULES = ["range", "maxLength"] as const;

export function useFormValidation<T extends Record<string, any>>(schema: ValidationSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  /**
   * Call on every field change.
   * - range/maxLength: always checked (real-time)
   * - required/pattern: only checked after first submit attempt
   */
  const validateOnChange = useCallback(
    (field: string, value: any) => {
      const rule = schema[field as keyof T];
      if (!rule) {
        // Clear any existing error for this field
        setErrors((prev) => {
          if (!prev[field]) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return;
      }

      if (submitted) {
        // After submit, check all rules
        const error = validateField(value, rule);
        setErrors((prev) => {
          if (error) return { ...prev, [field]: error };
          const next = { ...prev };
          delete next[field];
          return next;
        });
      } else {
        // Before submit, only check real-time rules
        const realtimeRule: any = {};
        for (const key of REALTIME_RULES) {
          if ((rule as any)[key]) realtimeRule[key] = (rule as any)[key];
        }
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

  /**
   * Call on form submit. Returns true if valid.
   * Scrolls to first error field if invalid.
   */
  const validateOnSubmit = useCallback(
    (form: T): boolean => {
      setSubmitted(true);
      const newErrors = validateForm(form, schema);
      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        // Scroll to first error field
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

  /** Get error message for a field, or null */
  const fieldError = useCallback(
    (field: string): string | null => errors[field] ?? null,
    [errors]
  );

  return { errors, validateOnChange, validateOnSubmit, fieldError };
}
```

- [ ] **Step 2: Create the FieldError component**

```tsx
// src/components/ui/field-error.tsx
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-form-validation.ts src/components/ui/field-error.tsx
git commit -m "feat: add useFormValidation hook and FieldError component"
```

---

### Task 3: Integrate validation into club form

**Files:**
- Modify: `src/components/club/club-form.tsx`
- Modify: `src/components/club/club-detail-specs.tsx`

- [ ] **Step 1: Update ClubForm to use validation hook**

In `src/components/club/club-form.tsx`:

Add imports:
```tsx
import { useFormValidation } from "@/hooks/use-form-validation";
import { clubValidationSchema } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/field-error";
```

Add hook after existing state:
```tsx
const { errors, validateOnChange, validateOnSubmit, fieldError } = useFormValidation(clubValidationSchema);
```

Update `update` function:
```tsx
function update(field: string, value: string | number | undefined | null) {
  setForm((prev) => ({ ...prev, [field]: value }));
  validateOnChange(field, value);
}
```

Update `handleSubmit`:
```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!validateOnSubmit(form as any)) return;
  const cleaned = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
  );
  onSubmit(cleaned, pendingFile ?? undefined);
}
```

Add `data-field` + error border + `FieldError` to each validated field. Example for category select:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="category">
  <span className={labelClass}>種類</span>
  <select value={form.category ?? ""} onChange={(e) => { /* existing logic */ }}
    className={`${selectClass} ${fieldError("category") ? "!border-red-400" : ""}`}>
    <option value="">選択してください</option>
    {categories.map((c) => (
      <option key={c.value} value={c.value}>{c.label}</option>
    ))}
  </select>
  <FieldError message={fieldError("category")} />
</div>
```

Apply the same pattern to all validated fields:
- `category`: select — add `data-field`, error border, FieldError
- `club_number`: custom input in "その他" section — add `data-field` to wrapper, FieldError below input
- `maker`: input — add `data-field`, error border, FieldError
- `model`: input — same
- `shaft_name`: input — same
- `release_year`: number input — same
- `loft`: inline spec input — add `data-field`, `!border-b-red-400` on error, FieldError
- `lie`: inline spec input — same
- `length`: inline spec input — same
- `purchase_shop`: input — add `data-field`, error border, FieldError
- `purchase_price`: number input — add `data-field`, error border, FieldError

For inline spec fields (loft, lie, length), use `!border-b-red-400` instead of `!border-red-400`:
```tsx
<div className="flex items-center gap-0.5 py-2.5" data-field="loft">
  <span className="flex-1 text-base">ロフト角</span>
  <input type="number" step="0.5" value={form.loft ?? ""}
    onChange={(e) => update("loft", e.target.value ? Number(e.target.value) : undefined)}
    min={0} max={90}
    className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError("loft") ? "!border-b-red-400" : ""}`} />
  <span className="w-[30px] text-sm">°</span>
</div>
{fieldError("loft") && <FieldError message={fieldError("loft")} />}
```

- [ ] **Step 2: Update ClubDetailSpecs to show errors**

In `src/components/club/club-detail-specs.tsx`:

Add props for errors:
```tsx
interface Props {
  form: Partial<Club>;
  onChange: (key: string, value: string | number | undefined | null) => void;
  fieldError?: (field: string) => string | null;
}

export function ClubDetailSpecs({ form, onChange, fieldError }: Props) {
```

Add `data-field` + error border + FieldError to each spec field. Example for weight:
```tsx
<div data-field="weight">
  <div className="flex items-center gap-0.5 py-2.5">
    <span className="flex-1 text-base">総重量</span>
    <input type="number" step="0.1" value={form.weight ?? ""}
      onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)}
      min={0} max={1000}
      className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("weight") ? "!border-b-red-400" : ""}`} />
    <span className="w-[30px] text-sm">g</span>
  </div>
  {fieldError?.("weight") && <p className="text-red-500 text-xs mt-0.5 text-right pr-[30px]">{fieldError("weight")}</p>}
</div>
```

Apply to all 6 spec fields: weight, swing_weight, frequency, kick_point, head_volume, head_weight.

Also add `min`/`max` HTML attributes to number inputs.

Update the caller in club-form.tsx:
```tsx
<ClubDetailSpecs form={form} onChange={update} fieldError={fieldError} />
```

- [ ] **Step 3: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/club/club-form.tsx src/components/club/club-detail-specs.tsx
git commit -m "feat: integrate validation into club form with inline errors"
```

---

### Task 4: Integrate validation into item forms

**Files:**
- Modify: `src/app/items/new/page.tsx`
- Modify: `src/app/items/[id]/page-client.tsx`

- [ ] **Step 1: Update item creation page**

In `src/app/items/new/page.tsx`:

Add imports:
```tsx
import { useFormValidation } from "@/hooks/use-form-validation";
import { accessoryValidationSchema } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/field-error";
```

Add hook inside `NewItemPage`:
```tsx
const { errors, validateOnChange, validateOnSubmit, fieldError } = useFormValidation(accessoryValidationSchema);
```

Update `update` function:
```tsx
function update(field: string, value: string | number | null | undefined) {
  setForm((prev) => ({ ...prev, [field]: value }));
  validateOnChange(field, value);
}
```

Update `handleSubmit`:
```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!validateOnSubmit(form as any)) return;
  setIsSubmitting(true);
  // ... rest unchanged
}
```

Add `data-field` + error border + FieldError to each field:

Category:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="category">
  <span className={labelClass}>カテゴリ</span>
  <select value={form.category} onChange={(e) => update("category", e.target.value)}
    className={`${inputClass} ${fieldError("category") ? "!border-red-400" : ""}`}>
    <option value="">選択してください</option>
    {categories.map((c) => (
      <option key={c.value} value={c.value}>{c.label}</option>
    ))}
  </select>
  <FieldError message={fieldError("category")} />
</div>
```

Brand:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="brand">
  <span className={labelClass}>ブランド・メーカー</span>
  <input value={form.brand} onChange={(e) => update("brand", e.target.value)}
    placeholder="例: Titleist"
    className={`${inputClass} ${fieldError("brand") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("brand")} />
</div>
```

Model:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="model">
  <span className={labelClass}>商品名・モデル</span>
  <input value={form.model} onChange={(e) => update("model", e.target.value)}
    placeholder="例: Pro V1"
    className={`${inputClass} ${fieldError("model") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("model")} />
</div>
```

Memo:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="memo">
  <span className={labelClass}>メモ</span>
  <textarea value={form.memo} onChange={(e) => update("memo", e.target.value)}
    placeholder="使用感など..." rows={5}
    className={`${inputClass} ${fieldError("memo") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("memo")} />
</div>
```

Purchase URL:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="purchase_url">
  <span className={labelClass}>購入URL</span>
  <input type="url" value={form.purchase_url} onChange={(e) => update("purchase_url", e.target.value)}
    placeholder="https://..."
    className={`${inputClass} ${fieldError("purchase_url") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("purchase_url")} />
</div>
```

Remove the `required` HTML attribute from the category select (validation is now handled by JS).

- [ ] **Step 2: Update item edit page**

In `src/app/items/[id]/page-client.tsx`:

Add imports:
```tsx
import { useFormValidation } from "@/hooks/use-form-validation";
import { accessoryValidationSchema } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/field-error";
```

Add hook inside `ItemDetailPage`:
```tsx
const { validateOnChange, validateOnSubmit, fieldError } = useFormValidation(accessoryValidationSchema);
```

Update `updateEdit`:
```tsx
function updateEdit(field: string, value: string | number | null | undefined) {
  setEditForm((prev) => ({ ...prev, [field]: value }));
  validateOnChange(field, value);
}
```

Update `handleSave`:
```tsx
async function handleSave(e: React.FormEvent) {
  e.preventDefault();
  if (!validateOnSubmit(editForm as any)) return;
  setIsSubmitting(true);
  // ... rest unchanged
}
```

Add `data-field` + error border + FieldError to each field in the edit form. The input class in this file is inline (`w-full rounded-lg border border-[#c4c4c4] ...`), so apply the same `!border-red-400` pattern.

Category:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="category">
  <span className="text-sm">カテゴリ</span>
  <select value={editForm.category ?? ""} onChange={(e) => updateEdit("category", e.target.value)}
    className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("category") ? "!border-red-400" : ""}`}>
    {categories.map((c) => (
      <option key={c.value} value={c.value}>{c.label}</option>
    ))}
  </select>
  <FieldError message={fieldError("category")} />
</div>
```

Brand:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="brand">
  <span className="text-sm">ブランド・メーカー</span>
  <input value={editForm.brand ?? ""} onChange={(e) => updateEdit("brand", e.target.value)}
    placeholder="例: Titleist"
    className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("brand") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("brand")} />
</div>
```

Model:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="model">
  <span className="text-sm">商品名・モデル</span>
  <input value={editForm.model ?? ""} onChange={(e) => updateEdit("model", e.target.value)}
    placeholder="例: Pro V1"
    className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("model") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("model")} />
</div>
```

Memo:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="memo">
  <span className="text-sm">メモ</span>
  <textarea value={editForm.memo ?? ""} onChange={(e) => updateEdit("memo", e.target.value)}
    placeholder="使用感など..." rows={5}
    className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("memo") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("memo")} />
</div>
```

Purchase URL:
```tsx
<div className="flex flex-col gap-0.5 py-1" data-field="purchase_url">
  <span className="text-sm">購入URL</span>
  <input type="url" value={editForm.purchase_url ?? ""} onChange={(e) => updateEdit("purchase_url", e.target.value)}
    placeholder="https://..."
    className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("purchase_url") ? "!border-red-400" : ""}`} />
  <FieldError message={fieldError("purchase_url")} />
</div>
```

Remove the `required` HTML attribute from the category select.

- [ ] **Step 3: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 4: Run all tests**

Run: `npx vitest run __tests__/lib/form-validation.test.ts`

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/items/new/page.tsx src/app/items/[id]/page-client.tsx
git commit -m "feat: integrate validation into item creation and edit forms"
```
