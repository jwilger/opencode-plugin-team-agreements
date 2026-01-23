# Changelog

## [0.2.0](https://github.com/jwilger/opencode-plugin-team-agreements/compare/opencode-plugin-team-agreements-v0.1.4...opencode-plugin-team-agreements-v0.2.0) (2026-01-23)


### ⚠ BREAKING CHANGES

* Team agreements are now stored in AGENTS.md (or CLAUDE.md as fallback) in the project root instead of docs/TEAM_AGREEMENTS.md

### Features

* Use AGENTS.md for team agreements instead of docs/TEAM_AGREEMENTS.md ([#15](https://github.com/jwilger/opencode-plugin-team-agreements/issues/15)) ([00365ab](https://github.com/jwilger/opencode-plugin-team-agreements/commit/00365ab4d17f0cd4e22c2731f12fd6875d5b01e1))


### Bug Fixes

* Only export plugin function to prevent OpenCode crash ([#13](https://github.com/jwilger/opencode-plugin-team-agreements/issues/13)) ([d4f5930](https://github.com/jwilger/opencode-plugin-team-agreements/commit/d4f5930e0620d490b3fae635275130309f1fcfc0))

## [0.1.4](https://github.com/jwilger/opencode-plugin-team-agreements/compare/opencode-plugin-team-agreements-v0.1.3...opencode-plugin-team-agreements-v0.1.4) (2026-01-23)


### Bug Fixes

* **ci:** Configure npm trusted publishing correctly ([#11](https://github.com/jwilger/opencode-plugin-team-agreements/issues/11)) ([bbddb8a](https://github.com/jwilger/opencode-plugin-team-agreements/commit/bbddb8aac6a10afd917668dba3750cd5464f941b))

## [0.1.3](https://github.com/jwilger/opencode-plugin-team-agreements/compare/opencode-plugin-team-agreements-v0.1.2...opencode-plugin-team-agreements-v0.1.3) (2026-01-23)


### Bug Fixes

* **ci:** Remove registry-url to allow pure OIDC npm publishing ([#8](https://github.com/jwilger/opencode-plugin-team-agreements/issues/8)) ([5e0ec78](https://github.com/jwilger/opencode-plugin-team-agreements/commit/5e0ec78dbc4b92bf7e03089c83e81761b12870aa))
* **ci:** Use GitHub App for release-please to enable signed commits ([#10](https://github.com/jwilger/opencode-plugin-team-agreements/issues/10)) ([281200a](https://github.com/jwilger/opencode-plugin-team-agreements/commit/281200a90d694d4b72b819dced74b405f93bfff5))

## [0.1.2](https://github.com/jwilger/opencode-plugin-team-agreements/compare/opencode-plugin-team-agreements-v0.1.1...opencode-plugin-team-agreements-v0.1.2) (2026-01-23)


### Bug Fixes

* **ci:** Remove NPM_TOKEN to allow OIDC auth ([ef64c15](https://github.com/jwilger/opencode-plugin-team-agreements/commit/ef64c1561f43b76107b8285a2c922b45332ee635))
* **ci:** Use PAT for release-please to trigger CI on release PRs ([#6](https://github.com/jwilger/opencode-plugin-team-agreements/issues/6)) ([4800212](https://github.com/jwilger/opencode-plugin-team-agreements/commit/48002121148635f4221ea455dc9088f3d9daf01c))
* Test isolation and add lefthook pre-commit hooks ([#5](https://github.com/jwilger/opencode-plugin-team-agreements/issues/5)) ([543a641](https://github.com/jwilger/opencode-plugin-team-agreements/commit/543a641605e7542e0d95bea9fe870fb6ace3985e))

## [0.1.1](https://github.com/jwilger/opencode-plugin-team-agreements/compare/opencode-plugin-team-agreements-v0.1.0...opencode-plugin-team-agreements-v0.1.1) (2026-01-23)


### Features

* Offer to set up automatic enforcement for team agreements ([#2](https://github.com/jwilger/opencode-plugin-team-agreements/issues/2)) ([2af3d4e](https://github.com/jwilger/opencode-plugin-team-agreements/commit/2af3d4e147d0acf9df3fb6eda04c05ea5dba5b26))
