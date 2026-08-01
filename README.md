<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/English-0969da?style=flat-square" alt="English"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-c8102e?style=flat-square" alt="简体中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-8250df?style=flat-square" alt="日本語"></a>
</p>

<p align="center">
  <img src="assets/brand/app-icon.svg" alt="HxHwang Gw application icon" width="96">
</p>

# HxHwang Gw

A local-first system for official-document work, task and file tracking, drafting, weekly reports, document export, and controlled private synchronization.

![Pages](https://img.shields.io/github/actions/workflow/status/NextWeb4/gw/pages.yml?branch=main&style=flat-square&label=Pages)
![Last commit](https://img.shields.io/github/last-commit/NextWeb4/gw?style=flat-square)
![Repository size](https://img.shields.io/github/repo-size/NextWeb4/gw?style=flat-square)
![Version](https://img.shields.io/badge/version-0.7.11-0969da?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.9.0-f69220?style=flat-square&logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-All_rights_reserved-555?style=flat-square)

## Overview

HxHwang Gw is a pnpm monorepo that shares one domain model across a public GitHub Pages demonstration, separate Internet and intranet Web builds, and separate Internet and intranet Electron clients. It stores operational data locally first, separates network capabilities at build time, and provides explicit adapters for synchronization and AI requests.

The current release is `0.7.11`. Official documents can link one or more active tasks inside the existing guarded document editor, while document and task details provide bidirectional read-only navigation. The document payload is the only relation owner; task-side links are derived from already loaded active documents. Soft deletion hides links, restoration reveals them again, copied documents reset relations, and CSV exports use active titles rather than internal IDs. Relation filtering, selection, resolution, and navigation do not read a second database, create another save path, or use the network. See [`RELEASE_NOTES.md`](RELEASE_NOTES.md) for details.

Public Pages does not expose private synchronization, but it supports local ledgers, attachments, legacy JSON/snapshots, bring-your-own-key AI, and an explicitly unlocked `127.0.0.1` relay. Page load and password entry do not contact the relay automatically. Business data stays in the current browser's IndexedDB. Use [GitHub Pages](https://nextweb4.github.io/gw/) only with public, fictional, or approved non-sensitive material.

## Core Capabilities

| Area | What is implemented |
| --- | --- |
| Work management | Editable task, meeting, document, field-activity, seal, and material ledgers with global quick-task capture, session-only recent-record navigation, previous/next traversal through each current visible ledger order, secure current-result CSV export, a reusable people/organization directory, stages, summaries, attachments, per-ledger keyword/field filters and sorting, local global search, a unified agenda, and a recoverable recycle bin |
| Writing | Rich-text drafting, DOCX/HTML/TXT import with sanitization, reusable custom formats, deterministic weekly reports, editable versions, and historical archives |
| Documents | A shared A4-oriented engine for DOCX and PDF export; browser print is used on the Web and Electron printing on desktop |
| Migration | Importers for two legacy prototype export shapes plus drag-and-drop JSON/snapshots, with warnings when their shared version marker cannot identify the source reliably |
| Local data | IndexedDB-backed repositories, snapshots, attachment references, searchable AI history, six-ledger soft deletion and restore, minimal sync tombstones, and explicit export operations |
| Edition services | Public Pages and Internet builds use a session-only API key with an OpenAI-compatible endpoint; intranet builds use authenticated private sync and the internal AI gateway only |

Historical Skills, configuration, weekly reports, and unmapped source fields remain visible as read-only plain text. Imported HTML or script text is not executed.

## Runtime Variants

| Variant | Private controls | Intended use | Important boundary |
| --- | --- | --- | --- |
| Public Pages | Bring-your-own-key direct AI | Local ledgers with public/non-sensitive material | No private sync; browser-local data; AI also requires provider CORS |
| Internet Web / desktop | Direct AI only | Non-classified use with an OpenAI-compatible HTTPS endpoint | The API key stays in session memory; browser use also requires provider CORS |
| Intranet Web / desktop | Internal sync and AI gateway | Use on a controlled internal origin | Provider keys stay on the server; the intranet desktop main process blocks direct public-AI IPC |

All variants remain local-first. Private synchronization begins only after a user supplies a server address and access code.

## Requirements

- Node.js `24`, matching the GitHub Actions toolchain.
- pnpm `11.9.0`, declared through the root `packageManager` field.
- Playwright Chromium for end-to-end tests and brand-asset generation.
- Windows for NSIS installers; Linux for AppImage/DEB packaging and final Linux compatibility checks.
- A Chromium-class browser for the Web builds.

The repository version is `0.7.11`. Dependencies are locked by `pnpm-lock.yaml`; use the frozen lockfile for reproducible installs.

## Install and Run

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:web
```

The default development server listens on the local interface. To exercise private controls with the intranet build mode:

```bash
pnpm dev:web:intranet
```

To exercise the Internet edition with an OpenAI-compatible endpoint:

```bash
pnpm dev:web:internet
```

Do not point the public Pages build at a private API. Its attachments and snapshots remain in the current browser and are not controlled intranet storage; internal or sensitive material belongs only in an approved controlled environment.

## Typical Workflow

1. Create or import task, meeting, document, field-activity, seal, and material records, then review the migration report and read-only historical archive.
2. Draft official-document content and maintain the relevant local knowledge entries.
3. Generate a weekly report from the selected date range, edit it, save a version, and export it for review.
4. Export a local snapshot before clearing browser data, changing devices, or uninstalling the desktop client.
5. In a private build, explicitly connect to the server, pull the current master state, and push only locally newer records.
6. Before any AI request, inspect and edit the redaction preview and confirm that the material is appropriate to send.

Generated documents are working outputs, not a substitute for editorial, policy, font, pagination, or secrecy review.

## Local Data, Privacy, and Recovery

- The public and intranet Web builds keep application records in the current browser profile's IndexedDB.
- The desktop build uses the same local model and adds a restricted Electron bridge for native PDF export.
- Clearing site data, removing a browser profile, or uninstalling without a snapshot can make local records unavailable.
- Local redaction recognizes common phone numbers, email addresses, identity numbers, and labeled names, but cannot prove that a document is anonymous.
- Sensitive, classified, or otherwise prohibited material must not enter this application or a public model.
- User API keys on Public Pages/Internet builds stay in session memory; intranet model keys, database credentials, and provider configuration stay on the private server.

Read [`docs/HELP.md`](docs/HELP.md) before using migration, synchronization, attachments, or AI with real internal material.

## Content and Network Boundaries

The checked-in knowledge pack is generated only from the repository's licensed material and an explicit HTTPS source allowlist. `pnpm content:sync` is an intentional network operation: it follows the repository's redirect and response-size policy, records source metadata, and does not scrape commercial reference products or overwrite manually maintained templates.

Public Pages uses a restrictive CSP with no private API target; it reaches an explicit HTTPS/loopback AI endpoint only after model discovery or per-request confirmation. Intranet/desktop CSPs allow only the explicit endpoints required by their editions. Because an HTML CSP meta element cannot enforce `frame-ancestors`, production hosting must set `Content-Security-Policy: frame-ancestors 'none'` as an HTTP response header when framing protection is required.

## Test and Validate

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm content:verify
pnpm assets:verify
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:internet
pnpm test:e2e:intranet
```

`pnpm test` runs package tests plus content-policy, workflow-contract, and UI-contract checks. The Playwright suites cover desktop and narrow viewports, the public/private feature split, migration, local workflows, document export, attachments, CSP behavior, and the rule that the intranet client performs no external request before explicit connection.

`lint` and `format:check` currently delegate to TypeScript or JavaScript syntax/type validation in each workspace; no independent source formatter is configured.

## Build and Release

```bash
pnpm build
pnpm build:web:internet
pnpm build:web:intranet
pnpm build:desktop
pnpm build:desktop:win:x64:internet
pnpm build:desktop:win:x64:intranet
pnpm build:desktop:linux:x64:internet
pnpm build:desktop:linux:x64:intranet
```

The public Web build is written to `apps/web/dist/`; Internet and intranet Web builds are isolated in `dist-internet/` and `dist-intranet/`. Replace `x64` with `arm64` for ARM builds. Desktop packaging first builds a `file://`-compatible Web bundle and rejects absolute asset paths that Electron could not load.

Tags matching `v*` trigger Windows/Linux, x64/arm64, Internet/intranet packaging. A release is created only after all packages and Debian 10/12 startup gates succeed; the matrix produces 12 edition-specific installers plus `SHA256SUMS.txt`.

## Architecture and Module Boundaries

```text
apps/web          React/Vite UI and build-time public/private capability split
apps/desktop      Electron main process, preload bridge, security policy, packaging
packages/domain   Shared entities, validation, weekly-report and archive semantics
packages/local-data  IndexedDB repositories, snapshots, attachments, local persistence
packages/documents   DOCX/PDF-oriented document model and export helpers
packages/migration   Legacy export recognition, mapping, warnings, archive preservation
packages/sync-client Explicit private sync, attachment, redaction, and AI client
content           Licensed sources, allowlist, generated knowledge pack, attribution
scripts           Content policy, asset generation, build and workflow contract checks
e2e               Public, Internet, and intranet Playwright scenarios
```

UI components must use package APIs rather than reaching into persistence internals. Network behavior belongs in `packages/sync-client`; local storage must not acquire implicit network access. Electron keeps context isolation and sandboxing enabled and exposes only the narrow preload contract.

## Status and Known Limitations

- The public demonstration targets `https://nextweb4.github.io/gw/`; deployment and package checks do not make the private API's shared-code authentication production-ready.
- The application is designed for public or internal non-classified work, not classified records.
- Browser storage durability depends on the browser profile and the user's snapshot practice.
- DOCX/PDF output depends on fonts and the final editor/viewer; formal documents still require manual review.
- Legacy prototypes used a shared version identifier and omitted one Skill collection from their standard exporter, so ambiguous imports produce an explicit warning instead of a guessed source label.
- Windows and Linux packages are not Authenticode/code-signed. Real ARM hardware remains an external verification item even though CI builds and emulated installation gates exist.

See [`docs/VERIFICATION_MATRIX.md`](docs/VERIFICATION_MATRIX.md) for the maintained evidence matrix and [`RELEASE_NOTES.md`](RELEASE_NOTES.md) for release history.

## Maintenance Guidance

- Preserve the public/intranet/desktop capability boundary and their separate output directories.
- Add focused tests when changing domain invariants, persistence, migration, redaction, synchronization, Electron IPC, export behavior, or workflows.
- Run content verification before changing licensed or generated knowledge files; authorization metadata and attribution must stay consistent.
- Regenerate and verify PNG/ICO assets after changing `assets/brand/app-icon.svg`.
- Keep package versions, release notes, desktop artifact names, all three README files, and workflow assertions synchronized.

Dependency choices, licenses, rejected alternatives, and rollback boundaries are documented in [`OPEN_SOURCE_AUDIT.md`](OPEN_SOURCE_AUDIT.md). Visual and interaction rules are documented in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

## Author and Contact

- **HaoXiangHwang**
- [Rays688888@Gmail.com](mailto:Rays688888@Gmail.com)
- <https://nextweb4.github.io/>
- <https://github.com/NextWeb4>

## Copyright and Licensing

See [LICENSE](LICENSE). It is a rights and provenance notice, not an open-source license: it grants no permission to use, copy, modify, deploy, or redistribute original project material. Third-party material remains subject to its own rights and terms.

Copyright (c) 2026 HaoXiangHwang. All rights reserved.

The repository declares `UNLICENSED`; no permission to copy, modify, or redistribute the project's own code or content is granted without written authorization. Third-party dependencies remain subject to their respective licenses, and the scope of authorized reference material is recorded under `content/licensed/`. Read [`COPYRIGHT.md`](COPYRIGHT.md) and [`content/ATTRIBUTION.md`](content/ATTRIBUTION.md) before reuse or distribution.
