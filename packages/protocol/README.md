# Protocol

Current-only IfSoul0.4.0 structural validators and declaration types. See the
[current contracts](../../specs/current/README.md) and
[compatibility boundary](../../docs/compatibility.md).

`validateDocument` accepts the exact protocol family/kind/version without mutation,
IO, coercion or remote schema fetching. `validateModelProviderDocument` validates
the separate provider specification; it does not implement a provider wire client.
Unsupported versions reject and no format-upgrade helper is provided. Generated
validators are compiled locally by the existing generator for platform portability.
