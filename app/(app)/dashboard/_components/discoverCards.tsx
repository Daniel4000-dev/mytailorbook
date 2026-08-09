import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Symbol from '@/components/ui/Symbol/Symbol';

// Shared between the mobile swipe carousel and the desktop static grid —
// same four feature pointers, two different presentations.
export const DISCOVER_CARDS = [
  {
    icon: <Symbol name="ios_share" />,
    image: '/images/discover/portfolio.png',
    title: 'Share your portfolio',
    description: 'A public page with your best work — send the link to new customers.',
    cta: 'Set it up',
    href: '/settings/portfolio',
  },
  {
    icon: <Symbol name="location_on" />,
    image: '/images/discover/tracking.png',
    title: 'Customers can track their own order',
    description: 'Every order gets a live photo-story link — no app for them to install.',
    cta: 'See it in action',
    href: '/production',
  },
  {
    icon: <WhatsappIcon />,
    image: '/images/discover/whatsapp.png',
    title: 'Automatic WhatsApp updates',
    description: 'Ready-to-send stage updates, worded the way your shop actually talks.',
    cta: 'Customize wording',
    href: '/settings/messages',
  },
  {
    icon: <Symbol name="straighten" />,
    image: '/images/discover/measurement-builder.png',
    title: 'Build your own measurement sheet',
    description: "For anything off-catalog — name the fields you measure, once, and reuse them every time.",
    cta: 'Set up a style',
    href: '/settings/styles',
  },
];
