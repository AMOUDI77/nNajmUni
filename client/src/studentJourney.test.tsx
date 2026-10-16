import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useComparison } from './hooks/useComparison';
import { UNIVERSITIES } from './data';
import AdvisorLink from './components/AdvisorLink';
import ApplicationAssistance from './pages/ApplicationAssistance';
import { PROGRAMS } from './data';
import { curriculumFor, curriculumPreviews } from './programDetails';
import { subjectGuide } from './studyFields';
import { studyDuration } from './catalogPresentation';

afterEach(cleanup);
describe('student application journey', () => {
  it('keeps field guidance separate from verified university subjects', () => {
    const software = PROGRAMS.find(p => p.id === 243484946)!;
    const otherUniversity = { ...software, university_id: -1, id: -1 };
    expect(subjectGuide(otherUniversity).title).toBe('هندسة البرمجيات');
    expect(subjectGuide(otherUniversity).topics).toHaveLength(4);
    expect(curriculumFor(otherUniversity)).toBeUndefined();
    expect(subjectGuide({ ...software, name: 'Bachelor of Biomedical Engineering' }).title).toBe('الهندسة الطبية الحيوية');
    expect(studyDuration(0.5)).toBe('6 أشهر');
    expect(studyDuration(null)).toBe('تحتاج تأكيدًا');
  });
  it('matches verified materials by institution, degree and title rather than a reused ID', () => {
    for (const id of Object.keys(curriculumPreviews)) {
      const program = PROGRAMS.find(p => p.id === Number(id))!;
      expect(curriculumFor(program)?.subjects).toHaveLength(4);
      expect(curriculumFor({ ...program, university_id: -1 })).toBeUndefined();
      expect(curriculumFor({ ...program, name: 'Unverified programme' })).toBeUndefined();
      expect(curriculumFor({ ...program, level: 'phd' })).toBeUndefined();
    }
    const apu = PROGRAMS.find(p => p.id === 243484946)!;
    expect(curriculumFor({ ...apu, id: 24, name: 'Bachelor of Software Engineering' })?.subjects).toHaveLength(4);
  });
  it('carries the selected university into comparison and keeps the two choices distinct', () => {
    const selected = UNIVERSITIES[UNIVERSITIES.length - 1];
    const { result } = renderHook(() => useComparison(), { wrapper: ({ children }) =>
      <MemoryRouter initialEntries={[`/compare?university=${selected.id}`]}>{children}</MemoryRouter> });
    expect(result.current.uniA.id).toBe(selected.id);
    expect(result.current.uniB.id).not.toBe(selected.id);
    const other = result.current.uniB.id;
    act(() => result.current.setUniB(selected.id));
    expect(result.current.uniB.id).toBe(selected.id);
    expect(result.current.uniA.id).toBe(other);
  });
  it('falls back to valid distinct universities for stale comparison links', () => {
    const { result } = renderHook(() => useComparison(), { wrapper: ({ children }) =>
      <MemoryRouter initialEntries={['/compare?university=invalid&with=invalid']}>{children}</MemoryRouter> });
    expect(UNIVERSITIES).toContain(result.current.uniA);
    expect(UNIVERSITIES).toContain(result.current.uniB);
    expect(result.current.uniA.id).not.toBe(result.current.uniB.id);
  });
  it('opens the form with context instead of an empty WhatsApp message', () => {
    render(<MemoryRouter><AdvisorLink context={{ university: 'APU', program: 'A & B' }} /></MemoryRouter>);
    const href = screen.getByRole('link').getAttribute('href')!;
    const url = new URL(href, 'https://example.test');
    expect(url.pathname).toBe('/apply');
    expect(url.searchParams.get('program')).toBe('A & B');
    expect(url.searchParams.get('university')).toBe('APU');
  });
  it('prefills the request and offers one submit action without consultation shortcuts', () => {
    render(<MemoryRouter initialEntries={['/apply?university=APU&program=Computing']}><ApplicationAssistance /></MemoryRouter>);
    expect(screen.getByDisplayValue('APU')).toBeTruthy();
    expect(screen.getByDisplayValue('Computing')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
