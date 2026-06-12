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
