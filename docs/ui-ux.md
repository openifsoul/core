# UI and UX approach

Status: owner-selected direction, recorded on **2026-11-05**. Applies to the
public landing page, IfSoul App and its local Laboratory section.
This guide defines implementation and review rules; it is not a claim that every
component or interaction described below has been implemented.

## Component foundation

Use **React + TypeScript + Tailwind CSS v4**, with **shadcn/ui primitives and
Cuelark UI components** as the shared component foundation. Cuelark extends the
existing shadcn setup; it does not introduce a second application framework.

Choose components in this order:

1. Reuse the existing local component or compose existing primitives.
2. For agent-facing presentation, prefer a suitable Cuelark component: messages,
   conversation input, suggestions, model selection, tool activity or evidence.
3. For general controls, use the existing shadcn/Radix primitives. Add a Cuelark
   or shadcn primitive only when it addresses an actual interaction requirement.
4. Write an original domain component when the shared foundation does not express
   the IfSoul behavior. Compose primitives rather than rebuilding accessible
   controls, focus management or overlay behavior.

Do not install the whole registry or replace working primitives just to make their
source uniform. Avoid parallel versions of the same control, page-specific design
systems and additional UI libraries for an already covered interaction.

### Current implementation and source ownership

| Layer                | Existing source                                                                   | Responsibility                                                             |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| General primitives   | `apps/laboratory/src/components/ui/`                                              | Existing shadcn buttons, inputs, cards, selects, tabs and related controls |
| Cuelark presentation | `message.tsx`, `tabs.tsx`, `suggestions.tsx`, `tooltip.tsx` in the same UI folder | Vendored components adapted to local imports and shared theme tokens       |
| Motion               | `apps/laboratory/src/lib/motion.ts`                                               | Cuelark motion helper, including reduced-motion handling                   |
| Domain composition   | `apps/laboratory/src/components/`                                                 | Landing, characters, settings, conversation, plans and evidence views      |
| Theme                | `apps/laboratory/src/styles.css` and `src/lib/theme.ts`                           | Shared semantic tokens, responsive layouts and persisted theme selection   |
| Brand                | `apps/laboratory/src/components/BrandMark.tsx` and `public/brand/`                | Shared braces-and-eyes mark and standalone exports                         |

The full Cuelark agent catalog is a source of candidates, not an installed feature
list. Current plan, memory and trace panels are IfSoul domain compositions; their
existence does not imply installation of similarly named Cuelark components.
Components present data; service calls, credentials, authorization, retries and
host authority stay in their existing application/server owners.

### Adding or updating a component

The laboratory [components.json](../apps/laboratory/components.json) registers
`@cuelark` as `https://ui.cuelark.com/r/{name}.json`. Use the
[Cuelark installation guide](https://ui.cuelark.com/docs/installation) and
[agent component examples](https://ui.cuelark.com/agents) as upstream references.

Inspect a candidate's source, dependency graph, accessibility and license before
integrating it. Add only the needed files/dependencies, adapt imports to
`@/components/ui` and `@/lib`, and review the resulting diff. Registry installation
must not overwrite the owner-selected theme, local behavior or unrelated files.
Keep shared dependency changes in the root manifest and lockfile; do not add a
second package manifest for a panel. Preserve upstream provenance and notices.

Vendored code is maintained locally. Upstream updates are explicit reviewed
changes, not an automatic runtime dependency or a reason to regenerate the UI.
Cuelark's MIT notice is in [LICENSES](../LICENSES/cuelark-MIT.txt); existing shadcn
primitives retain their [MIT notice](../LICENSES/shadcn-MIT.txt). GSAP retains its
own standard license, and the Fontsource font retains its SIL Open Font License.

## Visual language and branding

Use the owner's **Notion theme** on both landing and laboratory: quiet neutral
surfaces, clear typography, subtle borders and blue primary actions. The landing
can use larger headings and more space; application panels use a denser layout
without changing the component vocabulary or semantic colors.

- `styles.css` owns the `:root` and `.dark` tokens. Consume semantic variables
  such as background, foreground, card, muted, border, primary, signal and ring.
  Do not duplicate the palette or hardcode per-component light/dark colors.
- Keep the supplied Cuelark tokens for font, density, radius, marks and motion.
  Use the shared self-hosted **IBM Plex Sans Variable** and shared radius scale.
  Do not introduce ornamental typefaces or a new accent palette for each panel.
- Reuse `useTheme` for theme selection. The current default is light, with an
  explicit light/dark toggle and a saved browser preference. A system-theme mode
  is not currently implemented.
- Keep primary, secondary and quiet actions visually distinct. Use one obvious
  primary action per task area, and keep supporting controls close to their data.
- Maintain intentional spacing, readable type, visible focus and sufficient text
  contrast in both themes. Color alone must not communicate success or failure.
- The logo is **only the braces and two eyes**. The name **IfSoul** is separate
  text in the UI, not embedded in the logo. Reuse `BrandMark` and the assets in
  `public/brand`; preserve the cyan-to-violet braces and theme-aware eyes. The
  gradient belongs to the brand, not every control. Keep avatar/favicon exports
  legible with safe padding and an appropriate background.

## Interaction and information hierarchy

The landing explains the experiment and leads to the laboratory or documentation.
Its interactive preview is explicitly illustrative and must not pretend to run a
model, connect a provider or show private character data.

The laboratory prioritizes the selected character, connected memory, conversation
and high-level planning. Keep runtime location separate from provider/model choice.
Make active selections and their consequences visible; changing a model is not
changing the memory store, and changing runtime does not migrate history.

Keep settings, authoring and detailed evidence available without competing with
the main task. Use progressive disclosure for technical diagnostics and optional
configuration. Labels, field help and recovery instructions must use plain English;
public UI copy follows the project's English documentation policy.

### States and recovery

For each changed flow, review default, loading, success, empty, error, disabled
and partial-result states, plus cancellation or destructive confirmation where
applicable. Only implement states the underlying operation can actually support.

- Give meaningful operations visible pending and completion feedback. Prevent
  duplicate submissions. Bound long waits and explain the next available action.
- Empty states explain why there is no content and offer a useful next step.
- Keep failures close to the affected field or block; preserve form values,
  drafts, selections and already loaded content after recoverable failures.
- Present short, actionable errors. Raw exceptions, provider payloads, keys and
  stack traces do not belong in normal error messages. Explicit owner debugging
  views must remain separate and must not reveal credentials or hidden reasoning.
- Reuse existing request IDs/reconciliation semantics for retries. A visual Retry
  button must not silently duplicate inference, data creation or host operations.
- Confirm irreversible actions and credential disconnection; prefer undo where
  the underlying operation genuinely supports it. Do not imply deletion,
  rollback, cancellation or revocation that the backend does not provide.
- Do not add a decorative Stop button to a bounded request without cancellation
  support. If streaming is implemented later, distinguish stopping the local wait
  from confirmed cancellation at the provider or host.

### Evidence and agent activity

Show observable activity, brief explanations and selected evidence, not invented
internal reasoning. Keep **proposal, host adoption, reported outcome and dialogue
delivery** distinct. Acceptance is not completion; an unknown outcome stays unknown.
Synthetic scenarios remain labeled, and provider failures do not become synthetic
successes. Never fabricate cost, progress, tool activity or memory provenance to
populate an agent component.

If an upstream component assumes action execution, hidden reasoning or approval
semantics that IfSoul does not support, adapt its presentation to the real domain
or choose a different component. A UI component cannot grant a model gameplay
control, broader memory access or authority over the host. Follow the existing
[boundaries](boundaries.md) and [runtime profiles](runtime-profiles.md).

## Accessibility, mobile and motion

Use semantic controls and labels, keyboard navigation, sensible focus order and
visible focus. Preserve Radix behavior when composing or restyling controls. Give
icon-only controls accessible names; mark decorative brand graphics as decorative
when surrounding text or the parent link already names the product.

Support narrow screens without horizontal page overflow, clipped controls or
hover-only essential actions. Interactive targets should be at least 44 by 44 CSS
pixels. Reflow columns and settings instead of shrinking text or forcing zoom.

Motion supports feedback and orientation. Reuse the shared helper and `--cl-motion`,
respect `prefers-reduced-motion`, and avoid decorative loops, blocking entrances
or animation that hides the actual operation state. Import heavier features only
when needed; preserve lazy loading of the laboratory from the landing page.

## Validation and review

Follow [validation by change](development.md#required-validation-by-change):
documentation-only edits need changed-file formatting and `pnpm check:docs`;
implementation/dependency changes need `pnpm check`, browser changes also need
`pnpm build:web`, and changed user interactions need targeted browser verification.
The [execution policy](deployment.md) remains local checks/builds and manual
Wrangler deployment; adopting a component library adds no remote automation.

For UI changes, review desktop and narrow mobile layouts, both themes, keyboard
focus, relevant pending/empty/error/partial states, retained drafts after failure,
and honest host/provider status. Verify the affected flow rather than only a
static screenshot. Run browser checks headless with a unique task session, a
300000 ms idle timeout where supported, and explicit cleanup of owned sessions.
Record which checks actually ran and any missing coverage; this guide is a review
standard, not proof that every existing panel already meets it.

## Application navigation

Use the owner-selected shadcn `sidebar-07` foundation for the shared App shell.
Characters, chat, memory and settings belong to the ordinary application. Detailed
traces, debug payloads and synthetic planning belong to the local-only Laboratory.
Capability flags control navigation; server authorization independently rejects
cloud laboratory operations. Do not make local startup depend on Clerk.

## Playground

The demo uses Cuelark segmented tabs for the world selector and a single shared
Chat / Memory panel. Selecting Just chat pauses the hosts and expands that same
panel; switching views preserves the draft, history and mounted game progress.
Public labels remain English. Garden is observation-only: its host autonomously
manages two water trips, three compost portions, ripening and a harvest of eleven
fruits. Core consumes the independently built Garden package through its reviewed
local archive. Local working-tree archive updates are not publication or deployment.

### Companion art and scene alignment

Mira, Rook and Pip have shared portrait identities in the selector, conversation
and card table, with separate gardener and healer/tank embodiments. Portraits
are presentation assets; they are not added to the bridge wire contract. Games
consume their own embedded art through independent packages. Missing selector
or chat portraits fall back to the companion initial.

The selected game scene and companion panel start on the same horizontal edge.
There is no extra game title, description card, border or padded outer background
between the world tabs and game. Dungeon vitals/status are an in-arena HUD; the
card portrait and round label belong inside the table. Controls and error states
remain available, and narrow screens stack the scene and chat.

### Demo speech and reset

A single open footer below the games and chat explains the game bridge, IfSoul
and memory, with source links for each independent example and a note on model
mode and demo history limits. The header links to the OpenIfSoul GitHub
organization through an accessible icon. The companion description is omitted
from the controls. Reset visit opens the vendored Cuelark
Alert Dialog, with keyboard focus management and an explicit cancel action.

Each independent game owns its speech bubble, typing/reveal animation, placement
and cleanup. Core forwards player-requested chat only through optional
`MountedGame.say?`; it draws no speech overlay. Game-requested lines are displayed
by the game after its freshness checks. Reduced motion shows complete text
immediately, and screen readers receive a complete line rather than each typed
character. Raw reports stay in memory. Scenario/fallback lines use short authored
world-specific reactions, and model plan explanations are never exposed as speech.

### Demo model connection

Use model remains actionable for signed-out visitors and opens Clerk's sign-in
modal on the current page. Model mode is enabled only after a fresh authenticated
status check confirms provider availability and remaining allowance. Connection
failures keep scenario mode available and explain how to retry. Expired sessions
return to scenario mode and reopen sign-in; draft text remains available.
Local status checks verify that Ollama is reachable and the configured demo model
is installed; merely constructing a provider does not establish readiness.
