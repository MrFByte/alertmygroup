export interface Member {
  id: string;
  name: string;
  muted: boolean;
}

export interface Ring {
  _id: string;
  channelCode: string;
  senderId: string;
  senderName: string;
  hasAudio: boolean;
  createdAt: string;
  acks: { memberId: string; at: string }[];
}

export interface Channel {
  code: string;
  name: string;
  members: Member[];
  latestRing?: Ring | null;
}

export interface LocalChannelData {
  code: string;
  memberId: string;
  name: string;
  channelName: string;
}

export type Theme = 'light' | 'dark';
