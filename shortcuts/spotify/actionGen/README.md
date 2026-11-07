# Spotify action generator

`index.html` generates an exported Shortcuts action. The intent template is the
original donor NSKeyedArchiver plist, decoded into JSON with explicit UID/data
markers. `intent-source.js` changes the command and visible title, rebuilds the
nested protobuf length-delimited fields, and serializes the binary plist. This
preserves full UTF-8 titles without padding or fixed byte offsets.

Run `npm ci`, `npm run build:spotify`, then `npm test` at the repository root after
editing the source or template. Commit the generated local `intent-bundle.js` so
the static page works without a Node runtime or CDN. Dependency licenses are in
`THIRD_PARTY_LICENSES.txt`.

The tests execute the actual page and independently parse the result with Python
plistlib and a separate protobuf reader. They cover short/long/Unicode titles and
incomplete Spotify URLs. They suppress clipboard and external app launch. They
do not install or run a Shortcut or contact Spotify; device/app compatibility
needs verification in the supported Apple/Spotify environment.
