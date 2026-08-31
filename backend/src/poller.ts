import { getRepoInfo } from './github/queries';
import { pubsub, TOPICS } from './pubsub';

const POLL_INTERVAL_MS = 30_000;

interface WatchedRepo {
  owner: string;
  name: string;
}

const WATCHED_REPOS: WatchedRepo[] = [
  { owner: 'facebook', name: 'react' },
  { owner: 'vercel', name: 'next.js' },
];

const lastKnownStatus = new Map<string, string>();

async function pollRepo(repo: WatchedRepo) {
  const key = `${repo.owner}/${repo.name}`;

  try {
    const info = await getRepoInfo(repo.owner, repo.name);
    const checkSuites = info.defaultBranchRef?.target?.checkSuites?.nodes ?? [];
    const latest = checkSuites[0];

    if (!latest) return;

    const currentSignature = `${latest.status}:${latest.conclusion}:${latest.createdAt}`;
    const previousSignature = lastKnownStatus.get(key);

    if (previousSignature && previousSignature !== currentSignature) {
      console.log(`[Poller] Change detected for ${key}, publishing update`);
      pubsub.publish(TOPICS.WORKFLOW_RUN_UPDATED, {
        workflowRunUpdated: {
          repo: key,
          name: latest.workflowRun?.workflow.name ?? 'Unknown',
          status: latest.status,
          conclusion: latest.conclusion,
          createdAt: latest.createdAt,
        },
      });
    }

    lastKnownStatus.set(key, currentSignature);
  } catch (err) {
    console.error(`[Poller] Error polling ${key}:`, err);
  }
}

export function startPolling() {
  console.log(`[Poller] Starting, watching ${WATCHED_REPOS.length} repos every ${POLL_INTERVAL_MS / 1000}s`);
  WATCHED_REPOS.forEach(pollRepo);

  setInterval(() => {
    WATCHED_REPOS.forEach(pollRepo);
  }, POLL_INTERVAL_MS);
}
