import { useCopy } from '../copy';
import { Link } from 'react-router-dom';

export default function VisaGuide() {
  const { tr, language: copyLanguage } = useCopy();
  return <main className="student-page visa-guide" dir={copyLanguage === "ar" ? "rtl" : "ltr"}>
    <header><p className="student-eyebrow">{tr("جهّز رحلتك إلى ماليزيا")}</p><h1>{tr("دليل الفيزا الدراسية")}</h1>
      <p>{tr("من القبول الجامعي إلى تصريح الطالب: أهم المراحل والمستندات في مكان واحد.")}</p>
    </header>
    <section className="student-card">
      <h2>{tr("من وين تبدأ؟")}</h2>
      <ol>
        <li><strong>{tr("القبول أولًا:")}</strong> {tr("احصل على خطاب قبول من المؤسسة التعليمية واتبع تعليماتها لفتح طلب تصريح الطالب عبر EMGS.")}</li>
        <li><strong>{tr("جهّز ملفك:")}</strong> {tr("راجع قائمة المستندات أدناه مع الجامعة، ثم تابع الطلب حتى صدور خطاب الموافقة الإلكتروني (eVAL).")}</li>
        <li><strong>{tr("قبل السفر:")}</strong> {tr("تحقق من متطلبات تأشيرة الدخول حسب جنسيتك، ونسّق الوصول مع الجامعة بعد الموافقات المطلوبة.")}</li>
        <li><strong>{tr("بعد الوصول:")}</strong> {tr("أكمل الفحص الطبي وإجراءات اعتماد تصريح الطالب بالتنسيق مع الجامعة وEMGS.")}</li>
      </ol>
    </section>
    <section className="student-card">
      <h2>{tr("قائمة تجهيز المستندات")}</h2>
      <ul><li>{tr("جواز السفر ونسخ الصفحات المطلوبة.")}</li><li>{tr("صورة شخصية بالمواصفات المحددة.")}</li><li>{tr("خطاب القبول من الجامعة أو المعهد.")}</li><li>{tr("الشهادات الدراسية وكشوف الدرجات.")}</li><li>{tr("الإقرار الصحي وإثبات اللغة عند طلبه.")}</li></ul>
      <p>{tr("قد تختلف المستندات المطلوبة باختلاف الجنسية والمؤسسة ونوع الطلب. راجع القائمة الرسمية قبل تجهيز النسخ أو دفع الرسوم.")}</p>
    </section>
    <section className="student-card">
      <h2>{tr("الرسوم ومتابعة الطلب")}</h2><p>{tr("تختلف الرسوم حسب المؤسسة ومدة الدراسة ونوع الطلب. نراجع معك التفاصيل والخطوة التالية ضمن طلب قبولك.")}</p>
    </section>
    <p>{tr("هذا الدليل للتجهيز الأولي؛ التعليمات المعتمدة لحالتك تصدر من الجامعة وEMGS والجهات المختصة.")}</p>
    <Link className="student-button secondary" to="/study-plan">{tr("رتّب خطتك الدراسية")}</Link>
  </main>;
}
