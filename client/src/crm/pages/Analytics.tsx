import { Empty, ErrorBanner, Skeleton, useData } from "../components";
type Analytics = {
  cards: Record<string, number | null>;
  daily: { day: string; count: number }[];
  funnel: { stage: string; count: number }[];
  workload: { full_name: string; count: number }[];
  sources: {
    id: number;
    campaign_name: string;
    media_id: string;
    contacts: number;
    leads: number;
    qualified: number;
  }[];
  attribution_note: string;
};
export default function Analytics() {
  const { data, loading, error } = useData<Analytics>("/analytics");
  if (loading) return <Skeleton />;
  if (!data) return <ErrorBanner message={error} />;
  const names: Record<string, string> = {
    conversations: "Conversations",
    unread: "Unread",
    linked_leads: "Linked leads",
    qualified: "Qualified",
    ai_used: "AI drafts used",
    average_first_response_seconds: "First response",
  };
  const max = Math.max(1, ...data.daily.map((d) => d.count));
  return (
    <main className="crm-page">
      <header className="crm-page-header">
        <div>
          <span className="crm-eyebrow">FROM INTEREST TO OPPORTUNITY</span>
          <h1>Analytics</h1>
          <p>Understand your conversations, sources and counselor workload.</p>
        </div>
        <span className="crm-tag">All-time workspace data</span>
      </header>
      <div className="crm-metric-grid">
        {Object.entries(names).map(([key, label]) => (
          <div key={key} className="crm-metric">
            <span>{label}</span>
            <strong>
              {data.cards[key] === null
                ? "—"
                : key === "average_first_response_seconds"
                  ? Math.round((data.cards[key] || 0) / 60) + " min"
                  : data.cards[key]}
            </strong>
          </div>
        ))}
      </div>
      <div className="crm-analytics-grid">
        <section className="crm-editor-section">
          <h2>Conversation activity</h2>
          <small>Last 30 days with recorded activity</small>
          {data.daily.length ? (
            <div
              className="crm-bar-chart"
              role="img"
              aria-label="Conversation count by date"
            >
              {data.daily.map((d) => (
                <div key={d.day} title={`${d.day}: ${d.count}`}>
                  <span>{d.count}</span>
                  <i
                    style={{
                      height: Math.max(4, (d.count / max) * 145) + "px",
                    }}
                  />
                  <small>{String(d.day).slice(5, 10)}</small>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No conversation data"
              detail="Activity appears as new conversations arrive."
            />
          )}
        </section>
        <section className="crm-editor-section">
          <h2>Student journey</h2>
          {data.funnel.map((f) => (
            <div className="crm-funnel-row" key={f.stage}>
              <span>{f.stage.toLowerCase()}</span>
              <strong>{f.count}</strong>
            </div>
          ))}
          {!data.funnel.length && (
            <p className="crm-muted">No contact stages recorded.</p>
          )}
        </section>
      </div>
      <section className="crm-editor-section">
        <h2>Instagram sources</h2>
        <p className="crm-muted">{data.attribution_note}</p>
        <div className="crm-table-scroll">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Contacts</th>
                <th>Leads</th>
                <th>Qualified</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.campaign_name}
                    {s.media_id && <small> · Media {s.media_id}</small>}
                  </td>
                  <td>{s.contacts}</td>
                  <td>{s.leads}</td>
                  <td>{s.qualified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="crm-editor-section">
        <h2>Counselor workload</h2>
        {data.workload.map((w) => (
          <div className="crm-funnel-row" key={w.full_name}>
            <span>{w.full_name}</span>
            <strong>{w.count} open</strong>
          </div>
        ))}
      </section>
    </main>
  );
}
