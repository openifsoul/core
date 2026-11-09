# Versioning

IfSoul packages and named product-format families share release identifier0.4.0.
Each independently usable checkout carries release.json and an exact consistency
check; public packages have no private central metadata dependency.

In0.x, patches contain compatible fixes and minor releases may change contracts.
Format names and validation shapes remain distinct even when their release
identifiers match. Callable provider APIs and serialized specifications remain
separate surfaces. Character/template revisions, SQL keys and dependency versions
are not product-format release identifiers. See [format reference](compatibility.md).
