# github.sm0ke.org - My GitHub Pages Site!
Just loads of random stuff

- [Gorrila Tag Custom Maps](https://github.sm0ke.org/gorilla-tag/)
- [Random Token per device](https://github.sm0ke.org/shortcuts/btbo/auth)
- ect just explore!

## Local regression checks

Run `npm ci --ignore-scripts` and `npm test` at the repository root. Tests use
synthetic data and mock network, passkey and form operations.

The passkey demo is a static bundle under `shortcuts/authtest/assets/auth-demo.js`.
After editing `shortcuts/authtest/main.js`, run `npm ci --ignore-scripts` and
`npm run build` in `shortcuts/authtest`, then commit the generated bundle together
with its source. Vite uses a relative base and bundles the package dependency;
the published page does not request a missing root module or unresolved bare import.
Its backend remains the local development server at `http://localhost:3000`.
No production authentication backend is supplied or configured by this change.

Map submission requires a readable CORS JSON response with `success: true` from
the configured Apps Script. Opaque, HTTP, network and malformed/unconfirmed responses
keep the draft and show an uncertain-result message. The repository does not contain
that deployed backend, so its live CORS contract must be verified by its owner.
Map browse links are limited to HTTPS Mod.io hosts and metadata is rendered as text.

The SideQuest download buttons retain the original 0.10.42 release and now point
to its verified persistent GitHub release assets instead of expired signed redirects.
