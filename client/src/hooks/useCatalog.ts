import { useEffect, useState } from "react";
import { api } from "../api";
import type { Program, University } from "../types";
import { PROGRAMS, UNIVERSITIES } from "../data";
export function useCatalog() {
  const [state, setState] = useState<{
    universities: University[];
    programs: Program[];
    loading: boolean;
    error: boolean;
    offline: boolean;
  }>({
    universities: [],
    programs: [],
    loading: true,
    error: false,
    offline: false,
  });
  useEffect(() => {
    let active = true;
    Promise.all([api.universities.list({ limit: "1000" }), api.programs.list()])
      .then(([u, p]) => {
        // Numeric IDs from a live catalog must never be joined to a cached snapshot.
        const offline = !!u.offline || !!p.offline;
        const universities = offline ? UNIVERSITIES : u.data;
        const programs = offline ? PROGRAMS : p.data;
        if (active)
          setState({
            universities,
            programs: programs.map((program) => {
              const university = universities.find(
                (item) => item.id === program.university_id,
              );
              return {
                ...program,
                university_name: university?.name ?? program.university_name,
                university_abbr: university?.abbr ?? program.university_abbr,
              };
            }),
            loading: false,
            error: false,
            offline,
          });
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
