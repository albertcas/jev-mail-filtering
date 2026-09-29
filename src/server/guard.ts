const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function hostname(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  return hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0]!;
}

/** True when a Host header names this machine's loopback (DNS-rebinding defence). Pure: shared by proxy.ts and the API guard. */
export function isLocalHost(hostHeader: string | null): boolean {
  const host = hostname(hostHeader);
  return host !== null && LOCAL_HOSTS.has(host);
}

export function checkRequest(req: Request, opts: { demo: boolean; mutating: boolean }): Response | null {
  const forbid = (reason: string) => Response.json({ error: reason }, { status: 403 });
  if (opts.demo) return opts.mutating ? forbid("demo_read_only") : null;
  if (!isLocalHost(req.headers.get("host"))) return forbid("non_local_host");
  if (opts.mutating) {
    const origin = req.headers.get("origin");
    if (!origin) return forbid("missing_origin");
    try {
      // WHATWG URL keeps brackets for IPv6 hostnames ("[::1]").
      const o = new URL(origin);
      if (!LOCAL_HOSTS.has(o.hostname)) return forbid("cross_origin");
      // Same host:port as the Host header, so pages on other local ports cannot write.
      if (o.host !== req.headers.get("host")) return forbid("cross_origin");
    } catch {
      return forbid("bad_origin");
    }
  }
  return null;
}
