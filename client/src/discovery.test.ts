import { describe, expect, it, vi, afterEach } from "vitest";
import { applicationUrl, matches, normalize, whatsappUrl, applicationMessage, whatsappMessageUrl } from "./discovery";
afterEach(() => vi.unstubAllEnvs());
describe("student discovery and advisor context", () => {
  it("normalizes Arabic and matches bilingual subjects without inventing records", () => {
    expect(normalize("إِدارة")).toBe(normalize("ادارة"));
    expect(matches("APU", "Asia Pacific Apu")).toBe(true);
    expect(
      matches("الأمن السيبراني", "Computer Science (Cyber Security)"),
    ).toBe(true);
    expect(matches("هندسة البرمجيات", "Software Engineering")).toBe(true);
    expect(matches("Medicine", "Software Engineering")).toBe(false);
  });
  it("uses the owner-confirmed destination and preserves context", () => {
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "");
    expect(new URL(whatsappUrl({ program: "Computer Science" })!).pathname).toBe('/601137327607');
    const url = new URL(
      applicationUrl({ university: "APU", program: "Computer Science" }, true),
      "https://example.test",
    );
    expect(url.searchParams.get("program")).toBe("Computer Science");
    expect(url.searchParams.get("intent")).toBe("consultation");
  });
  it('includes the completed application without invented optional values', () => {
    const message = applicationMessage({name:'طالب تجريبي',phone:'+15555550188',qualification:'ثانوية',university:'APU',program:'A & B',level:'bachelor',preferredStart:'2027'});
    const url = new URL(whatsappMessageUrl(message)!);
    expect(url.pathname).toBe('/601137327607');
    expect(url.searchParams.get('text')).toBe(message);
    for (const value of ['طالب تجريبي','+15555550188','ثانوية','APU','A & B','بكالوريوس','2027']) expect(message).toContain(value);
    const minimal = applicationMessage({name:'Student',phone:'+15555550188'});
    expect(minimal).not.toContain('undefined');
    expect(minimal).not.toContain('التخصص:');
  });
  it("encodes known context in a configured WhatsApp handoff", () => {
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "15555550123"); // test fixture, never product configuration
    const url = new URL(
      whatsappUrl({ university: "APU", program: "A & B", level: "bachelor" })!,
    );
    expect(url.hostname).toBe("wa.me");
    expect(url.searchParams.get("text")).toContain("A & B");
    expect(url.searchParams.get("text")).toContain("بكالوريوس");
    expect(url.searchParams.get("text")).not.toContain("undefined");
  });
});
