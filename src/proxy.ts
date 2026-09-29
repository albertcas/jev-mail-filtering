import { NextResponse, type NextRequest } from "next/server";
import { isLocalHost } from "@/server/guard";

/**
 * DNS-rebinding defence for every route, pages included: outside the demo the
 * app only answers when the Host header is this machine's loopback, so a
 * rebound hostname can never read the settings or setup pages. API routes
 * still run checkRequest for the Origin check on writes.
 */
export function proxy(request: NextRequest) {
  if (process.env.DEMO_MODE === "1") return NextResponse.next();
  if (!isLocalHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "non_local_host" }, { status: 403 });
  }
  return NextResponse.next();
}
