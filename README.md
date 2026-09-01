# DevOps Dashboard

A full-stack GraphQL application that aggregates GitHub repository, pull request,
and CI/CD workflow data into a single unified API, with real-time updates via
GraphQL Subscriptions.

## Live Features

- **Multi-repo GraphQL aggregation** — fetch data for multiple repositories in a single request
- **GitHub Actions integration** — pulls live CI/CD workflow run status per repo
- **N+1 query resolution** — uses DataLoader with GraphQL query aliasing to batch
  per-pull-request review fetches into a single API call instead of firing one
  request per item
- **Redis caching** — cache-aside pattern reduces GitHub API calls and improves
  response latency
- **API key authentication** — protects the GraphQL endpoint from unauthorized access
- **Real-time subscriptions** — WebSocket-based GraphQL subscriptions push live
  workflow status updates to connected clients, powered by a background polling
  service and a pub/sub event system

## Stack

**Backend:** Node.js, TypeScript, Apollo Server, Express, GraphQL, DataLoader,
Redis (ioredis), graphql-ws, GitHub GraphQL API

**Frontend:** React, TypeScript, Apollo Client, Vite

**Infra:** Docker (Redis)

## Architecture
┌─────────────┐ ┌──────────────────┐ ┌─────────────┐
│ React │◄─────►│ Apollo Server │◄─────►│ GitHub │
│ Frontend │ HTTP │ (GraphQL API) │ HTTPS │ GraphQL API│
│ │◄─────►│ │ │ │
└─────────────┘ WS └──────────────────┘ └─────────────┘
│ │
▼ ▼
┌───────┐ ┌────────────┐
│ Redis │ │ Poller + │
│ Cache │ │ PubSub │
└───────┘ └────────────┘


## Running Locally

Requires Node.js, Docker, and a GitHub personal access token.

```bash
# Start Redis
docker compose up -d

# Backend
cd backend
npm install
npm run dev   # http://localhost:4000/graphql

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Both `backend/.env` and `frontend/.env` require a `GITHUB_TOKEN`, `API_KEY`
(shared secret between frontend and backend), and standard port/URL config.
See `.env.example` in each directory (not committed) for required keys.

## Key Engineering Decisions

- **DataLoader + query aliasing**: Rather than firing one GitHub API request
  per pull request (N+1), a DataLoader batches all requested PR numbers within
  a single event-loop tick into one aliased GraphQL query, cutting API calls
  from N to 1.
- **Poll-and-publish for subscriptions**: Since GitHub webhooks require a
  public URL, live updates are achieved by polling watched repositories on an
  interval and publishing changes through an in-memory PubSub, which
  WebSocket-connected clients subscribe to. This is a common pattern when
  webhook infrastructure isn't available, and a natural upgrade path once
  deployed publicly.
