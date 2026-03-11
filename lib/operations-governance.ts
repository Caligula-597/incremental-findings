export interface OperationsGovernanceSnapshot {
  migrationPipeline: {
    sourceOfTruth: 'supabase/migrations';
    releaseGateRequired: boolean;
    ciRequiredChecks: string[];
  };
  auditRetention: {
    onlineRetentionDays: number;
    archiveEnabled: boolean;
    archiveTable: string;
    recommendedSchedule: string;
  };
  preservation: {
    strategy: 'provider-export-and-cold-archive';
    cadence: string;
    targets: string[];
  };
}

export function getOperationsGovernanceSnapshot(): OperationsGovernanceSnapshot {
  const onlineRetentionDays = Number(process.env.AUDIT_LOG_ONLINE_RETENTION_DAYS ?? '90') || 90;

  return {
    migrationPipeline: {
      sourceOfTruth: 'supabase/migrations',
      releaseGateRequired: true,
      ciRequiredChecks: ['npm run verify:migrations', 'npm run lint', 'npm run typecheck', 'npm run build', 'npm run smoke']
    },
    auditRetention: {
      onlineRetentionDays,
      archiveEnabled: true,
      archiveTable: 'public.audit_logs_archive',
      recommendedSchedule: 'daily'
    },
    preservation: {
      strategy: 'provider-export-and-cold-archive',
      cadence: 'weekly',
      targets: ['crossref/datacite payload snapshots', 'audit logs archive', 'metadata snapshots']
    }
  };
}
