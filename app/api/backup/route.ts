import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function run(cmd: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout?.trim() || "");
    });
  });
}

const BACKUP_DIR = "/tmp/invictus-backups";

const BACKUP_TARGETS: Record<string, { label: string; paths: string[]; description: string }> = {
  "agent-workspaces": {
    label: "Agent Workspaces",
    paths: [
      "/workspace/agents/elon",
      "/workspace/agents/jordan",
      "/workspace/agents/linus",
      "/workspace/agents/friend",
    ],
    description: "SOUL.md, MEMORY.md, HEARTBEAT.md, chat logs, and all workspace files for all agents",
  },
  "docs": {
    label: "Shared Docs",
    paths: ["/workspace/docs"],
    description: "SOPs, playbooks, and shared documentation",
  },
};

export async function GET() {
  // List existing backups
  try {
    await run(`mkdir -p ${BACKUP_DIR}`);
    const files = await run(`ls -lhtr ${BACKUP_DIR}/ 2>/dev/null || echo ""`);
    const backups = files.split("\n").filter(l => l.includes(".tar.gz")).map(line => {
      const parts = line.split(/\s+/);
      return {
        size: parts[4] || "",
        date: `${parts[5]} ${parts[6]} ${parts[7]}`,
        filename: parts[parts.length - 1] || "",
      };
    });

    // Disk info
    const diskInfo = await run("df -h / | tail -1");
    const diskParts = diskInfo.split(/\s+/);

    return NextResponse.json({
      backups,
      targets: Object.entries(BACKUP_TARGETS).map(([id, t]) => ({ id, ...t })),
      disk: {
        used: diskParts[2],
        available: diskParts[3],
        percent: diskParts[4],
      },
      backupDir: BACKUP_DIR,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target } = body;

    if (!target || !BACKUP_TARGETS[target]) {
      return NextResponse.json(
        { error: `Unknown backup target: ${target}. Available: ${Object.keys(BACKUP_TARGETS).join(", ")}` },
        { status: 400 }
      );
    }

    const config = BACKUP_TARGETS[target];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${target}-${timestamp}.tar.gz`;
    const filepath = `${BACKUP_DIR}/${filename}`;

    await run(`mkdir -p ${BACKUP_DIR}`);

    // Create compressed tarball
    const pathsStr = config.paths.join(" ");
    await run(`tar -czf ${filepath} ${pathsStr} 2>/dev/null || tar -czf ${filepath} --ignore-failed-read ${pathsStr}`, 120000);

    // Get file size
    const sizeOutput = await run(`ls -lh ${filepath} | awk {print }`);

    return NextResponse.json({
      success: true,
      filename,
      filepath,
      size: sizeOutput,
      target,
      label: config.label,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
