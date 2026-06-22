import Hero from '@/components/sections/Hero/Hero';
import HeroSun from '@/components/sections/Hero/HeroSun';
import ServicesDeck from '@/components/sections/ServicesDeck/ServicesDeck';
import IntroSequence from '@/components/effects/IntroSequence/IntroSequence';

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* Services — the four-craft fleet, revealed once the hero pin releases */}
      <ServicesDeck />
      {/* The single shared sun — flown by the intro, expanded by hero scroll */}
      <HeroSun />
      <IntroSequence />
    </main>
  );
}
