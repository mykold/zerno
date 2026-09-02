import { Access, GroupId, Identifier } from "@automerge/automerge-repo-keyhive";
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import type {
  ContactCard,
  Group,
  Peer,
} from "@automerge/automerge-repo-keyhive";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";
import { sanitazeIdentifier } from "./access.js";

export function sanitazeGroupId(groupId: GroupId | string): GroupId {
  if (typeof groupId !== "string") return groupId;
  return new GroupId(hexToUint8Array(groupId));
}

export interface GroupMember {
  id: Identifier;
  access: Access;
}

export class GroupService {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  async create(coparents: Peer[] = []): Promise<Group> {
    return await this.hive.generateGroup(coparents);
  }

  /** Resolves a group by its id */
  async find(groupId: GroupId | string): Promise<Group> {
    const id = sanitazeGroupId(groupId);
    const group = await this.hive.keyhive.getGroup(id);
    if (!group)
      throw new Error(`Group '${id.toString()}' not found in keyhive`);
    return group;
  }

  /** Adds a member to the group with the given access level. */
  async grant(args: {
    group: Group;
    contactCard: ContactCard;
    access: Access;
  }): Promise<void> {
    await this.hive.receiveContactCard(args.contactCard);

    const agent = await this.hive.keyhive.getAgent(args.contactCard.id);
    if (!agent)
      throw new Error("Contact card did not resolve to a keyhive agent");

    await this.hive.keyhive.addMember(
      agent,
      args.group.toMembered(),
      args.access,
      [],
    );
  }

  /** Removes a member from the group. */
  async revoke(args: {
    group: Group;
    member: Identifier | string;
  }): Promise<void> {
    const member = sanitazeIdentifier(args.member);
    const agent = await this.hive.keyhive.getAgent(member);
    if (!agent) throw new Error("Member not found in keyhive");
    await this.hive.keyhive.revokeMember(agent, true, args.group.toMembered());
  }

  /** Returns all members of the group. */
  async members(group: Group): Promise<GroupMember[]> {
    const members = await group.members();
    return members.map((member) => ({
      id: member.who.id,
      access: member.can,
    }));
  }
}
