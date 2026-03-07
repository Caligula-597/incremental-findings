import { AuditLog, AuthUser, NotificationJobRecord, OrcidLink, SubmissionFileRecord, SubmissionVersionRecord } from '@/lib/types';

export const runtimeUsers: AuthUser[] = [];
export const runtimeOrcidLinks: OrcidLink[] = [];
export const runtimeSubmissionFiles: SubmissionFileRecord[] = [];
export const runtimeAuditLogs: AuditLog[] = [];

export const runtimeNotificationJobs: NotificationJobRecord[] = [];
export const runtimeSubmissionVersions: SubmissionVersionRecord[] = [];
