import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const TOPICS = {
  WORKFLOW_RUN_UPDATED: 'WORKFLOW_RUN_UPDATED',
};
