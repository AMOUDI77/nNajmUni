import { describe, expect, it } from 'vitest';
import { translateCopy } from './copy';
import { PROGRAMS, UNIVERSITIES, INSTITUTES } from './data';
import { subjectGuide, studyFields } from './studyFields';
import { curriculumPreviews } from './programDetails';
import { applicationMessage, levels } from './discovery';

const arabic = /[\u0600-\u06ff]/;
describe('public language coverage', () => {
  it('translates guidance for every catalogue programme and all verified modules', () => {
    const texts = new Set<string>(Object.values(levels));
    for (const field of studyFields) { texts.add(field.title); field.terms.forEach(t => texts.add(t)); }
    for (const program of PROGRAMS) {
      const guide = subjectGuide(program);
      [guide.title, guide.about, guide.fit, ...guide.topics, ...guide.careers].forEach(t => texts.add(t));
    }
    for (const preview of Object.values(curriculumPreviews)) [preview.summary, ...preview.subjects].forEach(t => texts.add(t));
    expect([...texts].filter(text => arabic.test(translateCopy(text, 'en')))).toEqual([]);
  });
  it('retains interpolation values and the original Arabic wording', () => {
    expect(translateCopy('تخصصات الحاسب والتقنية', 'en')).toBe('Programmes in Computing and technology');
    expect(translateCopy('تخصصات الحاسب والتقنية', 'ar')).toBe('تخصصات الحاسب والتقنية');
    expect(translateCopy('Unknown official name', 'en')).toBe('Unknown official name');
    expect(translateCopy('Asia Pacific University', 'ar')).toBe('Asia Pacific University');
  });
  it('keeps official institution and programme names unchanged in both languages', () => {
    for (const item of [...UNIVERSITIES, ...INSTITUTES, ...PROGRAMS]) {
      expect(translateCopy(item.name, 'ar')).toBe(item.name);
      expect(translateCopy(item.name, 'en')).toBe(item.name);
    }
  });
  it('prepares the WhatsApp request in the selected language', () => {
    const data = { name:'Sara', phone:'+60123456789', university:'APU', program:'Software Engineering', qualification:'ثانوية', level:'bachelor' };
    const english = applicationMessage(data, 'en');
    expect(english).toContain('Name: Sara');
    expect(english).toContain('Academic qualification: High school');
    expect(english).toContain('Requested degree: Bachelor');
    expect(arabic.test(english)).toBe(false);
    expect(applicationMessage(data, 'ar')).toContain('الاسم: Sara');
  });
});
