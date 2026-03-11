import { AuditLog, AuthUser, EditorDecisionRecord, EthicsCaseRecord, IndexingExportRecord, IpRateLimitRecord, MetadataSnapshotRecord, NotificationJobRecord, OrcidLink, ProductionJobRecord, PublicationPackageRecord, ReviewAssignmentRecord, ReviewReportRecord, RiskScoreRecord, SecurityEventRecord, SubmissionFileRecord, SubmissionVersionRecord } from '@/lib/types';

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
export const runtimeIndexingExports: IndexingExportRecord[] = [];
export const runtimeMetadataSnapshots: MetadataSnapshotRecord[] = [];

export const runtimeEthicsCases: EthicsCaseRecord[] = [];
