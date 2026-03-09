import { describe, it, expect } from "vitest";
import { needsPlayerAssignment } from "@/hooks/useMatchState";

describe("needsPlayerAssignment", () => {
    it("never shows the popup if no players are configured", () => {
        expect(needsPlayerAssignment(false, "blue", "scored", true)).toBe(false);
        expect(needsPlayerAssignment(false, "red", "fault", true)).toBe(false);
        expect(needsPlayerAssignment(false, "blue", "neutral", true)).toBe(false);
    });

    it("never shows the popup if assignToPlayer is explicitly false", () => {
        expect(needsPlayerAssignment(true, "blue", "scored", false)).toBe(false);
        expect(needsPlayerAssignment(true, "red", "fault", false)).toBe(false);
        expect(needsPlayerAssignment(true, "blue", "neutral", false)).toBe(false);
    });

    describe("when players are present and assignToPlayer is enabled or undefined", () => {
        describe("Scored points", () => {
            it("shows popup when Blue scores", () => {
                expect(needsPlayerAssignment(true, "blue", "scored", true)).toBe(true);
                expect(needsPlayerAssignment(true, "blue", "scored", undefined)).toBe(true);
            });

            it("does NOT show popup when Red scores (defaults to no player assignment)", () => {
                expect(needsPlayerAssignment(true, "red", "scored", true)).toBe(false);
                expect(needsPlayerAssignment(true, "red", "scored", undefined)).toBe(false);
            });
        });

        describe("Fault points", () => {
            it("shows popup when Red faults (Blue scored)", () => {
                // Red commits a fault => point goes to Blue, but we ask which Red player faulted
                expect(needsPlayerAssignment(true, "red", "fault", true)).toBe(true);
            });

            it("does NOT show popup when Blue faults (Red scored)", () => {
                expect(needsPlayerAssignment(true, "blue", "fault", true)).toBe(false);
            });
        });

        describe("Neutral points", () => {
            it("always shows popup regardless of team", () => {
                expect(needsPlayerAssignment(true, "blue", "neutral", true)).toBe(true);
                expect(needsPlayerAssignment(true, "red", "neutral", undefined)).toBe(true);
            });
        });
    });
});
