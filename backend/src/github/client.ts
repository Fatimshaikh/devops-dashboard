import { GraphQLClient } from 'graphql-request';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export const githubClient = new GraphQLClient(GITHUB_GRAPHQL_URL, {
  headers: {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  },
});
