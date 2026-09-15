import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CRM from "./CRM";
const user = {
  id: 1,
  full_name: "Demo Counselor",
  email: "demo@example.test",
  role: "OWNER",
  status: "ACTIVE",
};
const conversation = {
  id: 1,
  contact_id: 1,
  display_name: "أحمد",
  stage: "NEW",
  preview: "أريد الدراسة",
  unread: true,
  control: "SUGGEST",
  status: "OPEN",
  assigned_to: null,
  labels: [],
  last_message_at: "2026-09-15T12:00:00Z",
};
const contact = {
  id: 1,
  display_name: "أحمد",
  stage: "NEW",
  degree_level: "Bachelor",
  lead_id: null,
  student_id: null,
  labels: [],
  notes: [],
  memory: [],
  touchpoints: [],
};
function mockApi(override?: (path: string, init?: RequestInit) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace("/api/crm", "");
      const replacement = override?.(path, init);
      if (replacement instanceof Error) throw replacement;
      if (replacement) return replacement;
      let data: unknown = {};
      if (path === "/auth/me") data = { user, csrf_token: "test-csrf" };
      else if (path.startsWith("/conversations?"))
        data = { items: [conversation], next_offset: null };
      else if (path === "/conversations/1") data = conversation;
      else if (path.startsWith("/conversations/1/messages"))
        data = {
          items: [
            {
              id: 1,
              text: "أريد الدراسة",
              direction: "INBOUND",
              sender_type: "CONTACT",
              status: "RECEIVED",
              created_at: "2026-09-15T12:00:00Z",
              attachments: [],
            },
          ],
          next_cursor: null,
        };
      else if (path === "/contacts/1") data = contact;
      else if (path === "/team") data = [user];
      else if (path.startsWith("/saved-replies"))
        data = [
          {
            id: 1,
            title: "Welcome",
            shortcut: "welcome",
            content: "Hello {{first_name}}, welcome to NajmUni.",
            status: "ACTIVE",
          },
        ];
      else if (
        path === "/labels" ||
        path.includes("/suggestions") ||
        path === "/automations"
      )
        data = [];
      return { ok: true, status: 200, json: async () => data };
    }),
  );
}
function show(path = "/crm/inbox") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/crm/*" element={<CRM />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CRM workflows", () => {
  beforeEach(() => mockApi());
  it("signs in using the dedicated staff form", async () => {
    let signed = false;
    mockApi((path) => {
      if (path === "/auth/me" && !signed)
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: "Sign in" }),
        };
      if (path === "/auth/login") {
        signed = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ user, csrf_token: "test" }),
        };
      }
    });
    show("/crm/login");
    await userEvent.type(
      await screen.findByLabelText("Work email"),
      "demo@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Password"),
      "a-long-test-password",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Inbox" })).toBeTruthy();
  });
  it("selects an Arabic conversation and shows contact context", async () => {
    show();
    await userEvent.click(await screen.findByText("أحمد"));
    expect(await screen.findByLabelText("Reply message")).toBeTruthy();
    expect(await screen.findByText("Bachelor")).toBeTruthy();
  });
  it("preserves a reply after a network failure", async () => {
    mockApi((path, init) => {
      if (path === "/conversations/1/messages" && init?.method === "POST")
        return new Error("Offline");
    });
    show("/crm/inbox/1");
    const composer = await screen.findByLabelText("Reply message");
    await userEvent.type(composer, "A reply that must not be lost");
    await userEvent.click(
      screen.getByRole("button", { name: "Send reply ↗" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((composer as HTMLTextAreaElement).value).toBe(
      "A reply that must not be lost",
    );
  });
  it("inserts a saved reply without sending it", async () => {
    show("/crm/inbox/1");
    const composer = await screen.findByLabelText("Reply message");
    await userEvent.type(composer, "/wel");
    await userEvent.click(await screen.findByText("Welcome"));
    expect((composer as HTMLTextAreaElement).value).toContain("welcome to NajmUni");
    expect(
      vi.mocked(fetch).mock.calls.some(([url, init]) =>
        String(url).endsWith("/conversations/1/messages") && init?.method === "POST",
      ),
    ).toBe(false);
  });
  it("applies server-side inbox filters", async () => {
    show();
    await userEvent.click(
      await screen.findByRole("button", { name: "Assigned to me" }),
    );
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([url]) => String(url).includes("view=mine")),
      ).toBe(true),
    );
  });
  it("lets an owner build question steps", async () => {
    show("/crm/automations/new");
    await userEvent.type(
      await screen.findByLabelText("Automation name"),
      "Study flow",
    );
    await userEvent.click(screen.getByRole("button", { name: "+ Add step" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Step 2 action"),
      "ASK_QUESTION",
    );
    expect(screen.getByLabelText("Save the next reply to")).toBeTruthy();
  });
});
