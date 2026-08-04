# `zerno`

An experimental adapter over [`@automerge/automerge-repo`](https://github.com/automerge/automerge-repo/tree/main/packages/automerge-repo) and [`@automerge/automerge-repo-keyhive`](https://www.npmjs.com/package/@automerge/automerge-repo-keyhive) for building local-first applications with identities, documents, and cryptographic access control.

## Installation

```
pnpm install
```

## Usage

- [`zerno-core`](./packages/core) is core library that provides the main Zerno functionality. It builds on top of Automerge Repo and Keyhive, adding identity management, document handling, and access control with cryptographic permissions.

- [`zerno-react`](./packages/react) are React bindings for `zerno-core`. It provides React components and hooks for accessing the Zerno instance, observing documents, handling synchronization progress, and building reactive local-first applications.
