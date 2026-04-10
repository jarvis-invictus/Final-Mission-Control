import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_PAT = process.env.GITHUB_PAT || "";
const ORG = "jarvis-invictus";

async function ghFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    // Get repos — try org first, fall back to user
    let repos = await ghFetch(`https://api.github.com/orgs/${ORG}/repos?sort=pushed&per_page=20`);
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      repos = await ghFetch(`https://api.github.com/user/repos?sort=pushed&per_page=20`) || [];
    }

    // Get recent commits from top 5 repos
    const commits: any[] = [];
    for (const repo of repos.slice(0, 5)) {
      try {
        const repoCommits = await ghFetch(`https://api.github.com/repos/${ORG}/${repo.name}/commits?per_page=5`);
        if (repoCommits) {
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
      } catch {}
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
    }));

    return NextResponse.json({
      org: ORG,
      repos: repoSummaries,
      recentCommits: commits.slice(0, 25),
      totalRepos: repos.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}
