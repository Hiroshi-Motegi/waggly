import { describe, it, expect } from "vitest";
import { assertValidTable, assertValidColumns } from "@/lib/sql-safe";

describe("assertValidTable", () => {
  it("allows known table names", () => {
    expect(() => assertValidTable("clubs")).not.toThrow();
    expect(() => assertValidTable("club_images")).not.toThrow();
    expect(() => assertValidTable("club_memos")).not.toThrow();
    expect(() => assertValidTable("maintenances")).not.toThrow();
    expect(() => assertValidTable("practice_sessions")).not.toThrow();
    expect(() => assertValidTable("practice_clubs")).not.toThrow();
    expect(() => assertValidTable("accessories")).not.toThrow();
  });

  it("rejects unknown table names", () => {
    expect(() => assertValidTable("users; DROP TABLE clubs")).toThrow();
    expect(() => assertValidTable("unknown_table")).toThrow();
    expect(() => assertValidTable("")).toThrow();
  });
});

describe("assertValidColumns", () => {
  it("allows valid column names (alphanumeric + underscore)", () => {
    expect(() => assertValidColumns(["id", "club_id", "created_at"])).not.toThrow();
  });

  it("rejects column names with special characters", () => {
    expect(() => assertValidColumns(["id; DROP TABLE clubs"])).toThrow();
    expect(() => assertValidColumns(["valid", "in--valid"])).toThrow();
    expect(() => assertValidColumns(["col name"])).toThrow();
  });

  it("rejects empty column list", () => {
    expect(() => assertValidColumns([])).toThrow();
  });
});
