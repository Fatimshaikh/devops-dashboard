import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLError } from 'graphql';
import { typeDefs, resolvers } from './schema';
import { createPRReviewsLoader } from './loaders/prReviewsLoader';

export interface MyContext {
  loaders: {
    prReviews: ReturnType<typeof createPRReviewsLoader>;
  };
}

async function main() {
  const server = new ApolloServer<MyContext>({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 },
    context: async ({ req }) => {
      const apiKey = req.headers['x-api-key'];

      if (apiKey !== process.env.API_KEY) {
        throw new GraphQLError('Unauthorized: invalid or missing API key', {
          extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
        });
      }

      return {
        loaders: {
          prReviews: createPRReviewsLoader(),
        },
      };
    },
  });

  console.log(`Server ready at ${url}`);
}

main();
