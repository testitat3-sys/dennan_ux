import React from 'react';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import './AboutPage.css';

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.83 14.09c-.24.68-1.4 1.31-1.93 1.35-.51.05-.99.25-3.35-.7-2.83-1.14-4.63-4.02-4.77-4.2-.14-.19-1.14-1.51-1.14-2.88s.72-2.04.98-2.32c.24-.27.53-.34.71-.34s.36 0 .52.01c.17.01.39-.06.61.47.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.13-.28.28-.12.55.16.27.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.2 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.27.37-.22.62-.13.26.09 1.63.77 1.9.91.28.14.46.21.53.32.07.12.07.66-.17 1.34Z"/>
  </svg>
);

const AboutPage = () => {
  return (
    <Page noPaddingTop padding="inset" bottomSpacing="loose" className="about-page">
      <Page.Section as="header" fullBleed className="about-hero">
        <Text as="span" role="label-md" className="about-hero__eyebrow">Est. 2013 &middot; Kampala, Uganda</Text>
        <Text role="display-lg" as="h1" className="about-hero__title">Amazing Parents Since 2013</Text>
        <div className="about-hero__rule" aria-hidden="true" />
        <Text role="body-lg" color="secondary" className="about-hero__subtext">
          Dennan Baby to Kids is a one-stop provider of quality brands for parents and parents-to-be &mdash; 2 branches in Kampala, and an online home for families everywhere.
        </Text>
      </Page.Section>

      <Page.Section spacing="loose" className="about-story">
        <Text role="headline-md" as="h2">Our Story</Text>
        <Text role="body-lg" color="secondary">
          Since 2013, Dennan has grown from a single idea into 2 branches across Kampala and a
          growing online presence: a perfect understanding of what parents need, made simple. We believe
          parenting shouldn't come with guesswork, so we built a one-stop solution for quality, innovative,
          and practical products and services &mdash; without stretching your budget.
        </Text>

        <Text role="body-lg" color="secondary">
          Every product we stock is sorted into <strong>Essentials</strong>, <strong>Must-Haves</strong>, or
          <strong> Luxuries</strong> &mdash; because we believe value means understanding what each family
          actually needs, not just what's on the shelf.
        </Text>
        <blockquote className="about-story__mantra">
          <Text role="headline-sm" as="p">
            &ldquo;It's not our intention to satisfy our customers or to please our customers.
            Our intention is to AMAZE THEM!&rdquo;
          </Text>
        </blockquote>
      </Page.Section>

      <Page.Section spacing="loose" className="about-commitment">
        <Text role="headline-md" as="h2">Our Commitment to Quality</Text>
        <CardGrid columns={3} gap="default">
          <Card hasShadow={false}>
            <Card.Body>
              <Text role="title-lg" as="h3">Trusted Sourcing</Text>
              <Text role="body-sm" color="secondary">
                We stock unique, trusted brands imported directly from the UK, Turkey, Dubai, China, Vietnam,
                and the USA &mdash; chosen for quality, not just availability.
              </Text>
            </Card.Body>
          </Card>
          <Card hasShadow={false}>
            <Card.Body>
              <Text role="title-lg" as="h3">Fair Pricing</Text>
              <Text role="body-sm" color="secondary">
                By dealing directly with accredited suppliers and manufacturers, we keep prices competitive
                without cutting corners on quality.
              </Text>
            </Card.Body>
          </Card>
          <Card hasShadow={false}>
            <Card.Body>
              <Text role="title-lg" as="h3">Customer Experience</Text>
              <Text role="body-sm" color="secondary">
                From comfortable, welcoming stores to top-class service, we invest in making every visit
                feel easy &mdash; because parenting already has enough to figure out.
              </Text>
            </Card.Body>
          </Card>
        </CardGrid>
      </Page.Section>

      <Page.Section spacing="loose" className="about-contact">
        <Card hasShadow={false} className="about-contact__card">
          <Card.Body>
            <Text role="headline-md" as="h2">Let's Talk</Text>
            <Text role="body-lg" color="secondary" className="about-contact__text">
              Questions about a product, an order, or wholesale? Our team is a message away on WhatsApp.
            </Text>
            <Button
              href="https://wa.me/256784733314"
              variant="primary"
              icon={<WhatsAppIcon />}
            >
              Chat on WhatsApp
            </Button>
          </Card.Body>
        </Card>
      </Page.Section>
    </Page>
  );
};

export default AboutPage;
