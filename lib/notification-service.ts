import { randomUUID } from 'crypto';
import { runtimeNotificationJobs } from '@/lib/runtime-store';
import { NotificationJobRecord } from '@/lib/types';

export type NotificationTemplateKey =
  | 'submission_received'
  | 'review_invitation'
  | 'decision_notice'
  | 'revision_request';

export type NotificationTemplate = {
  key: NotificationTemplateKey;
  subject: string;
  body: string;
  channel: 'email';
};

export type NotificationSendInput = {
  template: NotificationTemplateKey;
  to: string;
  variables?: Record<string, string | number>;
  actorEmail: string;
};

const TEMPLATES: NotificationTemplate[] = [
  {
    key: 'submission_received',
    channel: 'email',
    subject: '[Incremental Findings] Submission received: {{title}}',
    body: 'Dear {{authorName}},\n\nWe have received your submission "{{title}}". Your manuscript ID is {{submissionId}}.\n\nBest,\nEditorial Office'
  },
  {
    key: 'review_invitation',
    channel: 'email',
    subject: '[Incremental Findings] Review invitation: {{title}}',
    body: 'Dear {{reviewerName}},\n\nYou are invited to review "{{title}}". Please respond by {{deadline}}.\n\nBest,\nEditorial Office'
  },
  {
    key: 'decision_notice',
    channel: 'email',
    subject: '[Incremental Findings] Editorial decision: {{title}}',
    body: 'Dear {{authorName}},\n\nA decision has been made for "{{title}}": {{decision}}.\n\nComment: {{comment}}\n\nBest,\nEditorial Office'
  },
  {
    key: 'revision_request',
    channel: 'email',
    subject: '[Incremental Findings] Revision requested: {{title}}',
    body: 'Dear {{authorName}},\n\nPlease submit a revised version for "{{title}}" before {{deadline}}.\n\nBest,\nEditorial Office'
  }
];

function renderTemplate(raw: string, variables: Record<string, string | number> = {}) {
  return raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, token) => String(variables[token] ?? `{{${token}}}`));
}

export function listNotificationTemplates() {
  return TEMPLATES;
}

export function previewNotification(templateKey: NotificationTemplateKey, variables?: Record<string, string | number>) {
  const template = TEMPLATES.find((item) => item.key === templateKey);
  if (!template) {
    throw new Error('Template not found');
  }

  return {
    template: template.key,
    channel: template.channel,
    subject: renderTemplate(template.subject, variables),
    body: renderTemplate(template.body, variables)
  };
}

function getNotificationProvider() {
  return process.env.RESEND_API_KEY ? 'resend-ready' : 'log-only';
}

export async function sendNotification(input: NotificationSendInput): Promise<NotificationJobRecord> {
  const preview = previewNotification(input.template, input.variables);
  const provider = getNotificationProvider();

  const job: NotificationJobRecord = {
    id: randomUUID(),
    template: input.template,
    to: input.to,
    subject: preview.subject,
    renderedBody: preview.body,
    provider,
    status: provider === 'log-only' ? 'queued' : 'sent',
    actor_email: input.actorEmail,
    created_at: new Date().toISOString()
  };

  runtimeNotificationJobs.unshift(job);

  if (provider === 'log-only') {
    console.info('[notification:queued-log-only]', {
      to: job.to,
      subject: job.subject,
      template: job.template
    });
  }

  return job;
}

export function listNotificationJobs(limit = 30) {
  return runtimeNotificationJobs.slice(0, Math.max(1, Math.min(limit, 100)));
}
