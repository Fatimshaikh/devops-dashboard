import { useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import { gql } from '@apollo/client';
import './App.css';

const GET_REPOSITORIES = gql`
  query GetRepositories($repos: [RepoInput!]!) {
    repositories(repos: $repos) {
      name
      description
      stars
      forks
      url
      openPullRequests
      recentWorkflowRuns {
        name
        status
        conclusion
        createdAt
      }
    }
  }
`;

const WORKFLOW_RUN_SUBSCRIPTION = gql`
  subscription OnWorkflowRunUpdated {
    workflowRunUpdated {
      repo
      name
      status
      conclusion
      createdAt
    }
  }
`;

interface RepoInput {
  owner: string;
  name: string;
}

interface WorkflowEvent {
  repo: string;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
}

function LiveFeed() {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);

  useSubscription(WORKFLOW_RUN_SUBSCRIPTION, {
    onData: ({ data }) => {
      const event = data.data?.workflowRunUpdated;
      if (event) {
        setEvents((prev) => [event, ...prev].slice(0, 10));
      }
    },
  });

  return (
    <div className="live-feed">
      <h2>Live Updates</h2>
      {events.length === 0 && (
        <p className="muted">Listening for workflow run changes...</p>
      )}
      {events.map((event, i) => (
        <div key={i} className="feed-item">
          <strong>{event.repo}</strong> — {event.name}: {event.conclusion ?? event.status}
          <span className="feed-time">
            {new Date(event.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [watchedRepos, setWatchedRepos] = useState<RepoInput[]>([
    { owner: 'facebook', name: 'react' },
    { owner: 'vercel', name: 'next.js' },
  ]);
  const [ownerInput, setOwnerInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_REPOSITORIES, {
    variables: { repos: watchedRepos },
  });

  function handleAddRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerInput.trim() || !nameInput.trim()) return;
    setWatchedRepos([...watchedRepos, { owner: ownerInput.trim(), name: nameInput.trim() }]);
    setOwnerInput('');
    setNameInput('');
  }

  return (
    <div className="dashboard">
      <h1>DevOps Dashboard</h1>

      <form onSubmit={handleAddRepo} className="add-repo-form">
        <input
          placeholder="owner (e.g. facebook)"
          value={ownerInput}
          onChange={(e) => setOwnerInput(e.target.value)}
        />
        <input
          placeholder="repo (e.g. react)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <button type="submit">Add Repo</button>
        <button type="button" onClick={() => refetch()}>Refresh</button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Error: {error.message}</p>}

      <div className="main-layout">
        <div className="repo-grid">
          {data?.repositories?.map((repo: any) => (
            <div key={repo.url} className="repo-card">
              <h2>
                <a href={repo.url} target="_blank" rel="noreferrer">{repo.name}</a>
              </h2>
              <p>{repo.description}</p>
              <div className="repo-stats">
                <span>⭐ {repo.stars.toLocaleString()}</span>
                <span>🍴 {repo.forks.toLocaleString()}</span>
                <span>🔀 {repo.openPullRequests} open PRs</span>
              </div>
              <div className="workflow-runs">
                {repo.recentWorkflowRuns.length === 0 && <p className="muted">No recent CI runs</p>}
                {repo.recentWorkflowRuns.map((run: any, i: number) => (
                  <div key={i} className={`run-badge ${run.conclusion?.toLowerCase()}`}>
                    {run.name}: {run.conclusion ?? run.status}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <LiveFeed />
      </div>
    </div>
  );
}

export default App;
