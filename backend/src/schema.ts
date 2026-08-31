import gql from 'graphql-tag';
import { getRepoInfo } from './github/queries';

export const typeDefs = gql`
  type WorkflowRun {
    name: String!
    status: String!
    conclusion: String
    createdAt: String!
    url: String
  }

  type Repository {
    name: String!
    description: String
    stars: Int!
    forks: Int!
    url: String!
    openPullRequests: Int!
    recentWorkflowRuns: [WorkflowRun!]!
  }

  input RepoInput {
    owner: String!
    name: String!
  }

  type Query {
    health: String!
    repository(owner: String!, name: String!): Repository
    repositories(repos: [RepoInput!]!): [Repository!]!
  }
`;

function formatRepo(repo: Awaited<ReturnType<typeof getRepoInfo>>) {
  const checkSuites = repo.defaultBranchRef?.target?.checkSuites?.nodes ?? [];

  return {
    name: repo.name,
    description: repo.description,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    url: repo.url,
    openPullRequests: repo.pullRequests.totalCount,
    recentWorkflowRuns: checkSuites
      .filter((cs) => cs.workflowRun !== null)
      .map((cs) => ({
        name: cs.workflowRun!.workflow.name,
        status: cs.status,
        conclusion: cs.conclusion,
        createdAt: cs.createdAt,
        url: cs.workflowRun!.url,
      })),
  };
}

export const resolvers = {
  Query: {
    health: () => 'GraphQL server is running 🚀',
    repository: async (_: unknown, args: { owner: string; name: string }) => {
      const repo = await getRepoInfo(args.owner, args.name);
      return formatRepo(repo);
    },
    repositories: async (
      _: unknown,
      args: { repos: { owner: string; name: string }[] }
    ) => {
      const results = await Promise.all(
        args.repos.map((r) => getRepoInfo(r.owner, r.name))
      );
      return results.map(formatRepo);
    },
  },
};
