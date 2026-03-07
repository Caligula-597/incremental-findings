import { AuditLog, AuthUser, NotificationJobRecord, OrcidLink, SubmissionFileRecord } from '@/lib/types';

export const runtimeUsers: AuthUser[] = [];
export const runtimeOrcidLinks: OrcidLink[] = [];
export const runtimeSubmissionFiles: SubmissionFileRecord[] = [];
export const runtimeAuditLogs: AuditLog[] = [];

export const runtimeNotificationJobs: NotificationJobRecord[] = [];
