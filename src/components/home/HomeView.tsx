import HeroSection from "./HeroSection";
import ServicesPreview from "./ServicesPreview";
import StatsBar from "./StatsBar";
import CtaSection from "./CtaSection";

// Homepage composition root.
export default function HomeView() {
  return (
    <>
      <HeroSection />
      <ServicesPreview />
      <StatsBar />
      <CtaSection />
    </>
  );
}
