import type { NotificationMessage } from './types.js';

export interface JobAlertInput {
  jobId: string;
  title: string;
  company: string | null;
  location: string;
  matchScore?: number | null;
  missingSkills?: string[];
  url: string;
}

/** The spec's "🔥 New Job" alert (spec §Notification Agent). */
export function newJobAlert(job: JobAlertInput): NotificationMessage {
  const lines = [
    '🔥 New Job',
    job.title,
    job.company ?? '',
    job.location,
    job.matchScore != null ? `${job.matchScore}% Match` : '',
    job.missingSkills && job.missingSkills.length > 0
      ? `Missing Skill: ${job.missingSkills.join(', ')}`
      : '',
    `Apply: ${job.url}`,
  ].filter(Boolean);

  return {
    subject: `🔥 ${job.title}${job.company ? ` @ ${job.company}` : ''}`,
    body: lines.join('\n'),
    jobId: job.jobId,
  };
}

/** A simple test/manual notification. */
export function testNotification(): NotificationMessage {
  return {
    subject: 'AI Job Hunter — test notification',
    body: 'This is a test notification from AI Job Hunter. Channels are working. ✅',
  };
}
