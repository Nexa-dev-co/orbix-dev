import Hero from '@/components/sections/Hero/Hero';

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* Placeholder scroll space after the hero pin releases */}
      <div style={{ height: '100vh', background: 'var(--bg)' }} />
    </main>
  );
}
