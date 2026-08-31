import gql from 'graphql-tag';
import { getRepoInfo } from './github/queries';
import type { MyContext } from './index';

export const typeDefs = gql`
  type WorkflowRun {
    name: String!
    status: String!
    conclusion: String
    createdAt: String!
    url: String
  }

  type Review {
    state: String!
    author: String
  }

  type PullRequestDetail {
    number: Int!
    title: String!
    author: String
    reviews: [Review!]!
  }

  type Repository {
    name: String!
    description: String
    stars: Int!
    forks: Int!
    url: String!
    openPullRequests: Int!
    recentWorkflowRuns: [WorkflowRun!]!
    pullRequestsWithReviews: [PullRequestDetail!]!
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

function formatRepo(
  repo: Awaited<ReturnType<typeof getRepoInfo>>,
  owner: string,
  name: string
) {
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
    _owner: owner,
    _name: name,
    _prNumbers: repo.pullRequests.nodes.map((n) => n.number),
  };
}

export const resolvers = {
  Query: {
    health: () => 'GraphQL server is running 🚀',
    repository: async (_: unknown, args: { owner: string; name: string }) => {
      const repo = await getRepoInfo(args.owner, args.name);
      return formatRepo(repo, args.owner, args.name);
    },
    repositories: async (
      _: unknown,
      args: { repos: { owner: string; name: string }[] }
    ) => {
      const results = await Promise.all(
        args.repos.map((r) => getRepoInfo(r.owner, r.name))
      );
      return results.map((repo, i) =>
        formatRepo(repo, args.repos[i].owner, args.repos[i].name)
      );
    },
  },
  Repository: {
    // FIXED VERSION: uses DataLoader to batch all PR requests for this repo
    // into a single GitHub API call, instead of one call per PR.
    pullRequestsWithReviews: async (
      parent: ReturnType<typeof formatRepo>,
      _args: unknown,
      context: MyContext
    ) => {
      const results = await Promise.all(
        parent._prNumbers.map((num) =>
          context.loaders.prReviews.load({
            owner: parent._owner,
            name: parent._name,
            number: num,
          })
        )
      );
      return results.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.author?.login ?? null,
        reviews: pr.reviews.nodes.map((r) => ({
          state: r.state,
          author: r.author?.login ?? null,
        })),
      }));
    },
  },
};
