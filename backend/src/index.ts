import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
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
    context: async () => ({
      loaders: {
        prReviews: createPRReviewsLoader(),
      },
    }),
  });

  console.log(`Server ready at ${url}`);
}

main();
