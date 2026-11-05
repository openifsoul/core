# Public code and private service boundary

The open product includes runtime, protocol, storage/provider adapters, web
laboratory and a self-hostable server implementation. Inspectable source is not
permission to access the owner's running service. Authentication and authorization
must hold even when every source line is known.

A future separate private `cloud` repository owns managed-service accounts,
billing, provisioning and administrative operations. It may compose public core;
public core must never import private cloud code. That private repository and a
multi-tenant service have not been created by this laboratory implementation.

Personal deployment settings, account credentials, inference keys, encryption
keys, databases and operational logs are never public source. The checked-in
Wrangler configuration is a generic template; it contains no owner account ID,
custom domain or credential. Local secrets live in ignored files with restricted
permissions; deployed secrets use Workers secret bindings. API keys are not part
of character history, prompts, exports, browser bundles or API responses.

The owner laboratory requires a password, a signed HttpOnly SameSite cookie,
same-origin mutation requests and bounded request bodies. Login and inference
rates are limited. The API returns only credential availability, never a stored
key. BYOK submission intentionally crosses HTTPS from the owner's browser to the
selected server; the UI clears its input and does not persist it in browser
storage. Server storage encrypts the key with AES-GCM and a separate deployment
secret. A server compromise could still expose keys while in use: encryption at
rest does not make a compromised server trustworthy.

Only authenticated owner requests can select an allowlisted provider/model. The
browser cannot configure arbitrary provider URLs. Ollama connects through the
loopback local server; cloud code never probes the owner's localhost. No model
output executes code or owns game mechanics. Selected context sent to a provider
is disclosed to that provider; the interface explicitly identifies cloud vs
local inference. There is no silent fallback to another provider.

This first deployment is a private single-owner laboratory. It does not establish
multi-tenant isolation, enterprise identity, formal audit, full deletion/export,
or production incident response. Before opening registration, implement and test
those missing boundaries. Review authentication, imports, dependency changes and
secret handling alongside functional tests; a closed repository is not a control.
