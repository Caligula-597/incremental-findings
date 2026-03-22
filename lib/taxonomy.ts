export const DISCIPLINES = [
  'Mathematics',
  'Physics',
  'Computer Science',
  'Life Sciences',
  'Medicine & Public Health',
  'Earth & Environment',
  'Engineering',
  'Interdisciplinary'
] as const;

export const ARTICLE_TYPES = [
  'Research Article',
  'Methods',
  'Negative Results',
  'Replication Study',
  'Dataset Note',
  'Perspective'
] as const;

export const TOPIC_MAP: Record<(typeof DISCIPLINES)[number], string[]> = {
  Mathematics: ['Number Theory', 'Algebra', 'Geometry', 'Optimization', 'Probability'],
  Physics: ['Condensed Matter', 'Optics', 'Astrophysics', 'Fluid Dynamics', 'Quantum Information'],
  'Computer Science': ['Machine Learning', 'Systems', 'Security', 'HCI', 'Programming Languages'],
  'Life Sciences': ['Genomics', 'Neuroscience', 'Ecology', 'Cell Biology', 'Evolution'],
  'Medicine & Public Health': ['Clinical Study', 'Epidemiology', 'Medical AI', 'Health Policy', 'Drug Safety'],
  'Earth & Environment': ['Climate', 'Geoscience', 'Remote Sensing', 'Ocean Science', 'Biodiversity'],
  Engineering: ['Materials', 'Robotics', 'Energy Systems', 'Control', 'Manufacturing'],
  Interdisciplinary: ['Science of Science', 'Computational Social Science', 'Bioinformatics', 'Digital Humanities', 'Open Science']
};
