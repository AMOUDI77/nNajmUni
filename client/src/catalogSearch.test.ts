import { describe, it, expect } from "vitest";
import {
  institutionSearchNames,
  programSearchNames,
  searchScore,
} from "./catalogSearch";
import { UNIVERSITIES } from "./data";
const find = (q: string) =>
  UNIVERSITIES.map((u) => ({
    ...u,
    score: searchScore(q, institutionSearchNames(u.name, u.abbr)),
  }))
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score);
describe("live bilingual university search", () => {
  it.each([
    "تا",
    "تايلور",
    "جامعة تَايلور",
    "تايلر",
    "taylr",
    "taylor",
    "taylros",
  ])("finds Taylor using %s", (q) => expect(find(q)[0]?.abbr).toBe("TAYLOR'S"));
  it.each(["صنواي", "صن واي", "سنواي", "sunwa", "sunawy"])(
    "finds Sunway using %s",
    (q) => expect(find(q)[0]?.abbr).toBe("SUNWAY"),
  );
  it.each(["اي بي يو", "آسيا باسيفيك", "جامعه اسيا باسيفيك", "apu"])(
    "finds APU using %s",
    (q) => expect(find(q)[0]?.abbr).toBe("APU"),
  );
  it("ranks an exact acronym first and rejects unrelated input", () => {
    expect(find("UTM")[0]?.abbr).toBe("UTM");
    expect(find('شيامن')[0]?.abbr).toBe('XIAMEN');
    expect(find('بتروناس')[0]?.abbr).toBe('UTP');
    expect(find('كلوست')[0]?.abbr).toBe('KLUST');
    expect(find('IUKL')[0]?.abbr).toBe('KLUST');
    expect(find("zzzzzzzzzz")).toEqual([]);
    expect(find("جامعة كوكب زحل")).toEqual([]);
  });
  it("matches partial and misspelled Arabic subjects without making records", () => {
    const names = programSearchNames(
      "Bachelor of Software Engineering",
      "Technology",
    );
    expect(searchScore("هندسه برمجيات", names)).toBeGreaterThan(0);
    expect(searchScore("برمجيا", names)).toBeGreaterThan(0);
    expect(searchScore("طب", names)).toBe(0);
  });
});
