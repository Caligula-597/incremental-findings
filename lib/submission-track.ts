import { SiteLang } from '@/lib/site-copy';
import { Submission } from '@/lib/types';

export const SUBMISSION_TRACKS = ['academic', 'entertainment'] as const;

export type SubmissionTrack = (typeof SUBMISSION_TRACKS)[number];

export function isSubmissionTrack(value: string | null | undefined): value is SubmissionTrack {
  return value === 'academic' || value === 'entertainment';
}

export function getSubmissionTrack(input: Pick<Submission, 'category'> | { category?: string | null }): SubmissionTrack {
  return input.category === 'entertainment' ? 'entertainment' : 'academic';
}

export function getSubmissionTrackLabel(track: SubmissionTrack, lang: SiteLang) {
  if (lang === 'zh') {
    return track === 'entertainment' ? '自由创作区' : '学术研讨区';
  }
  return track === 'entertainment' ? 'Creative / Entertainment' : 'Academic Review Track';
}

export function getSubmissionTrackDoiNote(track: SubmissionTrack, lang: SiteLang) {
  if (lang === 'zh') {
    return track === 'entertainment'
      ? '娱乐区作品仅做公开展示与讨论，不分配 DOI。'
      : '当前为讨论/孵化版本；作者可在修订达标后申请正式版 DOI。';
  }

  return track === 'entertainment'
    ? 'Creative/entertainment submissions are public discussion pieces and do not receive a DOI.'
    : 'This is currently a discussion/incubation version; authors may request a DOI for the formal version after revision.';
}
