# ADR 0008: Characters, embodiments, environments and continuity

Status: Accepted, 2026-11-05. Extends [ADR 0002](0002-protocol.md) with a new
explicit draft baseline; does not rewrite the v0.1 schemas/examples.

## Decision

A character is persistent identity, authored profile, lived history, relationships
and transferable intentions. A model is a replaceable inference provider. An
embodiment is a character's binding to a host entity and its supported perception
and expression channels. Do not require a humanoid body or speech: a horse or
computer can have different supported modalities. Game-specific health, inventory
and execution handles belong to the host, not transferable character identity.

Treat games and chats as environments, with channels usable alongside a game.
World ticks are optional where inapplicable. Persistent participant identities
can have multiple environment bindings, but imported identity claims are not
proof of ownership. Relationships must survive trusted rebinding between sessions.

Distinguish working context, ongoing intentions, episodic history and long-term
derived memory. Authored backstory is separate from lived experience. Recall
selects relevant authorized history rather than submitting the whole archive on
each model call. Canonical memory belongs to IfSoul, not a vendor conversation ID.

Start with a single active writer for each character's persistent state, allowing
multiple channels. Switching environments drains or reconciles pending host work
and saves a portable checkpoint. Import distinguishes restoring the same identity
from creating a fork with new identity and lineage. A copied archive cannot acquire
write authority, live session tokens or active host execution handles.

## Consequences

Publish the local design as `draft-0.2.0` alongside the historical v0.1 schemas.
ModelProvider retains its independent v0.1 contract until its own shape changes.
No version-string replacement constitutes a migration. No archive reader, identity
service, writer lease or lossless conversion is implemented by schemas alone.
See [compatibility](../compatibility.md) and [product](../product.md).
