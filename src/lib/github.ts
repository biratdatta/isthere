/** Star count for the repo, fetched once per build (null if GitHub is unreachable or rate-limits us). */
export const repoStars: Promise<number | null> = fetch('https://api.github.com/repos/biratdatta/isthere', {
  headers: { accept: 'application/vnd.github+json', 'user-agent': 'isthere-build' },
  signal: AbortSignal.timeout(4000),
})
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => (typeof d?.stargazers_count === 'number' ? d.stargazers_count : null))
  .catch(() => null);
