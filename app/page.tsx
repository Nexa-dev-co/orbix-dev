import Hero from '@/components/sections/Hero/Hero';
import HeroSun from '@/components/sections/Hero/HeroSun';
import IntroSequence from '@/components/effects/IntroSequence/IntroSequence';

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* Placeholder scroll space after the hero pin releases */}
      <div style={{ height: '100vh', background: 'var(--bg)' }} />
      {/* The single shared sun — flown by the intro, expanded by hero scroll */}
      <HeroSun />
      <IntroSequence />
    </main>
  );
}
