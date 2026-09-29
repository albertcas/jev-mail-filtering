import { describe, expect, it } from "vitest";
import { checkRequest } from "@/server/guard";

const req = (method: string, headers: Record<string, string>) => new Request("http://127.0.0.1:3737/api/x", { method, headers });

describe("checkRequest", () => {
  it("allows local reads and same-origin writes", () => {
    expect(checkRequest(req("GET", { host: "127.0.0.1:3737" }), { demo: false, mutating: false })).toBeNull();
    expect(checkRequest(req("POST", { host: "localhost:3737", origin: "http://localhost:3737" }), { demo: false, mutating: true })).toBeNull();
  });
  it("blocks DNS-rebinding hosts and cross-origin writes", () => {
    expect(checkRequest(req("GET", { host: "evil.com" }), { demo: false, mutating: false })?.status).toBe(403);
    expect(checkRequest(req("POST", { host: "127.0.0.1:3737", origin: "https://evil.com" }), { demo: false, mutating: true })?.status).toBe(403);
    expect(checkRequest(req("POST", { host: "127.0.0.1:3737" }), { demo: false, mutating: true })?.status).toBe(403);
  });
  it("in demo mode allows any host for reads and blocks all writes", () => {
    expect(checkRequest(req("GET", { host: "jev-demo.vercel.app" }), { demo: true, mutating: false })).toBeNull();
    expect(checkRequest(req("POST", { host: "jev-demo.vercel.app", origin: "https://jev-demo.vercel.app" }), { demo: true, mutating: true })?.status).toBe(403);
  });
});
