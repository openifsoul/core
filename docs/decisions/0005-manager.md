# ADR 0005: Local Character Manager

Status: Direction accepted, 2026-11-05; implementation deferred.

## Context and alternatives

A desktop shell can integrate packaging and operating-system secure storage but
adds signing and distribution work. A local web UI allows early iteration, but a
localhost service requires authentication and protection from hostile web origins.

## Decision

Begin the first implemented UI as a local web application, after the protocol and
CLI/test harness prove a vertical slice. Keep the core independent of the UI.
Reconsider Tauri/desktop packaging when installation, keychain or lifecycle needs
justify it. No cloud login is required for local character management.

## Consequences

Before serving real data, design per-session authentication, origin/CSRF controls,
local binding, secret storage and explicit data deletion/backup flows. Loopback
binding alone is not authorization. BYOK keys stay outside character archives and
logs. Bootstrap contains only a README; no web server or GUI is implemented.
