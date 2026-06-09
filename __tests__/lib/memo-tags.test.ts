import { describe, it, expect } from "vitest";
import {
  SYMPTOM_TAGS,
  FEELING_TAGS,
  GEAR_TAGS,
  GOOD_TAGS,
  getTagsByCondition,
} from "@/lib/memo-tags";

describe("memo-tags", () => {
  it("SYMPTOM_TAGS has categories with tags", () => {
    expect(SYMPTOM_TAGS.length).toBeGreaterThan(0);
    SYMPTOM_TAGS.forEach((cat) => {
      expect(cat.label).toBeTruthy();
      expect(cat.tags.length).toBeGreaterThan(0);
    });
  });

  it("FEELING_TAGS is a flat array", () => {
    expect(FEELING_TAGS.length).toBeGreaterThan(0);
    FEELING_TAGS.forEach((tag) => expect(typeof tag).toBe("string"));
  });

  it("GEAR_TAGS is a flat array", () => {
    expect(GEAR_TAGS.length).toBeGreaterThan(0);
  });

  it("GOOD_TAGS is a flat array", () => {
    expect(GOOD_TAGS.length).toBeGreaterThan(0);
  });

  it("getTagsByCondition returns correct tags for bad", () => {
    const result = getTagsByCondition("bad");
    expect(result.symptomTags).toBe(SYMPTOM_TAGS);
    expect(result.feelingTags).toBe(FEELING_TAGS);
    expect(result.gearTags).toBe(GEAR_TAGS);
    expect(result.goodTags).toBeUndefined();
  });

  it("getTagsByCondition returns correct tags for good", () => {
    const result = getTagsByCondition("good");
    expect(result.goodTags).toBe(GOOD_TAGS);
    expect(result.symptomTags).toBeUndefined();
  });
});
