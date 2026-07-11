import React from 'react';
import { Helmet } from 'react-helmet-async';
import Page from '../components/ui/Page';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import './AboutPage.css';

const FAQS = [
  {
    question: 'What does Dennan sell?',
    answer: 'Dennan sells baby, kid, and mum care essentials across three parenting stages — Expectant & New Mom, Newborn (0–6 months), and Baby & Toddler — organized into Essentials, Must-Haves, and Luxuries tiers. Products are imported from the UK, Turkey, Dubai, China, Vietnam, and the USA.',
  },
  {
    question: 'Where is Dennan located?',
    answer: 'Dennan operates 2 physical branches in Kampala, Uganda, alongside its online store at dennan.ug. Dennan was founded in 2013.',
  },
  {
    question: 'What currency are prices shown in?',
    answer: 'All prices on dennan.ug are listed in Ugandan Shillings (UGX).',
  },
  {
    question: 'Can I shop online and pick up in-store?',
    answer: 'Yes. Products browsed on dennan.ug can be ordered for delivery in Kampala, or you can visit either Kampala branch directly to shop in person.',
  },
  {
    question: 'How do I contact Dennan with a question about an order?',
    answer: 'The fastest way to reach Dennan is via WhatsApp. Questions about a product, an existing order, or wholesale inquiries are answered directly by the Dennan team.',
  },
  {
    question: 'Does Dennan offer a baby registry?',
    answer: 'Yes, expecting parents can create a Dennan registry to share a curated gift list with family and friends ahead of their baby\'s arrival.',
  },
];

const FAQPage = () => {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Page noPaddingTop padding="inset" bottomSpacing="loose" className="about-page">
      <Helmet>
        <title>FAQ | Dennan</title>
        <meta name="description" content="Answers to common questions about Dennan — what we sell, where we're located, delivery, pricing, and how to reach us." />
        <link rel="canonical" href="https://dennan.ug/faq" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <Page.Section as="header" fullBleed className="about-hero">
        <Text as="span" role="label-md" className="about-hero__eyebrow">Support</Text>
        <Text role="display-lg" as="h1" className="about-hero__title">Frequently Asked Questions</Text>
        <div className="about-hero__rule" aria-hidden="true" />
        <Text role="body-lg" color="secondary" className="about-hero__subtext">
          Quick answers about shopping with Dennan. Can't find what you need? Reach us on WhatsApp.
        </Text>
      </Page.Section>

      <Page.Section spacing="loose" className="about-story">
        {FAQS.map((faq, idx) => (
          <div key={idx} style={{ marginBottom: 'var(--space-8)' }}>
            <Text role="headline-sm" as="h2" style={{ marginBottom: 'var(--space-2)' }}>{faq.question}</Text>
            <Text role="body-lg" color="secondary">{faq.answer}</Text>
          </div>
        ))}
      </Page.Section>

      <Page.Section spacing="loose" className="about-contact">
        <Text role="body-lg" color="secondary" className="about-contact__text">
          Still have a question?
        </Text>
        <Button href="https://wa.me/256784733314" variant="primary">
          Chat on WhatsApp
        </Button>
      </Page.Section>
    </Page>
  );
};

export default FAQPage;
