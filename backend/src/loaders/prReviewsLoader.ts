import DataLoader from 'dataloader';
import { githubClient } from '../github/client';
import { gql } from 'graphql-request';
import { withCache } from '../cache/withCache';

interface PRKey {
  owner: string;
  name: string;
  number: number;
}

interface PRResult {
  number: number;
  title: string;
  author: { login: string } | null;
  reviews: { nodes: { state: string; author: { login: string } | null }[] };
}

async function fetchBatchPRReviews(keys: readonly PRKey[]): Promise<PRResult[]> {
  console.log(`[DataLoader] Batching ${keys.length} PR review fetches into 1 request`);

  const { owner, name } = keys[0];

  const aliasedFields = keys
    .map(
      (k, i) => `
    pr${i}: pullRequest(number: ${k.number}) {
      number
      title
      author { login }
      reviews(first: 5) {
        nodes {
          state
          author { login }
        }
      }
    }`
    )
    .join('\n');

  const query = gql`
    query BatchPRReviews {
      repository(owner: "${owner}", name: "${name}") {
        ${aliasedFields}
      }
    }
  `;

  const data = await githubClient.request<Record<string, any>>(query);
  const repo = data.repository;

  return keys.map((_, i) => repo[`pr${i}`]);
}

async function batchGetPRReviews(keys: readonly PRKey[]): Promise<PRResult[]> {
  const { owner, name } = keys[0];
  const numbers = keys.map((k) => k.number).sort((a, b) => a - b).join(',');
  const cacheKey = `pr-batch:${owner}/${name}:${numbers}`;

  return withCache(cacheKey, () => fetchBatchPRReviews(keys));
}

export function createPRReviewsLoader() {
  return new DataLoader<PRKey, PRResult>(batchGetPRReviews, {
    cacheKeyFn: (key) => `${key.owner}/${key.name}#${key.number}`,
  });
}
