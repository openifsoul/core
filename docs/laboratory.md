# Local laboratory

The first executable slice uses the real TypeScript runtime and SQLite store,
an original synthetic host and an explicitly labeled **deterministic synthetic
scenario controller**. It is not live LLM inference or a general rules agent.
There is no network, API key, actual game, graphical UI or cloud resource.

Use Node 22.18+ and locally installed dependencies from core:

```sh
pnpm lab demo --db .local/lab/ifsoul.sqlite
pnpm lab inspect --db .local/lab/ifsoul.sqlite --json
pnpm lab chat --db .local/lab/ifsoul.sqlite --message "What did you complete?" --json
pnpm lab --help
```

`--db` is resolved relative to the working directory. The default is
`.local/lab/ifsoul.sqlite`. Demo never deletes or overwrites a database. Repeating
the completed scenario reuses its recorded outcome without executing host work
again. Use a different database path for a new independent run. All commands
close their owned database in `finally`; there is no persistent server. Node's
experimental SQLite warning may appear on stderr, separate from JSON stdout.
Inspect requires an existing database and lab character, and writes no character,
context or history events. A missing database returns `not-found` without creating
a file. Its connection still participates in the exclusive local ownership lock.

The clock is fixed at `2026-11-05T08:00:00.000Z`. Protocol deadlines use this
simulation clock, not the machine's wall clock. This makes local tests
reproducible; production freshness policy is outside this lab.

## Observable stages

Demo records context → selected memory → proposal → host acceptance → host
outcome → memory → separate chat binding → dialogue proposal → confirmed local
transcript delivery. The host owns an abstract ledger with two uninspected beds
and zero water. Inspection is accepted and the ledger is updated; watering is
rejected because water is unavailable. Only accepted inspection gets a succeeded
host report. No movement, pathfinding, shooting or NPC behavior is implemented.

The listing distinguishes proposed tasks, host adoption, host-observed outcomes,
dialogue proposals and confirmed delivery. It includes memory IDs and safe source
IDs/statuses; `--full` explicitly adds original synthetic payloads. No hidden
reasoning or secrets are logged. `--json` uses the same named fields each run;
IDs can differ as new conversations create new persisted events.
Repeated demo also reuses its saved dialogue and delivery; it adds no duplicate
history. Cached replies explicitly say the controller selection was not rerun;
their empty selected-memory list is not a claim about a new controller prompt.

The scenario reply reads supplied selected memory. A plan cannot establish
completion, a rejected task cannot become success, and no selected report means
the reply states that the outcome is unknown. A new process can open the same
database and answer from persisted host reports and decisions. Recall is bounded;
sufficiently old events can fall outside the current selection. A durable report
exchange, independent of that selection window, prevents repeated demo host work.

## Identity and local access

`character-lumen` and `participant-lumen` remain the same across game and chat
bindings. `participant-local` is an original synthetic participant explicitly
trusted by this composition root in both sessions. The root authorizes recall
from `lab-garden` and `lab-chat` with participant-limited, nonexportable scope.
Matching IDs or imported claims alone do not grant access. This demonstrates
supplied local trust mappings, not network authentication or identity proof
across unrelated applications.

## Failures and ownership

Usage errors exit 2; runtime, storage and ownership failures exit 1 with a safe
code/message. Normal commands exit 0. Validation never turns rejected output
into host work. The store uses an exclusive `<database>.lock`; a simultaneous
writer is rejected with `database-owned`. The lab never deletes another writer's
lock. After a crash, inspect its PID and confirm no writer uses that database
before manually removing it. Normal close releases the lock. The lock is local
cooperative ownership, not a distributed lease or network authorization layer.

`pnpm test:lab` launches isolated CLI subprocesses and checks restart, partial
adoption, repeat demo, changed/missing memory evidence, safe errors and cleanup.
`pnpm check` also checks schemas, formatting, TypeScript and runtime tests locally.
No browser sessions are required.

Real providers, a network service/authentication layer, archive import/export,
RAG/embeddings, consent/deletion workflows, real games, multiwriter synchronization
and deployment remain outside this laboratory. See [runtime API](runtime-api.md)
for the exact callable runtime coverage.
