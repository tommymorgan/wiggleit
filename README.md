# Wiggleit

Wiggleit magnifies the cursor when the mouse moves rapidly. This is a maintained
source fork of [mechtifs/wiggle](https://github.com/mechtifs/wiggle), itself a
GNOME Shell port of [Jiggle](https://github.com/jeffchannell/jiggle).

## Compatibility

The maintained version targets GNOME Shell 51. It replaces the removed Shell
pointer watcher with a GLib sampling timer and uses the current cursor and seat
APIs. The extension UUID and settings schema remain unchanged to preserve existing
Wiggle settings.

## Development

Sources are in `src/`. TypeScript 7.0.2 emits ES modules into `dist/`; GNOME
executes that JavaScript using GJS, not Node.js. Node/npm are build-time tools.

The compiler enables `strict`, checked indexed access, exact optional properties,
and explicit overrides. `skipLibCheck` excludes third-party declaration files,
not the extension's source. The pinned `@girs/gnome-shell` 50 declarations cover
the APIs used here; runtime compatibility is verified separately on Shell 51.1.

```sh
npm ci
npm run check
npm run build
```

The build copies metadata, cursor assets and license, then compiles the GSettings
schema. No npm dependencies are needed at runtime.

## Install from source

Requires Node/npm, GJS/GNOME Shell 51, `glib-compile-schemas`, and
`gnome-extensions`. Run:

```sh
npm ci
npm run pack
gnome-extensions install --force ./wiggle@mechtifs.shell-extension.zip
```

Log out and back in if Shell has already loaded the previous version, then run
`gnome-extensions enable wiggle@mechtifs`.

This replaces the installed Wiggle extension. Updates from extensions.gnome.org
may overwrite this fork; this repository is the source of truth for Wiggleit.

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

The suite requires Node 24+, GJS, GNOME Shell 51 with its development
typelibs, `dbus-run-session`, `glib-compile-schemas`, `gnome-extensions`, and
`unzip`. The integration tests need a working headless Mutter renderer.
Missing prerequisites fail the suite rather than silently skipping coverage.

The tests cover clean ZIP installation, history detection and threshold
boundaries, expiry and clearing, and an isolated compositor's gestures,
cursor restoration, lifecycle transitions, and preferences bindings. Temporary
profiles and an independent D-Bus session keep the live desktop unchanged.
These are scenario checks, not a claim of complete coverage.

The regression scenarios also cover two repaired bugs: adjacent expired history
samples are all removed, and hiding the native pointer keeps its sprite available
without releasing another owner's cursor or seat inhibition.

## Verification

The JavaScript repair and the compiled TypeScript package were exercised in an
isolated GNOME Shell 51.1 Wayland compositor, without replacing the live desktop:
virtual-pointer reversals trigger magnification with the characterized test
configuration (`sample-size=1000`, `check-interval=20`, `draw-interval=8`,
`radians-threshold=15`, `distance-threshold=180`). Cursor hide/show is balanced,
unmagnify removes the effect, disabling while magnified restores the cursor,
and re-enabling works. The TypeScript package's preferences window was also
opened through GNOME's preferences loader and its cursor visibility and size
bindings were exercised.

The same synthetic 300-pixel reversal every 16 ms did not trigger with the
existing `sample-size=25` and `check-interval=200` defaults. This is a
characterization limit, not proof that every gesture fails. This fork does not
silently retune those settings. Physical-mouse feel and multi-monitor scaling
were not manually verified.

The original GPL license and complete upstream history are retained. This
repository is separate from the archived `tommymorgan/jiggle` repository, not a
GitHub-network fork: GitHub resolved the initial fork request to that older fork.

## Screenshots

![Demonstration](https://github.com/mechtifs/wiggle/assets/18751876/763866b7-d760-4040-9474-3cf1cf93d5a8)
![Preference_Appearance](https://github.com/mechtifs/wiggle/assets/18751876/eca5dc1b-59a6-4f42-88ad-e4edc42acc81)
![Preference_Behavior](https://github.com/mechtifs/wiggle/assets/18751876/11193ab4-5145-4632-aff2-9de09eda44be)

