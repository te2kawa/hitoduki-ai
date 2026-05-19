import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import type { Member, MeetingConsultation, SelfProfile, ChatMessage, SelfAnalysis, MemberChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Self Profile
export function useSelfProfile() {
  return useLiveQuery(() => db.selfProfile.get('self'));
}

export async function saveSelfProfile(profile: Omit<SelfProfile, 'id' | 'updatedAt'>) {
  await db.selfProfile.put({ ...profile, id: 'self', updatedAt: new Date() });
}

// Members
export function useMembers() {
  return useLiveQuery(() => db.members.orderBy('createdAt').reverse().toArray());
}

export function useMember(id: string) {
  return useLiveQuery(() => db.members.get(id), [id]);
}

export async function saveMember(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = uuidv4();
  const now = new Date();
  await db.members.add({ ...member, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateMember(id: string, updates: Partial<Member>) {
  await db.members.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteMember(id: string) {
  await db.members.delete(id);
}

// Meetings
export function useMeetings() {
  return useLiveQuery(() => db.meetingConsultations.orderBy('createdAt').reverse().toArray());
}

export function useMeeting(id: string) {
  return useLiveQuery(() => db.meetingConsultations.get(id), [id]);
}

export async function saveMeeting(meeting: Omit<MeetingConsultation, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = uuidv4();
  const now = new Date();
  await db.meetingConsultations.add({ ...meeting, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateMeeting(id: string, updates: Partial<MeetingConsultation>) {
  await db.meetingConsultations.update(id, { ...updates, updatedAt: new Date() });
}

// Self Analysis
export function useSelfAnalysis() {
  return useLiveQuery(() => db.selfAnalysis.get('self_analysis'));
}

export async function saveSelfAnalysis(analysis: Omit<SelfAnalysis, 'id' | 'updatedAt'>) {
  await db.selfAnalysis.put({ ...analysis, id: 'self_analysis', updatedAt: new Date() });
}

// Chat Messages
export function useChatMessages() {
  return useLiveQuery(() => db.chatMessages.orderBy('createdAt').toArray());
}

export async function addChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>) {
  const id = uuidv4();
  await db.chatMessages.add({ ...msg, id, createdAt: new Date() });
  return id;
}

export async function clearChatMessages() {
  await db.chatMessages.clear();
}

// Member Chat Messages
export function useMemberChatMessages(memberId: string) {
  return useLiveQuery(
    () => db.memberChatMessages.where('memberId').equals(memberId).sortBy('createdAt'),
    [memberId]
  );
}

export async function addMemberChatMessage(msg: Omit<MemberChatMessage, 'id' | 'createdAt'>) {
  const id = uuidv4();
  await db.memberChatMessages.add({ ...msg, id, createdAt: new Date() });
  return id;
}

export async function clearMemberChatMessages(memberId: string) {
  await db.memberChatMessages.where('memberId').equals(memberId).delete();
}
