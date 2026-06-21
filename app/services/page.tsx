import type { Metadata } from 'next';
import ServicesFleet from '@/components/sections/ServicesFleet/ServicesFleet';

export const metadata: Metadata = {
  title: 'orbix — the fleet',
  description:
    'Six disciplines, one gravity. Custom web applications, SaaS platforms, enterprise CRM, mobile apps, AI solutions, and digital product design — each its own vessel.',
};

export default function ServicesPage() {
  return (
    <main>
      <ServicesFleet />
    </main>
  );
}
