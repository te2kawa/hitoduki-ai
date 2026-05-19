import Dexie, { type Table } from 'dexie';
import type { SelfProfile, Member, MeetingConsultation, ChatMessage, SelfAnalysis, MemberChatMessage } from '../types';

export class HitodukiDB extends Dexie {
  selfProfile!: Table<SelfProfile>;
  members!: Table<Member>;
  meetingConsultations!: Table<MeetingConsultation>;
  chatMessages!: Table<ChatMessage>;
  selfAnalysis!: Table<SelfAnalysis>;
  memberChatMessages!: Table<MemberChatMessage>;

  constructor() {
    super('HitodukiAI');
    this.version(1).stores({
      selfProfile: 'id',
      members: 'id, name, createdAt',
      meetingConsultations: 'id, title, createdAt',
    });
    this.version(2).stores({
      selfProfile: 'id',
      members: 'id, name, createdAt',
      meetingConsultations: 'id, title, createdAt',
      chatMessages: 'id, createdAt',
      selfAnalysis: 'id',
    });
    this.version(3).stores({
      selfProfile: 'id',
      members: 'id, name, createdAt',
      meetingConsultations: 'id, title, createdAt',
      chatMessages: 'id, createdAt',
      selfAnalysis: 'id',
      memberChatMessages: 'id, memberId, createdAt',
    });
  }
}

export const db = new HitodukiDB();

export async function exportData(): Promise<string> {
  const selfProfile = await db.selfProfile.toArray();
  const members = await db.members.toArray();
  const meetingConsultations = await db.meetingConsultations.toArray();
  const chatMessages = await db.chatMessages.toArray();
  const memberChatMessages = await db.memberChatMessages.toArray();
  return JSON.stringify({ selfProfile, members, meetingConsultations, chatMessages, memberChatMessages }, null, 2);
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.selfProfile) for (const item of data.selfProfile) await db.selfProfile.put(item);
  if (data.members) for (const item of data.members) await db.members.put(item);
  if (data.meetingConsultations) for (const item of data.meetingConsultations) await db.meetingConsultations.put(item);
  if (data.chatMessages) for (const item of data.chatMessages) await db.chatMessages.put(item);
  if (data.memberChatMessages) for (const item of data.memberChatMessages) await db.memberChatMessages.put(item);
}
