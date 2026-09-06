import type { PhonebookService } from "./phonebook.js";
import type { ChannelService } from "./channels.js";
import type { WorkspaceService } from "./workspaces.js";

import type { Zerno } from "zerno-core";

export class Service {
  constructor(
    readonly zerno: Zerno,
    readonly workspaces: WorkspaceService,
    readonly channels: ChannelService,
    readonly phonebooks: PhonebookService,
  ) {}
}
