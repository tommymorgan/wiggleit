Feature: Independent Wiggleit with GNOME 46–51 compatibility
  Release-sensitive GNOME APIs are isolated in version-specific adapters.
  Wiggleit retains its own installation identity while importing saved Wiggle settings once.

  # Proof: tests/shell.test.mjs, tests/fixtures/shell-probe.mjs and preferences.mjs;
  # real Shell 46.10, 47.10, 48.8, 49.10, 50.6 and 51.1, zero skips.
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

  # Proof: tests/compatibility.test.mjs and selector-before-construction in src/compat/index.ts.
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

  # Proof: real gnome-extensions install in tests/package.test.mjs;
  # GitHub fork=false, parent=null, source=null; jj git remote list has origin only.
  Scenario: Independent installation identity
    Given Wiggleit is installed from its clean ZIP
    Then GNOME identifies it as wiggleit@tommymorgan
    And its active schema uses /org/gnome/shell/extensions/wiggleit/
    And Wiggle's original identity and settings remain separate
    And its repository has no GitHub fork-network parent or local upstream remote

  # Proof: tests/settings.test.mjs and real Shell/package fixtures;
  # additional isolated dconf import, precedence, repeat and cross-process smoke checks.
  Scenario: Saved Wiggle settings are imported once
    Given saved Wiggle settings exist whether or not the original extension is installed
    And Wiggleit already has an explicitly chosen setting
    When Wiggleit first opens its preferences or enables
    Then unset Wiggleit values inherit only explicitly saved Wiggle values
    And existing Wiggleit choices win even when equal to their defaults
    And unsaved old defaults are not written as user choices
    And Wiggle's settings remain unchanged
    And resetting a Wiggleit value or restarting does not repeat the import

  # Architectural proof: src/compat and independent frozen-range source review.
  Scenario: Brittle integration uses version-specific adapters
    Given GNOME releases change native cursor and backend APIs
    When Wiggleit's platform integration is inspected
    Then brittle parts of the code are abstracted into version-specific adapters
    And gesture detection, effects and preferences remain independent of release selection

  # Behavioral proof: installed-package, real Shell and persistent settings fixtures.
  Scenario: Encountered Wiggle settings are inherited
    Given Wiggleit
    When Wiggle's setting is encountered in the wild
    Then Wiggleit inherits Wiggle's setting
