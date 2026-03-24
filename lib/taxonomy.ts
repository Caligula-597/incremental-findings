import { SiteLang } from '@/lib/site-copy';
import { SubmissionTrack } from '@/lib/submission-track';

type TaxonomyOption = {
  value: string;
  label: Record<SiteLang, string>;
  tracks: SubmissionTrack[];
};

type TopicOption = TaxonomyOption & {
  discipline: string;
};

export const DISCIPLINE_OPTIONS: TaxonomyOption[] = [
  { value: 'Mathematics', label: { zh: '数学', en: 'Mathematics' }, tracks: ['academic'] },
  { value: 'Physics', label: { zh: '物理学', en: 'Physics' }, tracks: ['academic'] },
  { value: 'Computer Science', label: { zh: '计算机科学', en: 'Computer Science' }, tracks: ['academic', 'entertainment'] },
  { value: 'Life Sciences', label: { zh: '生命科学', en: 'Life Sciences' }, tracks: ['academic'] },
  { value: 'Medicine & Public Health', label: { zh: '医学与公共卫生', en: 'Medicine & Public Health' }, tracks: ['academic'] },
  { value: 'Earth & Environment', label: { zh: '地球与环境', en: 'Earth & Environment' }, tracks: ['academic'] },
  { value: 'Engineering', label: { zh: '工程', en: 'Engineering' }, tracks: ['academic', 'entertainment'] },
  { value: 'Interdisciplinary', label: { zh: '交叉学科', en: 'Interdisciplinary' }, tracks: ['academic', 'entertainment'] },
  { value: 'Creative Writing & Narrative', label: { zh: '创意写作与叙事', en: 'Creative Writing & Narrative' }, tracks: ['entertainment'] },
  { value: 'Science Communication', label: { zh: '科学传播', en: 'Science Communication' }, tracks: ['entertainment'] },
  { value: 'Design & Media', label: { zh: '设计与媒体', en: 'Design & Media' }, tracks: ['entertainment'] }
];

export const ARTICLE_TYPE_OPTIONS: TaxonomyOption[] = [
  { value: 'Research Article', label: { zh: '研究论文', en: 'Research Article' }, tracks: ['academic'] },
  { value: 'Methods', label: { zh: '方法论文', en: 'Methods' }, tracks: ['academic'] },
  { value: 'Negative Results', label: { zh: '阴性结果', en: 'Negative Results' }, tracks: ['academic'] },
  { value: 'Replication Study', label: { zh: '重复研究', en: 'Replication Study' }, tracks: ['academic'] },
  { value: 'Dataset Note', label: { zh: '数据集说明', en: 'Dataset Note' }, tracks: ['academic'] },
  { value: 'Perspective', label: { zh: '观点文章', en: 'Perspective' }, tracks: ['academic', 'entertainment'] },
  { value: 'Commentary', label: { zh: '评论', en: 'Commentary' }, tracks: ['entertainment'] },
  { value: 'Essay', label: { zh: '随笔', en: 'Essay' }, tracks: ['entertainment'] },
  { value: 'Popular Science Explainer', label: { zh: '科普解读', en: 'Popular Science Explainer' }, tracks: ['entertainment'] },
  { value: 'Field Notes', label: { zh: '现场记录', en: 'Field Notes' }, tracks: ['entertainment'] },
  { value: 'Creator Toolkit', label: { zh: '创作工具包', en: 'Creator Toolkit' }, tracks: ['entertainment'] }
];

export const TOPIC_OPTIONS: TopicOption[] = [
  { value: 'Number Theory', label: { zh: '数论', en: 'Number Theory' }, tracks: ['academic'], discipline: 'Mathematics' },
  { value: 'Optimization', label: { zh: '最优化', en: 'Optimization' }, tracks: ['academic'], discipline: 'Mathematics' },
  { value: 'Quantum Information', label: { zh: '量子信息', en: 'Quantum Information' }, tracks: ['academic'], discipline: 'Physics' },
  { value: 'Astrophysics', label: { zh: '天体物理', en: 'Astrophysics' }, tracks: ['academic'], discipline: 'Physics' },
  { value: 'Machine Learning', label: { zh: '机器学习', en: 'Machine Learning' }, tracks: ['academic', 'entertainment'], discipline: 'Computer Science' },
  { value: 'Security', label: { zh: '安全', en: 'Security' }, tracks: ['academic', 'entertainment'], discipline: 'Computer Science' },
  { value: 'Genomics', label: { zh: '基因组学', en: 'Genomics' }, tracks: ['academic'], discipline: 'Life Sciences' },
  { value: 'Neuroscience', label: { zh: '神经科学', en: 'Neuroscience' }, tracks: ['academic'], discipline: 'Life Sciences' },
  { value: 'Clinical Study', label: { zh: '临床研究', en: 'Clinical Study' }, tracks: ['academic'], discipline: 'Medicine & Public Health' },
  { value: 'Health Policy', label: { zh: '健康政策', en: 'Health Policy' }, tracks: ['academic'], discipline: 'Medicine & Public Health' },
  { value: 'Climate', label: { zh: '气候', en: 'Climate' }, tracks: ['academic'], discipline: 'Earth & Environment' },
  { value: 'Biodiversity', label: { zh: '生物多样性', en: 'Biodiversity' }, tracks: ['academic'], discipline: 'Earth & Environment' },
  { value: 'Robotics', label: { zh: '机器人', en: 'Robotics' }, tracks: ['academic', 'entertainment'], discipline: 'Engineering' },
  { value: 'Energy Systems', label: { zh: '能源系统', en: 'Energy Systems' }, tracks: ['academic'], discipline: 'Engineering' },
  { value: 'Open Science', label: { zh: '开放科学', en: 'Open Science' }, tracks: ['academic', 'entertainment'], discipline: 'Interdisciplinary' },
  { value: 'Bioinformatics', label: { zh: '生物信息学', en: 'Bioinformatics' }, tracks: ['academic'], discipline: 'Interdisciplinary' },
  { value: 'Researcher Diary', label: { zh: '研究者日记', en: 'Researcher Diary' }, tracks: ['entertainment'], discipline: 'Creative Writing & Narrative' },
  { value: 'Lab Storytelling', label: { zh: '实验室叙事', en: 'Lab Storytelling' }, tracks: ['entertainment'], discipline: 'Creative Writing & Narrative' },
  { value: 'Public Explainer', label: { zh: '公众解读', en: 'Public Explainer' }, tracks: ['entertainment'], discipline: 'Science Communication' },
  { value: 'Science for Users', label: { zh: '面向使用者的研究表达', en: 'Science for Users' }, tracks: ['entertainment'], discipline: 'Science Communication' },
  { value: 'Visual Story', label: { zh: '可视化叙事', en: 'Visual Story' }, tracks: ['entertainment'], discipline: 'Design & Media' },
  { value: 'Podcast Script', label: { zh: '播客脚本', en: 'Podcast Script' }, tracks: ['entertainment'], discipline: 'Design & Media' }
];

export const DISCIPLINES = DISCIPLINE_OPTIONS.map((item) => item.value);
export const ARTICLE_TYPES = ARTICLE_TYPE_OPTIONS.map((item) => item.value);

export const TOPIC_MAP: Record<string, string[]> = DISCIPLINE_OPTIONS.reduce<Record<string, string[]>>((acc, discipline) => {
  acc[discipline.value] = TOPIC_OPTIONS.filter((topic) => topic.discipline === discipline.value).map((topic) => topic.value);
  return acc;
}, {});

export function getDisciplineOptions(track: SubmissionTrack) {
  return DISCIPLINE_OPTIONS.filter((item) => item.tracks.includes(track));
}

export function getArticleTypeOptions(track: SubmissionTrack) {
  return ARTICLE_TYPE_OPTIONS.filter((item) => item.tracks.includes(track));
}

export function getTopicOptions(discipline: string, track: SubmissionTrack) {
  return TOPIC_OPTIONS.filter((item) => item.discipline === discipline && item.tracks.includes(track));
}

export function getTaxonomyLabel(value: string, lang: SiteLang, kind: 'discipline' | 'article_type' | 'topic') {
  const source =
    kind === 'discipline'
      ? DISCIPLINE_OPTIONS
      : kind === 'article_type'
        ? ARTICLE_TYPE_OPTIONS
        : TOPIC_OPTIONS;
  const matched = source.find((item) => item.value === value);
  return matched ? matched.label[lang] : value;
}
