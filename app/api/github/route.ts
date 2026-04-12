import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ============================================
   GitHub API — Multi-account, repo details
   ============================================ */

const ACCOUNTS: Record<string, { pat: string; type: "org" | "user"; owner?: string }> = {
  "jarvis-invictus": { pat: process.env.GITHUB_PAT || "", type: "user", owner: "jarvis-invictus" },
  "sahil-b-09": { pat: process.env.GITHUB_PAT_SAHIL || "", type: "user" },
};

async function ghFetch(url: string, pat: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<any> {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account") || "jarvis-invictus";
  const section = searchParams.get("section") || "overview";
  const repoName = searchParams.get("repo");

  const acct = ACCOUNTS[account];
  if (!acct) {
    return NextResponse.json({ error: `Unknown account: ${account}`, accounts: Object.keys(ACCOUNTS) }, { status: 400 });
  }
  const pat = acct.pat;
  if (!pat) {
    return NextResponse.json({ error: "No PAT configured for this account" }, { status: 401 });
  }

  /* Resolve actual username for user accounts */
  let owner = account;
  if (acct.type === "user") {
    const me = await ghFetch("https://api.github.com/user", pat);
    if (me?.login) owner = me.login;
  }

  /* ---------- REPO DETAIL ---------- */
  if (section === "repo" && repoName) {
    const [repo, commits, branches, readme] = await Promise.all([
      ghFetch(`https://api.github.com/repos/${owner}/${repoName}`, pat),
      ghFetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=20`, pat),
      ghFetch(`https://api.github.com/repos/${owner}/${repoName}/branches?per_page=10`, pat),
      ghFetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, pat),
    ]);

    let readmeContent = "";
    if (readme?.content) {
      try {
        readmeContent = Buffer.from(readme.content, "base64").toString("utf-8").slice(0, 3000);
      } catch {}
    }

    const commitList = (commits || []).map((c: any) => ({
      sha: c.sha?.slice(0, 7),
      fullSha: c.sha,
      message: c.commit?.message?.split("\n")[0]?.slice(0, 120),
      fullMessage: c.commit?.message?.slice(0, 500),
      author: c.commit?.author?.name || c.author?.login || "unknown",
      authorAvatar: c.author?.avatar_url,
      date: c.commit?.author?.date,
      url: c.html_url,
      stats: c.stats,
    }));

    return NextResponse.json({
      repo: repo ? {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        size: repo.size,
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at,
        createdAt: repo.created_at,
        isPrivate: repo.private,
        url: repo.html_url,
        topics: repo.topics || [],
      } : null,
      commits: commitList,
      branches: (branches || []).map((b: any) => ({ name: b.name, protected: b.protected })),
      readme: readmeContent,
    });
  }

  /* ---------- OVERVIEW (repo list + recent commits) ---------- */
  let repos;
  if (acct.owner) {
    // Specific owner — fetch their repos directly
    repos = await ghFetch(`https://api.github.com/users/${acct.owner}/repos?sort=pushed&per_page=30`, pat);
  } else {
    // Authenticated user's own repos
    repos = await ghFetch(`https://api.github.com/user/repos?sort=pushed&per_page=30&type=owner`, pat);
  }
  if (!repos || !Array.isArray(repos)) repos = [];

  // Get recent commits from top 5 repos
  const commits: any[] = [];
  for (const repo of repos.slice(0, 5)) {
    const repoCommits = await ghFetch(`https://api.github.com/repos/${owner}/${repo.name}/commits?per_page=5`, pat);
    if (repoCommits && Array.isArray(repoCommits)) {
      for (const c of repoCommits) {
        commits.push({
          repo: repo.name,
          sha: c.sha?.slice(0, 7),
          message: c.commit?.message?.split("\n")[0]?.slice(0, 100),
          author: c.commit?.author?.name || c.author?.login || "unknown",
          date: c.commit?.author?.date,
          url: c.html_url,
        });
      }
    }
  }
  commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const repoSummaries = repos.map((r: any) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    pushedAt: r.pushed_at,
    updatedAt: r.updated_at,
    isPrivate: r.private,
    url: r.html_url,
    defaultBranch: r.default_branch,
    size: r.size,
    topics: r.topics || [],
  }));

  return NextResponse.json({
    account,
    accounts: Object.keys(ACCOUNTS),
    repos: repoSummaries,
    recentCommits: commits.slice(0, 25),
    totalRepos: repos.length,
    timestamp: new Date().toISOString(),
  });
}
