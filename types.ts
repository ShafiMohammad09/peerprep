import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  timezone: string;
  stars: number;
  lastStarRefresh: Timestamp;
  referralCode: string;
}

export enum BookingStatus {
  IDLE = 'idle',
  BOOKED = 'booked',
  READY = 'ready',
  WAITING_MATCH = 'waiting_match',
  MATCHED = 'matched',
  NO_MATCH = 'no_match',
  NO_SHOW = 'no_show',
}

export interface Booking {
  bookingId: string;
  userId: string;
  slotTime: Timestamp; // Use Firestore Timestamp
  status: BookingStatus;
  matchId?: string;
  meetLink?: string;
}
