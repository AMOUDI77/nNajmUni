import { useEffect, useState, useRef } from "react";
import { crmApi } from "./api";
export function useData<T>(path: string | null, refresh = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const loadedPath=useRef<string|null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    crmApi<T>(path)
      .then((r) => {
        if (active) {loadedPath.current=path;setData(r);}
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, refresh]);
  return { data: loadedPath.current===path?data:null, error, loading };
}
export function useDebounce(value: string, delay = 300) {
  const [v, set] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => set(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
export function ErrorBanner({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return message ? (
    <div className="crm-error" role="alert">
      {message}
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  ) : null;
}
export function Empty({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="crm-empty">
      <div className="crm-empty-mark">✧</div>
      <h2>{title}</h2>
      <p>{detail}</p>
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="crm-skeleton" role="status" aria-label="Loading">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="crm-avatar" aria-hidden="true">
      {name
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")}
    </span>
  );
}
export function date(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
}
export function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    inbox: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M3 13h5l2 3h4l2-3h5" />
      </>
    ),
    contacts: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0112 0v3M16 5a3 3 0 010 6M18 15a5 5 0 013 5" />
      </>
    ),
    automations: (
      <>
        <path d="m13 2-9 12h7l-1 8 10-13h-7z" />
      </>
    ),
    analytics: (
      <>
        <path d="M4 3v17h17M8 16v-4M13 16V8M18 16V4" />
      </>
    ),
    knowledge: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="m12 2 2 3 4-1 1 4 3 2-2 4 1 4-4 1-3 3-3-2-4 1-1-4-3-3 2-3-1-4 4-1z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
