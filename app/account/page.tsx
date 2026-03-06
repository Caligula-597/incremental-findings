import { SiteHeader } from '@/components/header';

const workSections = [
  { title: 'Submissions in progress', href: '/editor' },
  { title: 'Published work', href: '/editor' },
  { title: 'Peer review', href: '/editor' },
  { title: 'Editorial tasks', href: '/editor' }
];

const accountSections = [
  { title: 'Track your research', href: '/submit' },
  { title: 'Subscriptions and purchases', href: '/account' },
  { title: 'Manage your account', href: '/account' }
];

export default function AccountPage() {
  return (
    <main>
      <SiteHeader />

      <section className="rounded bg-[#084f74] px-6 py-8 text-white">
        <h2 className="font-serif text-4xl">Welcome back</h2>
        <p className="mt-2 text-white/90">Plan submissions, classify research, and manage editorial progress in one place.</p>
        <div className="mt-5 flex flex-wrap gap-6 text-sm">
          <p>
            <span className="text-2xl font-semibold">0</span> Articles
          </p>
          <p>
            <span className="text-2xl font-semibold">0</span> Citations
          </p>
          <p>
            <span className="text-2xl font-semibold">0</span> Accesses
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded border border-zinc-300 p-6">
          <h3 className="font-serif text-3xl">Your work</h3>
          <ul className="mt-5 space-y-3">
            {workSections.map((item) => (
              <li key={item.title}>
                <a className="text-xl font-semibold underline underline-offset-4" href={item.href}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded border border-zinc-300 p-6">
          <h3 className="font-serif text-2xl">Account</h3>
          <ul className="mt-4 space-y-3">
            {accountSections.map((item) => (
              <li key={item.title}>
                <a className="text-base underline underline-offset-4" href={item.href}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          <a href="/login" className="mt-8 inline-block text-base font-semibold underline underline-offset-4">
            Log out
          </a>
        </aside>
      </section>
    </main>
  );
}
