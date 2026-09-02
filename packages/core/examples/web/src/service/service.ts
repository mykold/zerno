import type { PhonebookService } from "./phonebook.js"
import type { ChannelService } from "./channels.js"
import type { WorkspaceService } from "./workspaces.js"

import type { Zerno } from "zerno-core"

export class Service {
  public readonly zerno: Zerno
  public readonly workspaces: WorkspaceService
  public readonly channels: ChannelService
  public readonly phonebooks: PhonebookService

  constructor(
    zerno: Zerno,
    workspaces: WorkspaceService,
    channels: ChannelService,
    phonebooks: PhonebookService
  ) {
    this.zerno = zerno
    this.workspaces = workspaces
    this.channels = channels
    this.phonebooks = phonebooks
  }
}
