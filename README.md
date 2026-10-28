# Wiggleit

Wiggleit is an independent GNOME Shell extension that magnifies the cursor when
the mouse moves rapidly. It derives from [mechtifs/wiggle](https://github.com/mechtifs/wiggle),
itself a GNOME Shell port of [Jiggle](https://github.com/jeffchannell/jiggle).

## Compatibility

Wiggleit supports GNOME Shell 46–51; 46 is the oldest supported release.
Its UUID is `wiggleit@tommymorgan`, with its own settings schema and path.

### Compatibility adapters

The platform seam owns cursor visibility and seat references. Version selection
happens once at enable time: 46–48 use the legacy visibility setter, 49–50 use
counted visibility inhibitors, and 51 uses inhibitors with the new backend access.
Releases sharing behavior share implementations; gesture history, GLib pointer
sampling, effects and preferences do not contain release checks.

Each hide/show pair owns its own seat reference. The legacy setter remembers
preexisting visibility instead of unconditionally showing another owner's hidden
pointer. Unlike modern inhibitors, that Boolean API cannot identify another
owner hiding an already-hidden pointer during Wiggleit's own hide interval.
Unsupported major versions fail explicitly rather than selecting an unverified ABI.

GNOME 46–47 use Mutter's display-based cursor tracker; 48 uses the backend getter.

## Development

Sources are in `src/`. TypeScript 7.0.2 emits ES modules into `dist/`; GNOME
executes that JavaScript using GJS, not Node.js. Node/npm are build-time tools.

The compiler enables `strict`, checked indexed access, exact optional properties,
and explicit overrides. `skipLibCheck` excludes third-party declaration files,
not the extension's source. The pinned `@girs/gnome-shell` 50 declarations cover
the APIs used here; real runtime verification is separate from static declarations.

```sh
npm ci
npm run check
npm run build
```

The build copies metadata, cursor assets and license, then compiles the active
GSettings schema and a private migration-only schema. No npm dependencies are
needed at runtime.

## Install from source

Requires Node/npm, GNOME Shell 46–51, `glib-compile-schemas`, and
`gnome-extensions`. Run:

```sh
npm ci
npm run pack
gnome-extensions install --force ./wiggleit@tommymorgan.shell-extension.zip
```

Log out and back in if Shell has already loaded the previous version, then run
`gnome-extensions enable wiggleit@tommymorgan`.

Wiggleit installs separately from Wiggle rather than replacing it. If Wiggle is
enabled, disable it before enabling Wiggleit so both do not control the cursor.
Wiggle can remain installed; this package does not modify it.

### Importing saved Wiggle settings

On first enable or first opening preferences, Wiggleit copies explicitly saved
Wiggle values into its own unset settings. Existing Wiggleit choices win, including
values explicitly set to a default. Unsaved Wiggle defaults are not imported.
Wiggle's settings are never changed, and its extension need not still be installed:
a private read schema accesses the persisted `/org/gnome/shell/extensions/wiggle/` values.

Wiggleit stores values under `/org/gnome/shell/extensions/wiggleit/`. A completion
marker commits with the imported values. Later starts and resets of individual
Wiggleit settings do not import again. This is a one-time copy, not synchronization.

## Recovered changes

Commit `1bb296a2` preserves the installed JavaScript and metadata recovered on
October 27, 2026, before the GNOME 51 repair. These include cursor API compatibility
and effect-destruction fixes. Their original author and original commits are unknown.
Generated `gschemas.compiled` is rebuilt rather than stored.

The JavaScript GNOME 51 checkpoint is commit `63952f7d`; the TypeScript migration
follows it rather than rewriting the recovered changes.

## Automated tests

Run `npm test` after `npm ci`. It builds a fresh distribution ZIP and runs
Node's built-in `node:test` runner. Node supervises the tests; extension behavior
is executed by real GJS and GNOME Shell processes, not mocked `gi://` modules.

The suite requires Node 20+, GJS, a supported GNOME Shell with its development
typelibs, `dbus-run-session`, `glib-compile-schemas`, `gnome-extensions`, and
`unzip`. The integration tests need a working headless Mutter renderer.
Missing prerequisites fail the suite rather than silently skipping coverage.

The tests cover clean ZIP installation, history detection and threshold
boundaries, expiry and clearing, and an isolated compositor's gestures,
cursor restoration, lifecycle transitions, preferences bindings, and saved-settings
migration. Temporary profiles and independent D-Bus sessions keep the live desktop unchanged.
These are scenario checks, not a claim of complete coverage.

The regression scenarios also cover two repaired bugs: adjacent expired history
samples are all removed, and hiding the native pointer keeps its sprite available
without releasing another owner's cursor or seat inhibition.

## Verification

The independent-UUID package passed the same real private-Shell gesture, cursor
ownership, disable/re-enable and preferences scenarios on Shell 46.10, 47.10,
48.8, 49.10, 50.6 and 51.1. Each run also seeds saved Wiggle values and verifies
inheritance without modifying them. The host suite passes 17 tests with no skips.
Isolated dconf smoke checks additionally verify saved-value import, explicit-new
precedence, one-time behavior and completion across process restarts.

Reproduce historical runtime checks with Podman after `npm run pack`:

```sh
node tools/compatibility-runtime.mjs --build
```

Omit `--build` to reuse cached Fedora 40–44 images. The runner mounts the checkout
read-only, disables networking, and uses private D-Bus sessions and software
rendering, without connecting to the live desktop. The original v1.0.0 package
fails on GNOME 46's removed backend tracker getter; the 46–47 adapter fixes that.

Virtual-pointer reversals trigger magnification with the characterized test
configuration (`sample-size=1000`, `check-interval=20`, `draw-interval=8`,
`radians-threshold=15`, `distance-threshold=180`).

The same synthetic 300-pixel reversal every 16 ms did not trigger with the
existing `sample-size=25` and `check-interval=200` defaults. This is a
characterization limit, not proof that every gesture fails. Wiggleit does not
silently retune those settings. Physical-mouse feel and multi-monitor scaling
were not manually verified.

The original GPL license, attribution and development history are retained.
Wiggleit has its own standalone GitHub repository, with no fork-network parent
or local upstream remote. The old `tommymorgan/jiggle` repository is archived.

## Screenshots

![Demonstration](https://github.com/mechtifs/wiggle/assets/18751876/763866b7-d760-4040-9474-3cf1cf93d5a8)
![Preference_Appearance](https://github.com/mechtifs/wiggle/assets/18751876/eca5dc1b-59a6-4f42-88ad-e4edc42acc81)
![Preference_Behavior](https://github.com/mechtifs/wiggle/assets/18751876/11193ab4-5145-4632-aff2-9de09eda44be)

