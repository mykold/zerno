import type { PhonebookService } from "./phonebook.js"
import type { GroupService } from "./groups.js"
import type { WorkspaceService } from "./workspaces.js"

import type { Zerno } from "zerno-core"

export class Service {
  public readonly zerno: Zerno
  public readonly workspaces: WorkspaceService
  public readonly groups: GroupService
  public readonly phonebooks: PhonebookService

  constructor(
    zerno: Zerno,
    workspaces: WorkspaceService,
    groups: GroupService,
    phonebooks: PhonebookService
  ) {
    this.zerno = zerno
    this.workspaces = workspaces
    this.groups = groups
    this.phonebooks = phonebooks
  }
}
