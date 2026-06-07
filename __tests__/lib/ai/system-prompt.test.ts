import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

describe("buildSystemPrompt", () => {
  it("includes club data in prompt", () => {
    const prompt = buildSystemPrompt({
      clubs: [
        { club_number: "1W", maker: "Titleist", model: "TSR3", shaft_name: "Speeder NX", distance: 230 },
      ],
      recentSessions: [],
      recentPlans: [],
      gapAnalysis: { gaps: [], missingDistance: [] },
    });

    expect(prompt).toContain("1W");
    expect(prompt).toContain("Titleist TSR3");
    expect(prompt).toContain("230yd");
  });

  it("includes practice session data", () => {
    const prompt = buildSystemPrompt({
      clubs: [],
      recentSessions: [
        { practiced_at: "2026-06-01", total_balls: 100, memo: "スライスが出た", clubs: [{ club_number: "1W", balls: 30 }] },
      ],
      recentPlans: [],
      gapAnalysis: { gaps: [], missingDistance: [] },
    });

    expect(prompt).toContain("2026-06-01");
    expect(prompt).toContain("スライスが出た");
    expect(prompt).toContain("1W: 30球");
  });

  it("includes gap analysis results", () => {
    const prompt = buildSystemPrompt({
      clubs: [],
      recentSessions: [],
      recentPlans: [],
      gapAnalysis: {
        gaps: [{ between: ["5I", "7I"], difference: 30 }],
        missingDistance: ["PW"],
      },
    });

    expect(prompt).toContain("5I と 7I の間に 30yd");
  });
});
