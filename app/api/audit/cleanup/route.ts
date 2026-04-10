import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

async function run(cmd: string, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      // Always resolve — even on error, return what we got
      if (err) resolve(stderr?.trim() || stdout?.trim() || err.message || "Command failed");
      else resolve(stdout?.trim() || "Done");
    });
  });
}

interface CleanupAction {
  id: string;
  label: string;
  description: string;
  risk: "safe" | "moderate" | "aggressive";
}

const ACTIONS: Record<string, CleanupAction[]> = {
  "node-modules": [{
    id: "node-modules",
    label: "Clean node_modules from old projects",
    description: "Removes node_modules/ and .next/ folders from stale Linus workspace projects (dental-nextjs-demo, ReportFlow, mc-dashboard). These are build artifacts that can be reinstalled.",
    risk: "safe",
  }],
  "docker-containers": [{
    id: "docker-containers",
    label: "Remove stopped containers",
    description: "Removes containers that have exited/stopped. Running containers are NOT affected. Frees disk space from old container layers.",
    risk: "safe",
  }],
  "docker-build-cache": [{
    id: "docker-build-cache",
    label: "Clear Docker build cache",
    description: "Removes cached layers from previous 'docker build' runs. Next build will be slower but you reclaim disk space. No running containers affected.",
    risk: "safe",
  }],
  "journal": [{
    id: "journal",
    label: "Vacuum system logs (keep 3 days)",
    description: "Removes systemd journal logs older than 3 days. Recent logs are kept for debugging. This is standard Linux maintenance.",
    risk: "safe",
  }],
  "docker-images": [{
    id: "docker-images",
    label: "Remove unused Docker images",
    description: "Removes images not used by any container. WARNING: If you need to restart a stopped container, its image may need to be re-pulled. Running container images are safe.",
    risk: "moderate",
  }],
};

export async function GET() {
  // Return available cleanup actions with descriptions
  const allActions = Object.values(ACTIONS).flat();
  return NextResponse.json({ actions: allActions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const results: Record<string, string> = {};

    switch (action) {
      case "node-modules": {
        const dirs = [
          "/workspace/agents/linus/dental-nextjs-demo",
          "/workspace/agents/linus/ReportFlow",
          "/workspace/agents/linus/mc-dashboard",
          "/workspace/agents/linus/dental-demos",
          "/workspace/agents/linus/invictus-crm",
        ];
        for (const d of dirs) {
          const nm = `${d}/node_modules`;
          const nx = `${d}/.next`;
          results[d] = await run(`rm -rf ${nm} ${nx} 2>&1 && echo "Cleaned"`);
        }
        break;
      }
      case "docker-containers": {
        results.containers = await run("docker container prune -f 2>&1");
        break;
      }
      case "docker-build-cache": {
        results.buildcache = await run("docker builder prune -f 2>&1");
        break;
      }
      case "journal": {
        results.journal = await run("journalctl --vacuum-time=3d 2>&1");
        break;
      }
      case "docker-images": {
        results.images = await run("docker image prune -f 2>&1");
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use GET to see available actions.` }, { status: 400 });
    }

    // Get new disk usage after cleanup
    const diskAfter = await run("df -h / | tail -1 | awk '{print $3, $4, $5}'");

    return NextResponse.json({ success: true, action, results, diskAfter });
  } catch (err) {
    console.error("[audit/cleanup] Error:", err);
    return NextResponse.json(
      { error: "Cleanup failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
