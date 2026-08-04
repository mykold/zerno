# `zerno-repl`

## Architecture

This example is built on the Automerge Repo stack. [`@automerge/automerge-repo`](https://github.com/automerge/automerge-repo/tree/main/packages/automerge-repo) manages local-first documents and peer synchronization. [`@automerge/automerge-repo-storage-nodefs`](https://github.com/automerge/automerge-repo/tree/main/packages/automerge-repo-storage-nodefs) stores that data on the local filesystem.

[`@automerge/automerge-repo-keyhive`](https://www.npmjs.com/package/@automerge/automerge-repo-keyhive) adds identities and access control on top of Automerge Repo. It uses [`@keyhive/keyhive`](https://github.com/inkandswitch/keyhive/tree/main/keyhive_wasm) for the underlying cryptography: contact cards, membership, and grants that decide who can relay, read, edit, or administer a document.

[`@automerge/automerge-subduction`](https://github.com/inkandswitch/subduction/tree/main/automerge_subduction_wasm) is the sync relay. Peers that are not directly connected exchange encrypted updates through a Subduction server. [`zerno-core`](../../) sits above all of this and exposes a simpler API for identity, documents, and grants — what the REPL actually calls.

## Usage

Start two independent peers.

### Peer 1

```sh
ZERNO_DIR=".zerno/1" pnpm start
```

### Peer 2

`ZERNO_DIR` is used here to simulate a separate remote client.

```sh
ZERNO_DIR=".zerno/2" pnpm start
```

Each peer stores its own identity, local database, and currently opened document inside `ZERNO_DIR`.

## Example workflow

By default, a new document is created on the first application start. You can view the document URL using `doc`:

```text
Peer 1> doc
```

To grant another user access to your document, you first need their identity. Retrieve Peer 2's contact card:

```text
Peer 2> me contact-card
```

Grant access from Peer 1:

```text
Peer 1> doc grant edit eyJSb3RhdGUiOnsicGF5bG9hZCI6...
```

List the document members. You should now see the Peer 2 identity that was just added.

```text
Peer 1> doc members
```

On Peer 2, open the document using the URL printed earlier by Peer 1:

```text
Peer 2> doc open automerge:...
```

Peer 2 will exit. Restart the program to continue using the opened document.

Edit the document:

```text
Peer 1> doc title set Hello World
```

Read the title from the other peer:

```text
Peer 2> doc title
```

## Commands

### `exit`

Exit the application.

```text
exit
```

### `clear`

Clear the terminal.

```text
clear
```

### `me`

Print information about the current identity.

```text
me
```

Example output:

```json
{
  "id": "...",
  "peerId": "...",
  "contactCard": "..."
}
```

### `me id`

Print the current identity ID.

```text
me id
```

### `me peer-id`

Print the current peer ID.

```text
me peer-id
```

### `me contact-card`

Print the current identity's contact card, encoded as Base64.

This value is intended to be shared with another peer and later passed to `doc grant`.

```text
me contact-card
```

### `doc`

Print the currently opened Automerge document URL.

```text
doc
```

### `doc title`

Print the document title.

```text
doc title
```

### `doc title set <value>`

Update the document title.

```text
doc title set Hello World
```

### `doc open <url>`

Open a different document.

If successful, the document URL is stored locally and the application exits. Restart the program to begin using the new document.

```text
doc open automerge:...
```

### `doc members`

List all known document members and their access levels.

```text
doc members
```

Example output:

```json
{"id":"...","access":"admin","isSelf":true,"isPublic":false,"isSyncServer":false}
{"id":"...","access":"edit","isSelf":false,"isPublic":false,"isSyncServer":false}
```

### `doc grant <relay|read|edit|admin> <contact-card>`

Grant another identity access to the document.

The contact card must be the Base64 value produced by `me contact-card`.

```text
doc grant read eyJSb3RhdGUiOnsicGF5bG9hZCI6...
```

Supported access levels:

| Level   | Description                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| `relay` | Can relay encrypted synchronization traffic but cannot read the document contents. |
| `read`  | Read-only access.                                                                  |
| `edit`  | Read and modify the document.                                                      |
| `admin` | Full administrative access, including granting permissions to others.              |
