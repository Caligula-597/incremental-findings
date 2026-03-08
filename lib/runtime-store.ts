import { AuditLog, AuthUser, EditorDecisionRecord, IpRateLimitRecord, NotificationJobRecord, OrcidLink, ProductionJobRecord, PublicationPackageRecord, ReviewAssignmentRecord, ReviewReportRecord, RiskScoreRecord, SecurityEventRecord, SubmissionFileRecord, SubmissionVersionRecord } from '@/lib/types';

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
export const runtimeSecurityEvents: SecurityEventRecord[] = [];
export const runtimeRiskScores: RiskScoreRecord[] = [];
export const runtimeIpRateLimits: IpRateLimitRecord[] = [];
