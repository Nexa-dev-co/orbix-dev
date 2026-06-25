import Hero from '@/components/sections/Hero/Hero';
import HeroSun from '@/components/sections/Hero/HeroSun';
import IntroSequence from '@/components/effects/IntroSequence/IntroSequence';

export default function HomePage() {
  return (
    <main>
      {/* Hero owns the services deck overlay too — one pin fills the square, reveals the
          fleet, then runs the carousel. */}
      <Hero />
      {/* The single shared sun — flown by the intro, expanded by hero scroll */}
      <HeroSun />
      <IntroSequence />
    </main>
  );
}
