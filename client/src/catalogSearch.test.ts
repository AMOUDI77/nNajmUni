import { describe, it, expect } from "vitest";
import {
  institutionSearchNames,
  programSearchNames,
  searchScore,
  programSearchScore,
  programSearchIntent,
} from "./catalogSearch";
import { UNIVERSITIES, PROGRAMS } from "./data";
const find = (q: string) =>
  UNIVERSITIES.map((u) => ({
    ...u,
    score: searchScore(q, institutionSearchNames(u.name, u.abbr)),
  }))
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score);
describe("live bilingual university search", () => {
  it('finds cybersecurity across university naming variants for the full title in the reported search', () => {
    const query = 'Bachelor of Computer Science (Cyber Security) with Honours';
    const results = PROGRAMS.filter(p => programSearchScore(query, p) > 0);
    expect(new Set(results.map(p => p.university_id)).size).toBeGreaterThan(2);
    expect(results.every(p => p.level === 'bachelor')).toBe(true);
    expect(results.every(p => /cyber.?security/i.test(p.name))).toBe(true);
    expect(results.some(p => p.university_abbr === 'APU')).toBe(true);
    expect(results.some(p => p.university_abbr === 'MMU')).toBe(true);
  });
  it('preserves specialisms, degree and institution constraints while removing title boilerplate', () => {
    const program = { name: 'Bachelor of Computer Science (Hons) Cybersecurity', field: 'Computer Science & IT', level: 'bachelor' };
    expect(programSearchScore('Cyber Security', program)).toBeGreaterThan(0);
    expect(programSearchScore('Master of Cybersecurity', program)).toBe(0);
    expect(programSearchScore('Bachelor of Cybersecurity Digital Forensics', program)).toBe(0);
    expect(programSearchScore('APU Bachelor of Cybersecurity', program, ['MMU'])).toBe(0);
    expect(programSearchIntent('Bachelor of Science (Honours) in Data Science').text).toBe('data science');
    expect(programSearchIntent('Bachelor of Computer Science (Cyber Security) with Honours').text).toBe('cybersecurity');
  });
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
