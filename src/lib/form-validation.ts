export type ValidationRule = {
  required?: string;
  maxLength?: { value: number; message: string };
  range?: { min: number; max: number; message: string };
  pattern?: { value: RegExp; message: string };
};

export type ValidationSchema<T = any> = Partial<Record<keyof T, ValidationRule>>;

export function validateField(value: any, rule: ValidationRule): string | null {
  if (rule.required) {
    if (value === null || value === undefined || value === "") {
      return rule.required;
    }
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength.value) {
    return rule.maxLength.message;
  }

  if (rule.range) {
    const num = typeof value === "number" ? value : Number(value);
    if (!isNaN(num) && (num < rule.range.min || num > rule.range.max)) {
      return rule.range.message;
    }
  }

  if (rule.pattern && typeof value === "string" && !rule.pattern.value.test(value)) {
    return rule.pattern.message;
  }

  return null;
}

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
