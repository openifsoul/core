# Versioning

The current IfSoul package and product release is **0.5.0**. Each independently
usable checkout carries release.json and an exact consistency check; public
packages have no private central metadata dependency.

Package releases and serialized format families are versioned separately. A
package update does not relabel stored data. Release0.5.0 preserves the compatible
0.4.0 protocol, provider specification, bridge, resource capability, App archive
and participant/behavior/planning families. Validators continue to require their
exact documented family; matching numbers do not make distinct families
interchangeable. See [format reference](compatibility.md).

In0.x, patches contain compatible fixes; minor releases introduce features and
may change contracts. A format change requires an explicit compatibility and
stored-data transition decision. Callable provider APIs and serialized
specifications remain separate surfaces. Character/template revisions, SQL keys
and dependency versions are not product-format release identifiers. Stable1.0
and prerelease channels require a separate stability decision.
