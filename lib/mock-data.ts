import { Submission } from '@/lib/types';

const now = Date.now();

export const mockSubmissions: Submission[] = [
  {
    id: 's-001',
    title: 'An Incremental Bound for Sparse Prime Gap Estimation',
    journal: 'Journal of Experimental Number Theory',
    category: 'Mathematics',
    review:
      'We improved a known sieve bound by 0.7% under specific assumptions. While small, this refinement clarifies edge cases often ignored in prior derivations and improves reproducibility for teaching-oriented proofs.',
    fileUrl: '#',
    status: 'published',
    createdAt: new Date(now - 1 * 86400000).toISOString()
  },
  {
    id: 's-002',
    title: 'A Negative Result on Tiny Transformer Compression for Symbolic Logic',
    journal: 'Computing Systems Letters',
    category: 'Computer Science',
    review:
      'Compression below 8-bit quantization harmed theorem consistency on long chains. This failed optimization still provides practical constraints for lightweight reasoning models in production.',
    fileUrl: '#',
    status: 'published',
    createdAt: new Date(now - 2 * 86400000).toISOString()
  },
  {
    id: 's-003',
    title: 'A Reproducibility Note on Thermal Drift in Low-cost Spectrometers',
    journal: 'Applied Instrumentation Review',
    category: 'Physics',
    review:
      'We observed calibration drift after repeated warm restarts. The effect is not novel, but we provide a clear correction workflow for labs with constrained budgets.',
    fileUrl: '#',
    status: 'pending',
    createdAt: new Date(now - 3 * 86400000).toISOString()
  }
];
