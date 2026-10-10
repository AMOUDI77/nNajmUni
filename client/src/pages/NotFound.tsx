import { Action, PageIntro, useCopy } from "../components/public/UI";
export default function NotFound() {
  const c = useCopy();
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        eyebrow="404"
        title={c("هذه الصفحة غير موجودة", "This page could not be found")}
      >
        {c(
          "ارجع للرئيسية أو استكشف البرامج المتاحة في دليلنا.",
          "Return home or explore programs in our directory.",
        )}
      </PageIntro>
      <Action to="/">{c("العودة للرئيسية", "Back to home")}</Action>
    </main>
  );
}
