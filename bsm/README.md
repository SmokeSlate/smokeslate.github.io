# Beat Saber playlist export

`Test.txt` is the exported Shortcuts action graph. Song dictionaries are converted
to JSON text without a trailing comma and collected in `Songs`. Combine Text adds
commas only between song objects. Playlist metadata is built as a native Dictionary
and converted to JSON, so quotes, newlines, backslashes and Unicode are escaped by
the serializer rather than interpolated into quoted JSON fields.

The final Text action combines the serialized metadata (with its final closing
brace removed) and the serialized songs array. Only already-serialized JSON values
cross that boundary; raw metadata and song names never enter JSON syntax directly.
The existing final output UUID still connects to Rename and Save File. `Songs` is
initialized before the loop to keep empty exports separate from prior data.

Run `npm test` at the repository root. Four playlist regressions interpret the
actual exported dictionary/text/list/combine actions with synthetic data and parse
the final JSON. They cover zero, one and two songs; quotes, tabs, newlines,
backslashes, dollar signs and Unicode; and the original trailing comma. External
auth/download/image/save actions do not run. Native Shortcuts import/execution and
real Spotify/BeatSaver responses remain unverified.

Reference: https://support.apple.com/guide/shortcuts/intro-to-using-json-apd0f2e057df/ios
