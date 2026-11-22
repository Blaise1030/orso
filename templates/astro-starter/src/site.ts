/** Site-wide name, description, navigation and footer, rendered by `layouts/Base.astro`. */
export const site = {
  name: "Starter",
  /** Short promise, used after the name in the home page title. */
  tagline: "Your Astro site, editable in Orso",
  /** Default meta description and social card text (keep it under 160 characters). */
  description:
    "A thin Astro starter with a get-started home and one sample posts collection you can edit in Orso.",
  /** Placeholder live address. The build uses PUBLIC_SITE_URL when it is set; replace this with your domain. */
  url: "https://example.com",
  /** Product / docs entry for Learn and Read the docs CTAs. */
  docsUrl: "https://projectorso.cc",
  /** Default social card, served from `public/`. */
  ogImage: "/og-default.png",
  nav: [{ label: "Examples", href: "/posts/" }],
  /** Header call to action; set to `null` to hide it. */
  cta: { label: "View sample posts", href: "/posts/" },
  footer: {
    text: "Scaffolded with Orso. Replace this copy with your own.",
    links: [
      { label: "Learn", href: "https://projectorso.cc" },
      { label: "Examples", href: "/posts/" },
      { label: "Orso", href: "https://projectorso.cc" },
    ],
  },
  socials: [] as { label: string; href: string }[],
};
