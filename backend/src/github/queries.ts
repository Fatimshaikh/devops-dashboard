import { githubClient } from './client';
import { gql } from 'graphql-request';

const GET_REPO_INFO = gql`
  query GetRepoInfo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      description
      stargazerCount
      forkCount
      url
      pullRequests(states: OPEN) {
        totalCount
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

interface RepoInfoResponse {
  repository: {
    name: string;
    description: string | null;
    stargazerCount: number;
    forkCount: number;
    url: string;
    pullRequests: { totalCount: number };
    defaultBranchRef: {
      target: {
        checkSuites: { nodes: CheckSuiteNode[] };
      };
    } | null;
  };
}

export async function getRepoInfo(owner: string, name: string) {
  const data = await githubClient.request<RepoInfoResponse>(GET_REPO_INFO, {
    owner,
    name,
  });
  return data.repository;
}
