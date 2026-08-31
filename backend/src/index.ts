import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { GraphQLError } from 'graphql';
import { typeDefs, resolvers } from './schema';
import { createPRReviewsLoader } from './loaders/prReviewsLoader';
import { startPolling } from './poller';

export interface MyContext {
  loaders: {
    prReviews: ReturnType<typeof createPRReviewsLoader>;
  };
}

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer<MyContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
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
    })
  );

  const PORT = Number(process.env.PORT) || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
    console.log(`Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });

  startPolling();
}

main();
