import type { PhonebookService } from "./phonebook.js";
import type { GroupService } from "./groups.js";
import type { WorkspaceService } from "./workspaces.js";

import type { Zerno } from "zerno-core";

export class Service {
  constructor(
    readonly zerno: Zerno,
    readonly workspaces: WorkspaceService,
    readonly groups: GroupService,
    readonly phonebooks: PhonebookService,
  ) {}
}
