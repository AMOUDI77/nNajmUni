import { useEffect, useState } from "react";
import { api } from "../api";
import type { Institute } from "../types";
import {
  Action,
  Notice,
  PageIntro,
  consultationHref,
  money,
  useCopy,
} from "../components/public/UI";
export default function Institutes() {
  const c = useCopy();
  const [items, setItems] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  useEffect(() => {
    let active = true;
    api.institutes.list().then((r) => {
      if (active) {
        setItems(r.data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main id="main-content" className="nu-container nu-page">
      <PageIntro
        title={c("معاهد وخيارات اللغة", "Institutes and language options")}
      >
        {c(
          "استكشف خيارات الدليل، وراجع مدة الدورة ورسومها ومتطلباتك مع المستشار.",
          "Explore the directory and confirm course duration, fees and requirements with an advisor.",
        )}
      </PageIntro>
      <Notice />
      <div className="nu-filters">
        <label>
          {c("ابحث عن معهد", "Search institutes")}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      {loading && <p role="status">{c("جاري التحميل…", "Loading…")}</p>}
      <div className="nu-university-grid">
        {items
          .filter((i) =>
            `${i.name} ${i.abbr}`.toLowerCase().includes(q.toLowerCase()),
          )
          .map((i) => (
            <article className="nu-university" key={i.id}>
              <span className="nu-university-mark">{i.abbr}</span>
              <h2 dir="auto">{i.name}</h2>
              <p dir="auto">{i.location}</p>
              <p>
                {c(
                  "نطاق الرسوم في الدليل؛ مدة الباقة تحتاج تأكيدًا",
                  "Directory fee range; package duration needs confirmation",
                )}
              </p>
              <strong dir="ltr">
                {money(i.tuition_min)} – {money(i.tuition_max)}
              </strong>
              <Action
                secondary
                to={consultationHref({ source: "institute", choice: i.name })}
              >
                {c("راجع هذا المعهد", "Review this institute")}
              </Action>
            </article>
          ))}
      </div>
      {!loading &&
        !items.filter((i) =>
          `${i.name} ${i.abbr}`.toLowerCase().includes(q.toLowerCase()),
        ).length && (
          <p>
            {c(
              "لا توجد نتائج. جرّب اسمًا آخر.",
              "No matches. Try another name.",
            )}
          </p>
        )}
    </main>
  );
}
