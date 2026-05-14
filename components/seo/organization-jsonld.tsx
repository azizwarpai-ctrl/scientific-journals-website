/**
 * Server-rendered sitewide Organization schema.
 *
 * Tells Google / Bing this site is published by DigitoPub and links the
 * brand to its canonical URL + logo. Required for the Knowledge Graph
 * panel and for showing a site logo in SERP.
 *
 * @see https://schema.org/Organization
 */
export function OrganizationJsonLd({ appUrl }: { appUrl: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DigitoPub",
    alternateName: "DigitoPub - Scientific Journals Platform",
    url: appUrl,
    logo: `${appUrl}/icon.png`,
    sameAs: [`${appUrl}`],
    description:
      "DigitoPub is an open-access scientific journal publishing platform offering peer-reviewed research articles across multiple disciplines.",
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
