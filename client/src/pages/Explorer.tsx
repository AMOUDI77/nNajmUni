import { useCopy } from '../copy';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { levels, useCatalog } from '../discovery';
import { studyFields } from '../studyFields';
import { institutionSearchNames, programSearchIntent, programSearchScore, searchScore } from '../catalogSearch';
import { ProgramCard, UniversityCard } from '../components/StudyCards';
import InstitutionIdentity from '../components/InstitutionIdentity';
import AdvisorLink from '../components/AdvisorLink';
import CatalogSearchInput from '../components/CatalogSearchInput';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Explorer() {
  const { tr, language: copyLanguage } = useCopy();
  const catalog = useCatalog();
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [allFields, setAllFields] = useState(false);
  const q = params.get('q') || '', field = params.get('field') || '', level = params.get('level') || '', university = params.get('university') || '', location = params.get('location') || '', sort = params.get('sort') || '';
  const category = ['universities', 'institutes'].includes(params.get('category') || '') ? params.get('category')! : 'programs';
  const shown = Math.max(12, Math.min(3000, Number(params.get('shown')) || 12));
  const update = (key: string, value: string) => setParams(old => {
    const next = new URLSearchParams(old); next.delete('shown');
    value ? next.set(key, value) : next.delete(key);
    if (key === 'field') next.delete('q');
    if (key === 'university' && field && !catalog.programs.some(p => String(p.university_id) === value && p.field === field)) next.delete('field');
    return next;
  }, { replace: true });
  const universitiesById = useMemo(() => new Map(catalog.universities.map(u => [u.id, u])), [catalog.universities]);
  const scope = catalog.programs.filter(p => !university || String(p.university_id) === university);
  const fields = studyFields.map(f => ({ ...f, count: scope.filter(p => p.field === f.key).length })).filter(f => f.count > 0);
  const selectedField = studyFields.find(f => f.key === field);
  const results = useMemo(() => catalog.programs.map(p => ({ ...p, score: programSearchScore(q, p, institutionSearchNames(universitiesById.get(p.university_id)?.name || '', universitiesById.get(p.university_id)?.abbr || '')) }))
    .filter(p => p.score > 0 && (!university || String(p.university_id) === university) && (!field || p.field === field) && (!level || p.level === level) && (!location || universitiesById.get(p.university_id)?.location === location))
    .sort((a, b) => sort === 'fee' ? (a.tuition_per_year || Infinity) - (b.tuition_per_year || Infinity) || a.name.localeCompare(b.name)
      : b.score - a.score || ['bachelor','diploma','foundation','master','phd','certificate','postgraduate_diploma','other'].indexOf(a.level) - ['bachelor','diploma','foundation','master','phd','certificate','postgraduate_diploma','other'].indexOf(b.level) || Number(/transfer|bridging/i.test(a.name)) - Number(/transfer|bridging/i.test(b.name)) || a.name.localeCompare(b.name)), [catalog.programs, universitiesById, q, university, field, level, location, sort]);
  const universities = catalog.universities.filter(u => searchScore(q, institutionSearchNames(u.name, u.abbr)) > 0 && (!location || u.location === location));
  const institutes = catalog.institutes.filter(i => searchScore(q, institutionSearchNames(i.name, i.abbr)) > 0 && (!location || i.location === location));
  const count = category === 'programs' ? results.length : category === 'universities' ? universities.length : institutes.length;
  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const names = new Set<string>();
    return [...catalog.universities.map(u => ({ key: `u${u.id}`, name: u.name, caption: `جامعة · ${u.abbr}`, category: 'universities', query: u.abbr, score: searchScore(q, institutionSearchNames(u.name, u.abbr)) })),
      ...catalog.programs.map(p => ({ key: `p${p.id}`, name: p.name, caption: `تخصص · ${universitiesById.get(p.university_id)?.abbr || ''}`, category: 'programs', query: p.name, score: programSearchScore(q, p) }))]
      .filter(s => s.score > 0).sort((a,b) => b.score - a.score).filter(s => { if (names.has(s.query)) return false; names.add(s.query); return true; }).slice(0, 6);
  }, [q, catalog.universities, catalog.programs, universitiesById]);
  const locations = [...new Set((category === 'institutes' ? catalog.institutes : catalog.universities).map(u => u.location))].sort();
  const activeCount = [q, field, university, level, location].filter(Boolean).length;
  const returnTo = '/explore?' + params.toString();

  return <main className="discovery-page" dir={copyLanguage === "ar" ? "rtl" : "ltr"}>
    <section className="discovery-hero">
      <div><p className="discovery-kicker">{tr("اختيارك يبدأ من هنا")}</p><h1>{tr("تخصص تفهمه.")}<br /><span>{tr("وجامعة تناسبك.")}</span></h1><p>{tr("اكتشف المجالات، قارن خيارات الدراسة، واعرف وش ينتظرك قبل ما تقرر.")}</p>
      <div className="discovery-metrics"><span><strong>{tr(catalog.loading ? '—' : catalog.universities.length)}</strong> {tr("جامعة وجهة تعليمية")}</span><span><strong>{tr(catalog.loading ? '—' : catalog.programs.length.toLocaleString())}</strong> {tr("برنامج في الدليل")}</span><span><strong>{tr(catalog.loading ? '—' : fields.length)}</strong> {tr("مجالًا دراسيًا")}</span></div></div>
      <div className="discovery-route"><span>{tr("رحلتك للاختيار")}</span><div><b>01</b><p>{tr("اختَر المجال")}<small>{tr("وش الشيء اللي تحب تتعلّمه؟")}</small></p></div><div><b>02</b><p>{tr("اكتشف التخصص")}<small>{tr("المحتوى، المسارات، المدة والتكلفة")}</small></p></div><div><b>03</b><p>{tr("حدّد جامعتك")}<small>{tr("قارن خياراتك وابدأ طلبك")}</small></p></div></div>
    </section>
    <nav className="discovery-tabs" aria-label={tr("نوع النتائج")}>{[['programs','اكتشف التخصصات'],['universities','تصفّح الجامعات'],['institutes','معاهد اللغة']].map(([key,title]) => <button key={key} type="button" aria-pressed={category === key} onClick={() => setParams({ category: key }, { replace: true })}>{tr(title)}<span>{key === 'programs' ? catalog.programs.length : key === 'universities' ? catalog.universities.length : catalog.institutes.length}</span></button>)}</nav>
    {category === 'programs' && <section className="discovery-fields" aria-label={tr("اختر مجالك الدراسي")}>
      <div className="discovery-section-title"><div><p>{tr("ابدأ باهتمامك")}</p><h2>{tr("أي مجال يشدّك؟")}</h2></div><button className="discovery-text-button" onClick={() => setAllFields(v => !v)}>{tr(allFields ? 'عرض أقل' : 'كل المجالات ←')}</button></div>
      <div className="field-grid">{(allFields ? fields : fields.filter((f, i) => i < 6 || f.key === field)).map(f => <button key={f.key} type="button" className="field-tile" aria-pressed={field === f.key} style={{ '--field-color': f.color } as React.CSSProperties} onClick={() => update('field', field === f.key ? '' : f.key)}><span className="field-symbol" aria-hidden="true">{tr(f.icon)}</span><strong>{tr(f.title)}</strong><small>{f.count} {tr("برنامج")}</small><span className="field-tile-arrow" aria-hidden="true">↙</span></button>)}</div>
      {selectedField && <div className="subject-choices"><strong>{tr("قرّب اختيارك:")}</strong><button type="button" aria-pressed={!q} onClick={() => update('q','')}>{tr("كل تخصصات المجال")}</button>{selectedField.terms.map(term => <button type="button" key={term} aria-pressed={q === term} onClick={() => update('q',term)}>{tr(term)}</button>)}</div>}
    </section>}
    <form className="discovery-search" onSubmit={e => { e.preventDefault(); document.getElementById('explorer-results')?.focus(); }}><label htmlFor="explorer-query">{tr(category === 'universities' ? 'ابحث عن الجامعة' : 'ابحث باسم التخصص أو الجامعة')}</label><CatalogSearchInput value={q} onChange={value => update('q',value)} suggestions={suggestions} onSelect={item => setParams(old => { const next = new URLSearchParams(old); next.delete('shown'); next.set('category', item.category); const intent = programSearchIntent(item.query); next.set('q', item.category === 'programs' ? intent.text : item.query); if (item.category === 'programs' && intent.level && !next.get('level')) next.set('level', intent.level); return next; }, { replace: true })}/><button className="student-button">{tr("ابحث ←")}</button></form>
    <div className="discovery-workspace">
      <aside className="discovery-sidebar"><details open={!isMobile}><summary>{tr("خصّص خياراتك")}{activeCount > 0 && <span>{activeCount}</span>}</summary><div className="discovery-filter-body">
        {category === 'programs' && <><label>{tr("الجامعة")}<select value={university} onChange={e => update('university',e.target.value)}><option value="">{tr("كل الجامعات")}</option>{catalog.universities.map(u => <option key={u.id} value={u.id}>{tr(u.abbr)} · {tr(u.name)}</option>)}</select></label>
        <label>{tr("المجال الدراسي")}<select value={field} onChange={e => update('field',e.target.value)}><option value="">{tr("كل المجالات")}</option>{fields.map(f => <option key={f.key} value={f.key}>{tr(f.title)} ({f.count})</option>)}</select></label>
        <label>{tr("المرحلة الدراسية")}<select value={level} onChange={e => update('level',e.target.value)}><option value="">{tr("كل المراحل")}</option>{Object.entries(levels).map(([key,title]) => <option key={key} value={key}>{tr(title)}</option>)}</select></label></>}
        <label>{tr("المدينة")}<select value={location} onChange={e => update('location',e.target.value)}><option value="">{tr("كل المدن")}</option>{locations.map(city => <option key={city} value={city}>{tr(city)}</option>)}</select></label>
        {activeCount > 0 && <button className="discovery-text-button" onClick={() => setParams({ category })}>{tr("مسح كل الفلاتر")}</button>}
      </div></details><div className="discovery-help"><span>{tr("مو متأكد من اختيارك؟")}</span><p>{tr("ابدأ باهتماماتك وميزانيتك، ورتّب خياراتك خطوة بخطوة.")}</p><Link to="/study-plan">{tr("جهّز خطتك الدراسية ←")}</Link></div></aside>
      <section id="explorer-results" className="discovery-results" tabIndex={-1} aria-busy={catalog.loading}>
        <div className="discovery-results-bar"><div><h2>{tr(category === 'universities' ? 'جامعات تفتح لك خيارات' : selectedField ? `تخصصات ${selectedField.title}` : category === 'institutes' ? 'ابدأ من اللغة' : 'اكتشف برنامجك القادم')}</h2><p aria-live="polite">{catalog.loading ? tr('جارٍ تحميل الخيارات…') : `${count.toLocaleString()} ${tr(category === 'programs' ? 'برنامج' : 'نتيجة')}${q ? ` · «${q}»` : ''}`}</p></div>{category === 'programs' && <label>{tr("ترتيب النتائج")}<select value={sort} onChange={e => update('sort',e.target.value)}><option value="">{tr("الأقرب لاختيارك")}</option><option value="fee">{tr("الرسوم: الأقل أولًا")}</option></select></label>}</div>
        {catalog.offline && <p className="student-notice">{tr("تعذّر التحديث؛ نعرض الدليل المحفوظ.")}<button onClick={catalog.retry}>{tr("إعادة المحاولة")}</button></p>}
        {!catalog.loading && !count && <div className="study-empty"><h3>{tr("نوسّع البحث شوي؟")}</h3><p>{tr("جرّب تخصصًا آخر أو أزل أحد الفلاتر للوصول لخيارات أكثر.")}</p><button className="student-button secondary" onClick={() => setParams({ category })}>{tr("عرض كل الخيارات")}</button></div>}
        <div className="study-results-grid">{!catalog.loading && category === 'programs' && results.slice(0,shown).map(p => <ProgramCard key={p.id} program={p} university={universitiesById.get(p.university_id)} returnTo={returnTo}/>)}
        {!catalog.loading && category === 'universities' && universities.slice(0,shown).map(u => <UniversityCard key={u.id} university={u} programs={catalog.programs.filter(p => p.university_id === u.id)}/>)}
        {!catalog.loading && category === 'institutes' && institutes.slice(0,shown).map(i => <article className="study-program-card" key={i.id}><InstitutionIdentity {...i}/><h3>{tr("طوّر لغتك الإنجليزية")}</h3><p>{tr(i.description)}</p><AdvisorLink context={{ university:i.name, program:'دراسة اللغة' }}/></article>)}</div>
        {!catalog.loading && count > shown && <button className="discovery-load-more" onClick={() => setParams(old => { const next = new URLSearchParams(old); next.set('shown', String(shown+12)); return next; }, { replace:true })}>{tr("عرض خيارات أكثر")}<span>({count-shown} {tr("متبقي)")}</span> ↓</button>}
        <p className="discovery-data-note">{tr("الرسوم والمدد مرجعية للتخطيط. نؤكد التوفر والرسوم النهائية مع الجامعة قبل تقديمك.")}</p>
      </section>
    </div>
  </main>;
}
