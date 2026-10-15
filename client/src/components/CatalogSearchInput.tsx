import { useEffect, useId, useRef, useState } from "react";
export interface SearchSuggestion {
  key: string;
  name: string;
  caption: string;
  category: string;
  query: string;
  score: number;
}
export default function CatalogSearchInput({
  value,
  onChange,
  suggestions,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
}) {
  const listId = useId(),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const expanded = open && value.trim().length > 0;
  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});
  }, [active, expanded, listId]);
  const select = (suggestion: SearchSuggestion) => {
    onSelect(suggestion);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  };
  return (
    <div
      className="catalog-autocomplete"
      onBlur={(e) => {
        // Keep layout stable when clicking the category/filter controls in the same form.
        if (!e.currentTarget.closest('form')?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="catalog-input-wrap">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          ref={input}
          id="explorer-query"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={
            expanded && active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder="اكتب: تايلور، صنواي، APU…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                suggestions.length
                  ? e.key === "ArrowDown"
                    ? (i + 1) % suggestions.length
                    : i <= 0
                      ? suggestions.length - 1
                      : i - 1
                  : -1,
              );
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            } else if (e.key === "Enter") {
              if (expanded && active >= 0 && suggestions[active]) {
                e.preventDefault();
                select(suggestions[active]);
              } else setOpen(false);
            }
          }}
        />
        {value && (
          <button
            className="catalog-clear"
            type="button"
            aria-label="مسح البحث"
            onClick={() => {
              onChange("");
              setActive(-1);
              input.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>
      {expanded && (
        <div className="catalog-suggestions">
          <div className="catalog-suggestions-label">أقرب الخيارات لبحثك</div>
          <ul id={listId} role="listbox" aria-label="اقتراحات البحث">
            {suggestions.map((item, index) => (
              <li
                key={item.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active === index}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                onMouseEnter={() => setActive(index)}
              >
                <span>
                  <strong dir="auto">{item.name}</strong>
                  <small>{item.caption}</small>
                </span>
                <span aria-hidden="true">↖</span>
              </li>
            ))}
          </ul>
          {!suggestions.length && (
            <p role="status">
              ما لقينا اسمًا قريبًا. جرّب الاختصار أو حروفًا أقل.
            </p>
          )}
          <div className="catalog-suggestions-hint">
            النتائج تتحدث أثناء الكتابة · ↑ ↓ للاختيار وEnter للتأكيد
          </div>
        </div>
      )}
    </div>
  );
}
