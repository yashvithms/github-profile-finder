# GitHub Finder

A responsive React app for looking up GitHub users and exploring their public profiles and repositories. It uses the GitHub REST API and includes recent-search history and a light/dark theme toggle.

## Run locally

1. Install [Node.js](https://nodejs.org/).
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Open the local URL printed by Vite.

To create a production build, run `npm run build`.

## Notes

- No GitHub token is needed. The unauthenticated GitHub API has a rate limit, so wait a little and retry if you reach it.
- Recent searches and the selected theme are saved in this browser's local storage.
