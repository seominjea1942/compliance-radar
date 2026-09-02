# Working in this repo

Two agents work in this repo at the same time: a backend session (Python
triage pipeline, TiDB schema and views) and a frontend session (`web/`). These
conventions exist because they share one worktree.

## 1. Branch per agent

Work on a branch, merge into `master` via PR. Never commit directly to
`master` except for shared conventions like this file.

```
be/<topic>     backend session, e.g. be/weekly-topics-view
fe/<topic>     frontend session, e.g. fe/home-screen
```

## 2. Stage by path. Never `git add -A`

This is the rule that matters most. `git add -A` and `git commit -a` sweep up
the *other* agent's in-progress files, producing commits whose message
describes one change and whose diff contains someone else's half-finished
work. It has already happened once (`abc83ab`).

```bash
git add web/                 # frontend
git add agent/ db/ sources/  # backend — name the paths
```

Before committing, check nothing else came along:

```bash
git diff --cached --name-only
```

## 3. Path ownership

| Path | Owner |
|---|---|
| `web/` | frontend |
| everything else | backend |
| `docs/ui-data-contract.md` | backend writes, frontend reads |

The contract is the interface between the two sessions. If a screen needs a
shape the contract does not cover, the frontend asks for a **view change**
rather than writing a bespoke query — the DB views are the single source of
truth for both languages. Open requests live in `web/lib/pending-views.ts`.

## 4. Never rewrite pushed history

No `--amend`, rebase or force-push on anything already pushed. The other
session may have it checked out; a rewrite loses their work rather than yours.
A follow-up commit is always the cheaper fix.

## 5. Secrets

`.env.local` is gitignored at the repo root and in `web/`. Keep it that way.
Deploys read their credentials from the host's environment settings (Vercel
project env vars for the frontend), never from a committed file.
