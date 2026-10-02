import { countCreatedPerDay } from '@/lib/daily-counts';

/** New member accounts per Tehran day (kept apart from service.ts, which needs a request). */
export function countNewMembersPerDay(from: Date) {
  return countCreatedPerDay('members', from);
}
