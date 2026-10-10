import Hero from '../components/Hero';
import UniversityStrip from '../components/UniversityStrip';
import Features from '../components/Features';
import BudgetCalculator from '../components/BudgetCalculator';
import JourneyTimeline from '../components/JourneyTimeline';
import JourneySteps from '../components/JourneySteps';
import StatsBar from '../components/StatsBar';
import ServicesGrid from '../components/ServicesGrid';
import Testimonials from '../components/Testimonials';
import FAQAccordion from '../components/FAQAccordion';
import BookingSection from '../components/BookingSection';
import CTASection from '../components/CTASection';
import Reveal from '../components/Reveal';

export default function Home() {
  return (
    <main>
      <Hero />

      <Reveal delay={0}>
        <UniversityStrip />
      </Reveal>

      <Reveal delay={0} direction="up">
        <Features />
      </Reveal>

      <Reveal delay={0} direction="up">
        <BudgetCalculator />
      </Reveal>

      {/* Discovery Hub — Comparison + AI Match */}
      <Reveal delay={0} direction="up">
        <JourneyTimeline />
      </Reveal>

      {/* Journey Steps — standalone section */}
      <Reveal delay={0} direction="up">
        <JourneySteps />
      </Reveal>

      <Reveal delay={0} direction="up">
        <StatsBar />
      </Reveal>

      <Reveal delay={0} direction="up">
        <ServicesGrid />
      </Reveal>

      <Reveal delay={0} direction="up">
        <Testimonials />
      </Reveal>

      <Reveal delay={0} direction="up">
        <FAQAccordion />
      </Reveal>

      <Reveal delay={0} direction="up">
        <BookingSection />
      </Reveal>

      <Reveal delay={0} direction="up">
        <CTASection />
      </Reveal>
    </main>
  );
}
