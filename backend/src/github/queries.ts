import { githubClient } from './client';
import { gql } from 'graphql-request';
import { withCache } from '../cache/withCache';

const GET_REPO_INFO = gql`
  query GetRepoInfo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      description
      stargazerCount
      forkCount
      url
      pullRequests(states: OPEN, first: 10) {
        totalCount
        nodes {
          number
          title
        }
      }
      defaultBranchRef {
        target {
          ... on Commit {
            checkSuites(first: 5) {
              nodes {
                status
                conclusion
                createdAt
                workflowRun {
                  workflow {
                    name
                  }
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface CheckSuiteNode {
  status: string;
  conclusion: string | null;
  createdAt: string;
  workflowRun: {
    workflow: { name: string };
    url: string;
  } | null;
}

interface PullRequestNode {
  number: number;
  title: string;
}

interface RepoInfoResponse {
  repository: {
    name: string;
    description: string | null;
    stargazerCount: number;
    forkCount: number;
    url: string;
    pullRequests: { totalCount: number; nodes: PullRequestNode[] };
    defaultBranchRef: {
      target: {
        checkSuites: { nodes: CheckSuiteNode[] };
      };
    } | null;
  };
}

async function fetchRepoInfo(owner: string, name: string) {
  const data = await githubClient.request<RepoInfoResponse>(GET_REPO_INFO, {
    owner,
    name,
  });
  return data.repository;
}

export async function getRepoInfo(owner: string, name: string) {
  return withCache(`repo:${owner}/${name}`, () => fetchRepoInfo(owner, name));
}

const GET_PR_REVIEWS = gql`
  query GetPRReviews($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        number
        title
        author {
          login
        }
        reviews(first: 5) {
          nodes {
            state
            author {
              login
            }
          }
        }
      }
    }
  }
`;

interface PRReviewsResponse {
  repository: {
    pullRequest: {
      number: number;
      title: string;
      author: { login: string } | null;
      reviews: { nodes: { state: string; author: { login: string } | null }[] };
    };
  };
}

export async function getPRReviews(owner: string, name: string, number: number) {
  const data = await githubClient.request<PRReviewsResponse>(GET_PR_REVIEWS, {
    owner,
    name,
    number,
  });
  return data.repository.pullRequest;
}
