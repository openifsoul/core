# Original character templates

Status: **original synthetic data for a planned catalog**. This directory
currently contains [Neri Coil](neri-coil.json), a fictional lantern repairer.
It includes no real person, player memory, third-party game character or asset.

Neri's JSON remains byte-for-byte v0.1 regression data under the frozen
[CharacterTemplate schema](../../packages/protocol/schemas/character-template.schema.json)
and [legacy character specification](../../specs/character/README.md).
Its traits are illustrative labels, not calibrated behavioral scores. It is
profile data, not a private instance, memory, permission grant or executable
prompt. Template revisions do not automatically change existing instances.

New contract work follows [v0.2](../../specs/v0.2/README.md), where portable
character identity is separate from an environment-specific embodiment. Human
and nonhuman embodiments are intended possibilities; this one old template does
not establish their implementation. No migration of Neri is performed here.

There is no loader, generator, playable NPC, catalog service, runtime or
import/export implementation. A future character can continue through different
models, chat and supported hosts; this remains a [product goal](../../docs/product.md),
not behavior demonstrated by template validation. The host retains all gameplay
controllers. Future catalog entries need reviewed provenance and clear rights.
A separate catalog repository is deferred until maintenance/publication needs it.

`neri-coil.json` is original template data dedicated under
[CC0-1.0](../../LICENSES/CC0-1.0.txt). This explanatory README is
[CC-BY-4.0](../../LICENSES/CC-BY-4.0.txt), attributed to IfSoul contributors;
see the [licensing policy](../../docs/licensing.md).
