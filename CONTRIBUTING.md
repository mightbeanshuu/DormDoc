# Contributing to DormDoc

Thank you for considering contributing to DormDoc! This document explains the process for
contributing to the project and the standards we follow.

---

## 🚀 Getting started

### 1. Fork and clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/DormDoc.git
cd DormDoc
```

### 2. Set the upstream remote

```bash
git remote add upstream https://github.com/mightbeanshuu/DormDoc.git
```

### 3. Install dependencies

```bash
npm install
npm run install-client
```

### 4. Create your environment

```bash
cp .env.example .env
# Edit .env with your local MongoDB URI and secrets
```

---

## 🌿 Branching strategy

Create a new branch from `main` for every change. Use the following naming convention:

| Branch prefix | Purpose | Example |
|---|---|---|
| `feature/*` | New functionality | `feature/telemedicine-video` |
| `fix/*` | Bug fixes | `fix/appointment-timezone` |
| `chore/*` | Maintenance, refactoring, CI | `chore/upgrade-mongoose` |
| `docs/*` | Documentation only | `docs/api-reference` |

```bash
git checkout -b feature/my-new-feature
```

---

## ✍️ Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for all commit
messages.

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`.

**Examples**:

```text
feat(appointments): add recurring appointment support
fix(auth): handle expired JWT gracefully
docs(readme): update installation steps
```

---

## 🧹 Code style and linting

- **JavaScript** — Follow the existing ESLint configuration (`react-app` for the client).
- **Indentation** — 2 spaces (enforced via `.editorconfig`).
- **Line endings** — LF (Unix-style).
- **Trailing whitespace** — Not allowed.
- **Final newline** — Every file must end with a single newline.

Before committing, verify your changes pass linting:

```bash
# Client
cd src/client && npx eslint src/ --ext .js,.jsx

# Server (if ESLint is configured)
npx eslint src/server/ --ext .js
```

---

## 🧪 Running tests locally

```bash
# Client tests
cd src/client
npm test

# Server tests (when available)
cd tests/server
npm test
```

Ensure all existing tests pass before opening a pull request. If you add new functionality,
include corresponding tests in the `tests/` directory mirroring the `src/` layout.

---

## 📬 Opening a pull request

1. Push your branch to your fork.
2. Open a pull request against `mightbeanshuu/DormDoc:main`.
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely.
4. Ensure all CI checks pass.
5. Request a review from at least one maintainer.

**PR checklist**:

- [ ] My code follows the project code style.
- [ ] I have added/updated tests for my changes.
- [ ] I have updated relevant documentation.
- [ ] All new and existing tests pass locally.
- [ ] My commits follow Conventional Commits format.

---

## 🐛 Reporting bugs

Use the [Bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when filing issues.
Include steps to reproduce, expected behaviour, actual behaviour, and screenshots if
applicable.

---

## 💡 Suggesting features

Use the [Feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe the
problem your feature solves, the proposed solution, and any alternatives you considered.

---

## 📜 Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you agree to uphold this code. Report unacceptable behaviour to the
maintainers.

---

Thank you for helping make DormDoc better! 🎉
