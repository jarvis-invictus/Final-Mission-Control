import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCOUNTS: Record<string, { token: string; label: string }> = {
  jarvis: { token: process.env.VERCEL_TOKEN_JARVIS || "", label: "Jarvis (Invictus)" },
  joyboy: { token: process.env.VERCEL_TOKEN_JOYBOY || "", label: "Joyboy (Sahil)" },
};

async function vFetch(url: string, token: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function GET(req: NextRequest): Promise<any> {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account") || "jarvis";
  const section = searchParams.get("section") || "overview";
  const projectId = searchParams.get("project");

  const acct = ACCOUNTS[account];
  if (!acct) return NextResponse.json({ error: "Unknown account", accounts: Object.keys(ACCOUNTS) }, { status: 400 });
  if (!acct.token) return NextResponse.json({ error: "No token configured" }, { status: 401 });

  /* ---------- PROJECT DETAIL ---------- */
  if (section === "project" && projectId) {
    const [project, deployments] = await Promise.all([
      vFetch(`https://api.vercel.com/v9/projects/${projectId}`, acct.token),
      vFetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`, acct.token),
    ]);

    return NextResponse.json({
      project: project ? {
        id: project.id,
        name: project.name,
        framework: project.framework,
        nodeVersion: project.nodeVersion,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        latestDeployments: project.latestDeployments?.map((d: any) => ({
          id: d.id,
          url: d.url,
          state: d.state || d.readyState,
          createdAt: d.createdAt,
          target: d.target,
        })),
        targets: project.targets,
        link: project.link,
      } : null,
      deployments: (deployments?.deployments || []).map((d: any) => ({
        id: d.uid,
        url: d.url,
        state: d.state || d.readyState,
        createdAt: d.created || d.createdAt,
        target: d.target,
        meta: {
          githubCommitSha: d.meta?.githubCommitSha?.slice(0, 7),
          githubCommitMessage: d.meta?.githubCommitMessage?.slice(0, 120),
          githubCommitAuthorName: d.meta?.githubCommitAuthorName,
          githubRepo: d.meta?.githubRepo,
        },
        source: d.source,
      })),
    });
  }

  /* ---------- OVERVIEW ---------- */
  const [projects, deployments] = await Promise.all([
    vFetch("https://api.vercel.com/v9/projects?limit=50", acct.token),
    vFetch("https://api.vercel.com/v6/deployments?limit=15", acct.token),
  ]);

  const projectList = (projects?.projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    framework: p.framework,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
    latestDeployment: p.latestDeployments?.[0] ? {
      url: p.latestDeployments[0].url,
      state: p.latestDeployments[0].state || p.latestDeployments[0].readyState,
      createdAt: p.latestDeployments[0].createdAt,
    } : null,
    targets: p.targets ? Object.keys(p.targets) : [],
    link: p.link,
  }));

  const deploymentList = (deployments?.deployments || []).map((d: any) => ({
    id: d.uid,
    name: d.name,
    url: d.url,
    state: d.state || d.readyState,
    createdAt: d.created || d.createdAt,
    target: d.target,
    meta: {
      githubCommitSha: d.meta?.githubCommitSha?.slice(0, 7),
      githubCommitMessage: d.meta?.githubCommitMessage?.slice(0, 120),
      githubRepo: d.meta?.githubRepo,
    },
    source: d.source,
  }));

  return NextResponse.json({
    account,
    label: acct.label,
    accounts: Object.entries(ACCOUNTS).map(([k, v]) => ({ key: k, label: v.label })),
    projects: projectList,
    recentDeployments: deploymentList,
    totalProjects: projectList.length,
    timestamp: new Date().toISOString(),
  });
}
