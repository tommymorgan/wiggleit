# Wiggleit

Wiggleit magnifies the cursor when the mouse moves rapidly. This is a maintained
source fork of [mechtifs/wiggle](https://github.com/mechtifs/wiggle), itself a
GNOME Shell port of [Jiggle](https://github.com/jeffchannell/jiggle).

## Compatibility

The maintained version targets GNOME Shell 51. It replaces the removed Shell
pointer watcher with a GLib sampling timer and uses the current cursor and seat
APIs. The extension UUID and settings schema remain unchanged to preserve existing
Wiggle settings.

## Install from source

Run the following command in this directory:

```sh
gnome-extensions pack --force --out-dir /tmp \
  --extra-source=const.js --extra-source=cursor.js \
  --extra-source=effect.js --extra-source=history.js \
  --extra-source=icons --extra-source=LICENSE.txt .
gnome-extensions install --force /tmp/wiggle@mechtifs.shell-extension.zip
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

The original GPL license and complete upstream history are retained. This
repository is separate from the archived `tommymorgan/jiggle` repository, not a
GitHub-network fork: GitHub resolved the initial fork request to that older fork.

## Screenshots

![Demonstration](https://github.com/mechtifs/wiggle/assets/18751876/763866b7-d760-4040-9474-3cf1cf93d5a8)
![Preference_Appearance](https://github.com/mechtifs/wiggle/assets/18751876/eca5dc1b-59a6-4f42-88ad-e4edc42acc81)
![Preference_Behavior](https://github.com/mechtifs/wiggle/assets/18751876/11193ab4-5145-4632-aff2-9de09eda44be)

