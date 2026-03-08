import { AuditLog, AuthUser, EditorDecisionRecord, NotificationJobRecord, OrcidLink, ProductionJobRecord, PublicationPackageRecord, ReviewAssignmentRecord, ReviewReportRecord, SubmissionFileRecord, SubmissionVersionRecord } from '@/lib/types';

export const runtimeUsers: AuthUser[] = [];
export const runtimeOrcidLinks: OrcidLink[] = [];
export const runtimeSubmissionFiles: SubmissionFileRecord[] = [];
export const runtimeAuditLogs: AuditLog[] = [];

export const runtimeNotificationJobs: NotificationJobRecord[] = [];
export const runtimeSubmissionVersions: SubmissionVersionRecord[] = [];
export const runtimeReviewAssignments: ReviewAssignmentRecord[] = [];
export const runtimeReviewReports: ReviewReportRecord[] = [];
export const runtimeEditorDecisions: EditorDecisionRecord[] = [];
export const runtimeProductionJobs: ProductionJobRecord[] = [];
export const runtimePublicationPackages: PublicationPackageRecord[] = [];
