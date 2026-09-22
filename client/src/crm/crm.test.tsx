import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CRM from "./CRM";
import VoiceRecorder from "./inbox/VoiceRecorder";
import MediaComposer, { validateMedia } from "./inbox/MediaComposer";
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
  voice_delivery_supported: true,
  capabilities: {
    canSendText: true, canSendImage: true, canSendAttachment: true,
    canSendAudio: true, canSendVoiceRecording: true,
    canSendTemplate: false, canSendQuickReplies: false,
  },
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
      else if (path === "/conversations/1/context")
        data = { source: null, events: [], reminders: [] };
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
    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeTruthy();
    expect(
      screen.queryByText("Connection lost. Your changes have not been saved."),
    ).toBeNull();
    await userEvent.type(
      screen.getByLabelText("Work email"),
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
      screen.getByRole("button", { name: "Send" }),
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
  it("opens saved replies from the composer button and inserts without sending", async () => {
    show("/crm/inbox/1");
    const composer = await screen.findByLabelText("Reply message");
    await userEvent.type(composer, "Context: ");
    await userEvent.click(screen.getByRole("button", { name: "Open saved replies" }));
    await userEvent.type(
      screen.getByLabelText("Search composer saved replies"),
      "welcome",
    );
    await userEvent.keyboard("{Enter}");
    expect((composer as HTMLTextAreaElement).value).toContain("Context: Hello");
    expect(
      vi.mocked(fetch).mock.calls.some(([url, init]) =>
        String(url).endsWith("/conversations/1/messages") && init?.method === "POST",
      ),
    ).toBe(false);
  });
  it("keeps a completed voice recording ready after an upload failure", async () => {
    class FakeMediaRecorder {
      static isTypeSupported() { return true; }
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-voice"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    mockApi((path, init) => {
      if (init?.body instanceof FormData)
        return new Error("Offline");
    });
    render(
      <VoiceRecorder
        conversationId={99}
        deliverySupported
        onSent={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Record voice message" }));
    expect(await screen.findByText(/Recording/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    await userEvent.click(await screen.findByRole("button", { name: "Send voice" }));
    expect(await screen.findByText(/ready to retry/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send voice" })).toBeTruthy();
  });
  it("explains microphone permission denial and allows cancelling a recording", async () => {
    class FakeMediaRecorder {
      static isTypeSupported() { return true; }
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable = null;
      onstop = null;
      onerror = null;
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; }
    }
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); }) },
    });
    const { rerender } = render(<VoiceRecorder conversationId={102} deliverySupported onSent={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Record voice message" }));
    expect(await screen.findByText(/permission was denied/i)).toBeTruthy();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
    });
    rerender(<VoiceRecorder conversationId={103} deliverySupported onSent={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Record voice message" }));
    expect(await screen.findByText(/Recording/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Record voice message" })).toBeTruthy();
  });
  it("validates media type and size before upload", () => {
    expect(validateMedia(new File(["plain"], "notes.txt", { type: "text/plain" }), "file"))
      .toBe("This file type cannot be sent through Instagram.");
    expect(validateMedia(new File(["image"], "photo.png", { type: "image/png" }), "image"))
      .toBe("");
    const oversized = new File(["image"], "huge.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 9 * 1024 * 1024 });
    expect(validateMedia(oversized, "image")).toBe("Images must be smaller than 8 MB.");
  });
  it("accepts image drop and paste while keeping internal notes media-free", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:dropped") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    show("/crm/inbox/1");
    const composer = await screen.findByLabelText("Reply message");
    const dropped = new File(["image"], "drop.png", { type: "image/png" });
    fireEvent.drop(composer, { dataTransfer: { files: [dropped] } });
    expect(await screen.findByText("drop.png")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    fireEvent.paste(composer, { clipboardData: { files: [dropped] } });
    expect(await screen.findByText("drop.png")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    await userEvent.click(screen.getByRole("button", { name: "Internal Note" }));
    const note = screen.getByLabelText("Private note");
    fireEvent.drop(note, { dataTransfer: { files: [dropped] } });
    expect(screen.queryByTestId("media-draft")).toBeNull();
  });
  it("previews and removes an image without sending it", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:image") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const file = new File(["image"], "campus.png", { type: "image/png" });
    render(<MediaComposer
      conversationId={44}
      capabilities={conversation.capabilities}
      text=""
      incomingFile={{ file, token: "direct-preview" }}
      onSent={vi.fn()}
    />);
    expect(await screen.findByAltText("Selected upload preview")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(screen.queryByTestId("media-draft")).toBeNull();
  });
  it("keeps attachment drafts scoped to their conversation and obeys capabilities", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:scoped") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const file = new File(["image"], "scoped.png", { type: "image/png" });
    const { rerender } = render(<MediaComposer conversationId={71} capabilities={conversation.capabilities} text="" incomingFile={{ file, token: "one" }} onSent={vi.fn()} />);
    expect(await screen.findByText("scoped.png")).toBeTruthy();
    const disabled = { ...conversation.capabilities, canSendImage: false, canSendAttachment: false };
    rerender(<MediaComposer conversationId={72} capabilities={disabled} text="" onSent={vi.fn()} />);
    expect(screen.queryByText("scoped.png")).toBeNull();
    expect(screen.getByRole("button", { name: "Choose image" }).hasAttribute("disabled")).toBe(true);
    rerender(<MediaComposer conversationId={71} capabilities={conversation.capabilities} text="" onSent={vi.fn()} />);
    expect(await screen.findByText("scoped.png")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
  });
  it("applies server-side inbox filters", async () => {
    show();
    await userEvent.click(
      await screen.findByRole("button", { name: "Mine" }),
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
  it("shows an owner a clear platform setup state", async () => {
    mockApi((path) => {
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: false,
            connected: false,
            account_username: null,
            mode: "live",
            accounts: [],
          }),
        };
    });
    show("/crm/settings/integrations");
    expect(await screen.findByText("Setup required")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect Instagram" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Complete Instagram Setup" }));
    expect(await screen.findByText(/Meta secrets are never entered in CRM/)).toBeTruthy();
  });
  it("directs non-owners to the workspace owner when setup is missing", async () => {
    mockApi((path) => {
      if (path === "/auth/me")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            user: { ...user, role: "COUNSELOR" },
            csrf_token: "test-csrf",
          }),
        };
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: false,
            connected: false,
            account_username: null,
            mode: "live",
            accounts: [],
          }),
        };
    });
    show("/crm/settings/integrations");
    expect(
      await screen.findByText("Ask your workspace owner to finish Instagram setup."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Complete Instagram Setup" })).toBeNull();
  });
  it("enables Instagram OAuth when platform configuration is ready", async () => {
    mockApi((path) => {
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: true,
            connected: false,
            account_username: null,
            mode: "live",
            accounts: [],
          }),
        };
    });
    show("/crm/settings/integrations");
    expect(await screen.findByText("Ready to connect")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect Instagram" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(/official Instagram website/)).toBeTruthy();
  });
  it.each([
    ["cancelled", "Instagram authorization was cancelled. Nothing was changed."],
    ["error", "Instagram could not be connected. Try again or review the Meta app setup."],
  ])("shows the safe OAuth %s result", async (result, message) => {
    mockApi((path) => {
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: true,
            connected: false,
            account_username: null,
            mode: "live",
            accounts: [],
          }),
        };
    });
    show(`/crm/settings/integrations?instagram=${result}`);
    expect(await screen.findByText(message)).toBeTruthy();
  });
  it("shows connected capabilities, health, sync, and safe actions", async () => {
    mockApi((path) => {
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: true,
            connected: true,
            account_username: "najmuni",
            mode: "live",
            accounts: [
              {
                id: 7,
                username: "najmuni",
                status: "CONNECTED",
                token_expires_at: "2026-11-20T12:00:00Z",
                last_webhook_at: null,
                last_sync_at: null,
                connection_health: "HEALTHY",
                permissions: { messages: true, comments: true },
                sync: null,
              },
            ],
          }),
        };
    });
    show("/crm/settings/integrations?instagram=connected");
    expect(await screen.findByText("@najmuni")).toBeTruthy();
    expect(screen.getByText("Instagram connected successfully.")).toBeTruthy();
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(screen.getAllByText("Enabled")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Sync Conversations" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });
  it("shows incremental Instagram synchronization progress", async () => {
    mockApi((path) => {
      if (path === "/integrations/instagram")
        return {
          ok: true,
          status: 200,
          json: async () => ({
            configured: true,
            connected: true,
            account_username: "najmuni",
            mode: "live",
            accounts: [
              {
                id: 1,
                username: "najmuni",
                status: "CONNECTED",
                token_expires_at: null,
                last_webhook_at: null,
                last_sync_at: null,
                connection_health: "HEALTHY",
                permissions: { messages: true, comments: true },
                sync: {
                  id: 9,
                  status: "PROCESSING",
                  result: null,
                  safe_error: null,
                  progress: {
                    state: "RUNNING",
                    pages_processed: 83,
                    conversations_seen: 1240,
                    imported_conversations: 1240,
                    imported_messages: 18500,
                    skipped_existing: 420,
                    unavailable: 0,
                    last_progress_at: "2026-09-22T10:00:00Z",
                  },
                },
              },
            ],
          }),
        };
    });
    show("/crm/settings/integrations");
    expect(
      await screen.findByText(
        /1,240 conversations imported · 18,500 messages imported · 83 pages processed/,
      ),
    ).toBeTruthy();
  });
});
