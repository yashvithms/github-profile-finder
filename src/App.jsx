import React, { useEffect, useState } from "react";

const HISTORY_KEY = "github-finder-history";
const THEME_KEY = "github-finder-theme";

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function Icon({ name, size = 18, ...props }) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };

  if (name === "search") {
    return (
      <svg {...shared}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
    );
  }
  if (name === "moon") {
    return (
      <svg {...shared}>
        <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" />
      </svg>
    );
  }
  if (name === "external") {
    return (
      <svg {...shared}>
        <path d="M14 3h7v7m0-7-10 10" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    );
  }
  if (name === "repo") {
    return (
      <svg {...shared}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...shared}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg {...shared}>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }
  if (name === "company") {
    return (
      <svg {...shared}>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V4h8v3M3 12h18m-11 0v2h4v-2" />
      </svg>
    );
  }
  return null;
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      <span className="stat-icon">
        <Icon name={icon} size={17} />
      </span>
      <div>
        <strong>{(value ?? 0).toLocaleString()}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function App() {
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [searchVersion, setSearchVersion] = useState(0);
  const [profile, setProfile] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoError, setRepoError] = useState("");
  const [history, setHistory] = useState(() => {
    const saved = readStorage(HISTORY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });
  const [theme, setTheme] = useState(() => {
    const saved = readStorage(THEME_KEY, "light");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!username) return undefined;

    const controller = new AbortController();
    async function fetchProfile() {
      setLoading(true);
      setError("");
      setRepoError("");
      setProfile(null);
      setRepositories([]);

      try {
        const response = await fetch(
          `https://api.github.com/users/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`We couldn’t find a GitHub user named “${username}”.`);
          }
          if (response.status === 403 || response.status === 429) {
            throw new Error("GitHub’s API rate limit was reached. Please try again in a little while.");
          }
          throw new Error("GitHub couldn’t load this profile. Please try again.");
        }

        const user = await response.json();
        setProfile(user);

        try {
          const repoResponse = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`,
            { signal: controller.signal },
          );
          if (!repoResponse.ok) {
            throw new Error("Public repositories are temporarily unavailable.");
          }
          const repos = await repoResponse.json();
          setRepositories(repos);
        } catch (repositoryError) {
          if (repositoryError.name !== "AbortError") {
            setRepoError(repositoryError.message || "Couldn’t load public repositories.");
          }
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError instanceof TypeError
              ? "Unable to connect to GitHub. Check your internet connection and try again."
              : requestError.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [username, searchVersion]);

  function search(event) {
    event.preventDefault();
    const cleaned = input.trim().replace(/^@/, "");
    if (!cleaned) {
      setError("Enter a GitHub username to get started.");
      setProfile(null);
      return;
    }
    setError("");
    setInput(cleaned);
    setUsername(cleaned);
    setSearchVersion((current) => current + 1);
    setHistory((current) => [
      cleaned,
      ...current.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
    ].slice(0, 5));
  }

  function searchHistory(value) {
    setInput(value);
    setUsername(value);
    setSearchVersion((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="GitHub Finder home">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.31 3.08 1.75.1-.72.4-1.21.72-1.49-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3.01 0 4.3-2.61 5.24-5.1 5.52.4.35.76 1.03.76 2.08V22c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
            </svg>
          </span>
          <span>github<span className="brand-accent">finder</span></span>
        </a>
        <div className="topbar-right">
          <span className="topbar-note">A little window into the open-source world</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE DEVELOPER DIRECTORY</div>
          <h1 id="page-title">Find your people<span>.</span></h1>
          <p className="hero-copy">
            Explore the humans behind the code. Search any GitHub username to get a closer look.
          </p>

          <form className="search-form" onSubmit={search}>
            <Icon name="search" size={20} />
            <label className="sr-only" htmlFor="username">GitHub username</label>
            <span className="input-prefix">@</span>
            <input
              id="username"
              type="text"
              placeholder="Enter a GitHub username"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            <button type="submit" disabled={loading}>
              {loading ? <span className="button-spinner" /> : "Find profile"}
              {!loading && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          {history.length > 0 && (
            <div className="history-row">
              <span className="history-label">RECENT</span>
              {history.map((item) => (
                <button key={item} type="button" onClick={() => searchHistory(item)}>{item}</button>
              ))}
            </div>
          )}
        </section>

        <section className="results" aria-live="polite" aria-busy={loading}>
          {loading && (
            <div className="state-card loading-card">
              <span className="loader" />
              <strong>Finding your developer...</strong>
              <span>Fetching the latest from GitHub</span>
            </div>
          )}
          {!loading && error && (
            <div className="state-card error-card" role="alert">
              <span className="error-icon">!</span>
              <strong>That didn’t go as planned</strong>
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && !profile && (
            <div className="empty-state">
              <div className="empty-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <span className="empty-star">✳</span>
                <span className="empty-planet"><Icon name="search" size={28} /></span>
                <span className="empty-spark">✦</span>
              </div>
              <h2>Curiosity looks good on you.</h2>
              <p>Type a username above and let’s see what they’re building.</p>
              <span className="try-example">TRY AN EXAMPLE <button type="button" onClick={() => searchHistory("octocat")}>octocat <span aria-hidden="true">↗</span></button></span>
            </div>
          )}

          {!loading && profile && (
            <div className="profile-layout">
              <article className="profile-card">
                <div className="card-topline"><span>PROFILE</span><span className="live-badge"><i /> PUBLIC</span></div>
                <div className="profile-identity">
                  <img className="avatar" src={profile.avatar_url} alt={`${profile.login}'s profile`} />
                  <div className="identity-copy">
                    <h2>{profile.name || profile.login}</h2>
                    <a className="username" href={profile.html_url} target="_blank" rel="noreferrer">@{profile.login}</a>
                  </div>
                </div>
                <p className={`bio${profile.bio ? "" : " bio-muted"}`}>
                  {profile.bio || "This developer prefers to let their work do the talking."}
                </p>
                {(profile.location || profile.company) && (
                  <div className="profile-meta">
                    {profile.location && <span><Icon name="pin" size={16} />{profile.location}</span>}
                    {profile.company && <span><Icon name="company" size={16} />{profile.company}</span>}
                  </div>
                )}
                <div className="stats">
                  <Stat icon="repo" value={profile.public_repos} label="Repositories" />
                  <Stat icon="users" value={profile.followers} label="Followers" />
                  <Stat icon="users" value={profile.following} label="Following" />
                </div>
                <a className="github-link" href={profile.html_url} target="_blank" rel="noreferrer">
                  Visit GitHub profile <Icon name="external" size={16} />
                </a>
              </article>

              <section className="repos-section" aria-labelledby="repos-title">
                <div className="repos-heading">
                  <div>
                    <span className="section-kicker">A GLIMPSE AT THE WORK</span>
                    <h2 id="repos-title">Public repositories <span>{profile.public_repos}</span></h2>
                  </div>
                  <a href={`${profile.html_url}?tab=repositories`} target="_blank" rel="noreferrer" aria-label="See all repositories">
                    See all <Icon name="external" size={14} />
                  </a>
                </div>
                {repoError ? (
                  <p className="repo-message">{repoError}</p>
                ) : repositories.length > 0 ? (
                  <div className="repo-grid">
                    {repositories.map((repo) => (
                      <a className="repo-card" key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer">
                        <div className="repo-name"><Icon name="repo" size={16} /><strong>{repo.name}</strong><Icon name="external" size={13} /></div>
                        <p>{repo.description || "No description just yet."}</p>
                        <div className="repo-details">
                          {repo.language && <span><i className="language-dot" />{repo.language}</span>}
                          <span>☆ {repo.stargazers_count.toLocaleString()}</span>
                          <span>⑂ {repo.forks_count.toLocaleString()}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="repo-message">No public repositories to show yet.</p>
                )}
              </section>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Made for the curious <span className="footer-heart">♥</span></span>
        <span>Powered by the GitHub API <span className="footer-dot" /> Built for discovery</span>
      </footer>
    </div>
  );
}

export default App;
