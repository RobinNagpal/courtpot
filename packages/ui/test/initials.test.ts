import { describe, expect, it } from "vitest";
import { initialsFrom, tintFor } from "../src/initials";

describe("initialsFrom", () => {
  it("gives two letters for a single word", () => {
    expect(initialsFrom("Puneet")).toBe("PU");
    expect(initialsFrom("Sam")).toBe("SA");
  });

  it("gives first and last initials for several words", () => {
    expect(initialsFrom("Robin Nagpal")).toBe("RN");
    expect(initialsFrom("Mary Jane Watson")).toBe("MW");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initialsFrom("  robin   nagpal  ")).toBe("RN");
    expect(initialsFrom("robin")).toBe("RO");
  });

  it("strips punctuation rather than using it as an initial", () => {
    expect(initialsFrom("Robin (Rob) Nagpal")).toBe("RN");
    expect(initialsFrom("O'Brien")).toBe("OB");
  });

  it("copes with a single letter and with nothing usable", () => {
    expect(initialsFrom("X")).toBe("X");
    expect(initialsFrom("   ")).toBe("?");
    expect(initialsFrom("")).toBe("?");
  });

  it("handles non-latin names", () => {
    expect(initialsFrom("अजय कुमार")).toBe("अक");
  });
});

describe("tintFor", () => {
  it("is stable for the same name", () => {
    expect(tintFor("Robin Nagpal")).toEqual(tintFor("Robin Nagpal"));
  });

  it("always returns background and text classes", () => {
    for (const name of ["", "A", "Robin", "Gurpinder Singh"]) {
      expect(tintFor(name).bg).toMatch(/^bg-/);
      expect(tintFor(name).text).toMatch(/^text-/);
    }
  });
});
