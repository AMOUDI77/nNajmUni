import Hero from '../components/Hero';
import UniversityStrip from '../components/UniversityStrip';
import JourneySteps from '../components/JourneySteps';
import ServicesGrid from '../components/ServicesGrid';
import Testimonials from '../components/Testimonials';
import FAQAccordion from '../components/FAQAccordion';
import Reveal from '../components/Reveal';
export default function Home() {
  return <main><Hero /><Reveal><UniversityStrip /></Reveal><Reveal><JourneySteps /></Reveal><Reveal><ServicesGrid /></Reveal><Reveal><Testimonials /></Reveal><Reveal><FAQAccordion /></Reveal></main>;
}
