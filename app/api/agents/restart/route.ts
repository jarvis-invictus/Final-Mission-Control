import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const ALLOWED_CONTAINERS: Record<string, string> = {
  jarvis: "openclaw-v1yl-openclaw-1",
  elon: "openclaw-elon",
  linus: "openclaw-linus",
  jordan: "openclaw-jordan",
  gary: "openclaw-gary",
  friend: "openclaw-friend",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, action } = body;

    if (!agentId || !ALLOWED_CONTAINERS[agentId]) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentId}. Allowed: ${Object.keys(ALLOWED_CONTAINERS).join(", ")}` },
        { status: 400 }
      );
    }

    const container = ALLOWED_CONTAINERS[agentId];
    const validActions = ["restart", "stop", "start", "pause", "unpause"];
    const cmd = validActions.includes(action) ? action : "restart";

    let statusBefore = "unknown";
    try {
      statusBefore = execSync(
        `docker inspect ${container} --format "{{.State.Status}}" 2>/dev/null`,
        { timeout: 5000 }
      ).toString().trim();
    } catch {}

    const output = execSync(`docker ${cmd} ${container} 2>&1`, {
      timeout: 120000,
    }).toString().trim();

    await new Promise(r => setTimeout(r, 3000));

    let statusAfter = "unknown";
    try {
      statusAfter = execSync(
        `docker inspect ${container} --format "{{.State.Status}}" 2>/dev/null`,
        { timeout: 5000 }
      ).toString().trim();
    } catch {}

    return NextResponse.json({
      success: true,
      agent: agentId,
      container,
      action: cmd,
      statusBefore,
      statusAfter,
      output,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute action", success: false },
      { status: 500 }
    );
  }
}
