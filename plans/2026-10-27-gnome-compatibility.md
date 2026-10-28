# Feature: GNOME 46–51 compatibility adapters

**Created**: 2026-10-27
**Goal**: Keep cursor magnification usable across GNOME 46–51 while localizing release-specific integration changes, with an independent Wiggleit identity that inherits saved Wiggle settings.
> Source PRD: User's compatibility, independence and settings-inheritance requests, quoted in plans/gnome-compatibility.prd-coverage.md
> PRD coverage: plans/gnome-compatibility.prd-coverage.md
> Context: ../README.md#compatibility-adapters
> Plan home: repository
> Target repository: https://github.com/tommymorgan/wiggleit

## Slice 1: Release-specific cursor behavior behind a common interface
**Tracer bullet**: A GNOME 46 user can magnify and restore the pointer using the packaged extension; the same checks continue to work through GNOME 51.
**Touches**: Platform adapters, extension/effect cursor construction, independent package identity, one-time saved-settings import, runtime tests, compatibility documentation.
**Off-limits**: Live desktop installation, gesture sensitivity defaults, upstream attribution/history removal, unrelated features.

### Task 1.1: Deliver and verify the complete adapter cutover
<!-- estimate: ~250 reviewable lines plus portable integration harness | feature-files: features/gnome-compatibility.feature | demoable: yes -->
> Depends on: none
> Shippable state: Complete adapters and packaged imports work across the supported range; the current GNOME 51 behavior remains usable without successors.
> Boundary verification: Strict typecheck, packaged node:test suite on GNOME 51, and the same real private-Shell gesture/cursor/lifecycle/preferences checks on each obtainable GNOME 46–50 runtime. Record exact runtime versions and failures; metadata alone is not proof.

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Magnification and restoration across supported releases
# Action: creates
# Status: DONE
# Living updated: YES
Scenario Outline: Magnification and restoration across supported releases
  Given the clean Wiggleit ZIP is installed in an isolated GNOME <major> session
  And release-sensitive GNOME APIs are isolated in version-specific adapters
  And the characterized gesture settings are applied without changing shipped defaults
  When the pointer performs rapid reversals
  Then the magnifier appears with its cursor sprite available
  And unmagnifying restores the previous native-pointer state
  And disabling while magnified or awaiting unmagnification removes its actor and timers
  And re-enabling applies live cursor settings
  And the actual preferences window updates cursor size and visibility settings
  Examples:
    | major |
    | 46 |
    | 47 |
    | 48 |
    | 49 |
    | 50 |
    | 51 |

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Preexisting cursor ownership survives magnification
# Action: creates
# Status: DONE
# Living updated: YES
Scenario Outline: Preexisting cursor ownership survives magnification
  Given another owner has hidden the pointer before Wiggleit magnifies on GNOME <major>
  When Wiggleit hides and shows its cursor repeatedly
  Then the other owner's hidden pointer remains hidden
  And Wiggleit releases only the seat inhibition it acquired
  Examples:
    | major |
    | 46 |
    | 47 |
    | 48 |
    | 49 |
    | 50 |
    | 51 |

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Unsupported releases do not select an adapter
# Action: creates
# Status: DONE
# Living updated: YES
Scenario Outline: Unsupported releases do not select an adapter
  Given GNOME reports release <release>
  When the platform selector is called
  Then it reports that the release is unsupported
  And no native cursor resources are acquired
  Examples:
    | release |
    | 45.10 |
    | 52.alpha |
    | invalid |

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Independent installation identity
# Action: creates
# Status: DONE
# Living updated: YES
Scenario: Independent installation identity
  Given Wiggleit is installed from its clean ZIP
  Then GNOME identifies it as wiggleit@tommymorgan
  And its active schema uses /org/gnome/shell/extensions/wiggleit/
  And Wiggle's original identity and settings remain separate
  And its repository has no GitHub fork-network parent or local upstream remote

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Saved Wiggle settings are imported once
# Action: creates
# Status: DONE
# Living updated: YES
Scenario: Saved Wiggle settings are imported once
  Given saved Wiggle settings exist whether or not the original extension is installed
  And Wiggleit already has an explicitly chosen setting
  When Wiggleit first opens its preferences or enables
  Then unset Wiggleit values inherit only explicitly saved Wiggle values
  And existing Wiggleit choices win even when equal to their defaults
  And unsaved old defaults are not written as user choices
  And Wiggle's settings remain unchanged
  And resetting a Wiggleit value or restarting does not repeat the import

## Verification evidence

- `npm run check && npm test`: strict TypeScript check and 17 tests pass, no skips, including actual Shell 51.1.
- `node tools/compatibility-runtime.mjs`: identical ten gesture/lifecycle/preferences scenarios plus migration assertions pass on real Shell 46.10, 47.10, 48.8, 49.10 and 50.6.
- Isolated dconf smoke: saved/explicit/repeat and restart-seed/restart-verify fixtures pass with `GSETTINGS_BACKEND=dconf`.
- Package fixture installs `wiggleit@tommymorgan` and checks active-schema isolation, inherited values and unchanged old values.
- Original release on Shell 46 fails at its removed tracker getter; the final adapter package passes.

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Brittle integration uses version-specific adapters
# Action: creates
# Status: DONE
# Living updated: YES
Scenario: Brittle integration uses version-specific adapters
  Given GNOME releases change native cursor and backend APIs
  When Wiggleit's platform integration is inspected
  Then brittle parts of the code are abstracted into version-specific adapters
  And gesture detection, effects and preferences remain independent of release selection

<!-- DONE -->
# Living: features/gnome-compatibility.feature::Encountered Wiggle settings are inherited
# Action: creates
# Status: DONE
# Living updated: YES
Scenario: Encountered Wiggle settings are inherited
  Given Wiggleit
  When Wiggle's setting is encountered in the wild
  Then Wiggleit inherits Wiggle's setting

