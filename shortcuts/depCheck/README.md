# Dependency update workflow export

`plist.txt` contains the exported action graph. The embedded checker returns
`important` for mandatory updates; the downstream dictionary action reads that
same key. An error branch runs before update/current-version routing and reports
`fullError`, so HTTP, JSON, version and network failures cannot say “Up to date.”
The branch remains inside the dependency loop and preserves later dependencies.

Run `npm test` at the repository root. The updater tests extract and execute the
actual embedded JavaScript with synthetic fetch responses, then interpret only
the exported dictionary, conditional and text routing. They check mandatory and
optional updates, successful current versions, and failure messages. They do not
run a Shortcut, open an update URL, or fetch real update metadata. Import and
native-device execution of the edited export remain to be verified separately.
