import { NextResponse } from 'next/server';
import { exec } from 'child_process';

// Extend Next.js API route timeout
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// In-memory cache (30s TTL)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

async function run(cmd: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve(stdout?.trim() || '');
    });
  });
}

function parseStatsLine(line: string) {
  // Parse: "CONTAINER ID  NAME  CPU%  MEM USAGE / LIMIT  MEM%  NET  BLOCK  PIDS"
  const parts = line.split(/\s{2,}/);
  if (parts.length < 7) return null;
  return {
    name: parts[1],
    mem: parts[3],
    mem_pct: parts[4],
    cpu: parts[2],
  };
}

function parseImageLine(line: string) {
  // Format: repo|tag|size|id (from --format)
  const parts = line.split('|');
  if (parts.length < 4) return null;
  return {
    repo: parts[0],
    tag: parts[1],
    size: parts[2],
    id: parts[3],
  };
}

export async function GET() {
  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedData);
  }
  try {
    // Run all commands in parallel for speed
    const [ramSwap, dockerStatsRaw, dockerImagesRaw, dockerSystemRaw, loadInfo, uptimeInfo, dfOut] = await Promise.all([
      run("free -m"),
      run("docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}'", 10000),
      run("sh -c \"docker images --format '{{.Repository}}|{{.Tag}}|{{.Size}}|{{.ID}}'\""),
      run("docker system df"),
      run("cat /proc/loadavg"),
      run("uptime -p 2>/dev/null || echo N/A"),
      run("df / | tail -1"),
    ]);
    
    let cpuCount = 4;
    try {
      const cpuInfo = await run("grep -c ^processor /proc/cpuinfo");
      cpuCount = parseInt(cpuInfo) || 4;
    } catch { /* default */ }

    // Parse RAM
    const ramLine = ramSwap.split('\n').find(l => l.startsWith('Mem:'));
    const swapLine = ramSwap.split('\n').find(l => l.startsWith('Swap:'));
    const ramParts = ramLine?.split(/\s+/) || [];
    const swapParts = swapLine?.split(/\s+/) || [];

    const ram = {
      total_mb: parseInt(ramParts[1]) || 0,
      used_mb: parseInt(ramParts[2]) || 0,
      free_mb: parseInt(ramParts[3]) || 0,
      bufcache_mb: parseInt(ramParts[5]) || 0,
      available_mb: parseInt(ramParts[6]) || 0,
    };

    const swap = {
      total_mb: parseInt(swapParts[1]) || 0,
      used_mb: parseInt(swapParts[2]) || 0,
      free_mb: parseInt(swapParts[3]) || 0,
    };

    // Parse disk
    const dfParts = dfOut.split(/\s+/);
    const diskUsedKb = parseInt(dfParts[2]) || 0;
    const diskFreeKb = parseInt(dfParts[3]) || 0;
    const disk = {
      total_gb: Math.round((diskUsedKb + diskFreeKb) / 1048576) || 193,
      used_gb: Math.round(diskUsedKb / 1048576),
      free_gb: Math.round(diskFreeKb / 1048576),
      percent: parseInt(dfParts[4]) || 0,
    };

    // Parse docker stats (pipe-delimited: Name|CPU%|MemUsage|Mem%)
    const statsLines = dockerStatsRaw.split('\n').filter(l => l.includes('|'));
    const containers = statsLines.map(line => {
      const parts = line.split('|');
      if (parts.length < 4) return null;
      return {
        name: parts[0].trim(),
        cpu: parts[1].trim(),
        mem: parts[2].trim(),
        memPercent: parts[3].trim(),
      };
    }).filter(Boolean);

    // Parse docker images (pipe-delimited from --format)
    const imageLines = dockerImagesRaw.split('\n').filter(l => l.includes('|'));
    const images = imageLines.map(parseImageLine).filter(Boolean);

    // Parse docker system df (tabular)
    const sysLines = dockerSystemRaw.split('\n').slice(1);
    const dockerSys: Record<string, any> = {};
    sysLines.forEach(line => {
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 4) {
        const key = parts[0].toLowerCase().replace(/\s+/g, '');
        dockerSys[`${key}_count`] = parts[1];
        dockerSys[`${key}_size`] = parts[3];
        dockerSys[`${key}_reclaimable`] = parts[4] || '';
      }
    });

    // Parse load
    const loadParts = loadInfo.split(/\s+/);
    const load = {
      '1min': parseFloat(loadParts[0]) || 0,
      '5min': parseFloat(loadParts[1]) || 0,
      '15min': parseFloat(loadParts[2]) || 0,
    };

    const result = {
      disk,
      ram,
      swap,
      containers,
      images,
      docker_system: {
        images_count: dockerSys['images_count'],
        images_size: dockerSys['images_size'],
        images_reclaimable: dockerSys['images_reclaimable'],
        containers_count: dockerSys['containers_count'],
        containers_size: dockerSys['containers_size'],
        containers_reclaimable: dockerSys['containers_reclaimable'],
        volumes_count: dockerSys['localvolumes_count'],
        volumes_size: dockerSys['localvolumes_size'],
        volumes_reclaimable: dockerSys['localvolumes_reclaimable'],
        buildcache_count: dockerSys['buildcache_count'],
        buildcache_size: dockerSys['buildcache_size'],
        buildcache_reclaimable: dockerSys['buildcache_reclaimable'],
      },
      load,
      cpu_count: cpuCount,
      uptime: uptimeInfo,
      timestamp: new Date().toISOString(),
    };
    cachedData = result;
    cacheTime = Date.now();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
