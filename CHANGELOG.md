# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Corporate-grade README with badges, architecture diagram, and full documentation.
- `CONTRIBUTING.md` with fork → branch → commit → PR workflow.
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1).
- `SECURITY.md` with vulnerability disclosure policy.
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`.
- `.github/PULL_REQUEST_TEMPLATE.md`.
- `.github/workflows/ci.yml` — basic CI pipeline.
- `.editorconfig` for consistent coding style.
- `docs/STRUCTURE.md` — plain-text project tree.
- `tests/` directory scaffold with `.gitkeep` placeholders.
- `assets/` directory for static files.
- `scripts/` directory for build and utility scripts.

### Changed

- Reorganised repository into canonical open-source layout (`src/`, `tests/`, `docs/`,
  `scripts/`, `assets/`, `.github/`).
- Moved server source (`server.js`, `routes/`, `models/`, `middleware/`) into `src/server/`.
- Moved client source (`client/src/`, `client/public/`) into `src/client/`.
- Moved all loose documentation files into `docs/`.
- Moved all loose shell scripts into `scripts/`.
- Updated `package.json` paths to reflect new layout.
- Updated `netlify.toml` base directory from `client` to `src/client`.
- Expanded `.gitignore` with comprehensive patterns.
- Renamed `env.example` → `.env.example`.

### Removed

- `config.env` — contained hardcoded secrets (replaced by `.env.example`).
- Duplicate / stale root-level documentation files.

### Security

- Removed tracked file `config.env` that contained JWT and QR code secrets.
- Added `SECURITY.md` with private disclosure instructions.

## [1.0.0] — 2024-01-01

### Added

- Initial release of the College Dispensary Management System.
- Student portal with QR codes, appointment booking, prescriptions, and emergency SOS.
- Doctor dashboard with patient management and real-time chat.
- Admin panel with analytics, inventory, ambulance fleet, and leave management.
- AI chatbot with local fallback and optional external API integration.
- JWT-based authentication with role-based access control.
- Clerk authentication integration (optional).
- Netlify deployment configuration.

[Unreleased]: https://github.com/mightbeanshuu/DormDoc/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mightbeanshuu/DormDoc/releases/tag/v1.0.0
