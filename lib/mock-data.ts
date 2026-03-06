import { Submission } from '@/lib/types';

const now = Date.now();

export const mockSubmissions: Submission[] = [
  {
    id: 's-001',
    title: 'An Incremental Bound for Sparse Prime Gap Estimation',
    authors: 'L. Chen, M. Gupta',
    abstract:
      'We improved a known sieve bound by 0.7% under specific assumptions. While small, this refinement clarifies edge cases and reproducibility tradeoffs.',
    file_url: '#',
    status: 'published',
    created_at: new Date(now - 1 * 86400000).toISOString()
  },
  {
    id: 's-002',
    title: 'A Negative Result on Tiny Transformer Compression for Symbolic Logic',
    authors: 'A. Zhang, D. Park',
    abstract:
      'Compression below 8-bit quantization harmed theorem consistency on long chains. The failure still gives practical boundaries for deployment.',
    file_url: '#',
    status: 'published',
    created_at: new Date(now - 2 * 86400000).toISOString()
  },
  {
    id: 's-003',
    title: 'A Reproducibility Note on Thermal Drift in Low-cost Spectrometers',
    authors: 'R. Morales',
    abstract:
      'We observed calibration drift after warm restarts and provide a low-cost correction workflow for constrained labs.',
    file_url: '#',
    status: 'pending',
    created_at: new Date(now - 3 * 86400000).toISOString()
  }
];
