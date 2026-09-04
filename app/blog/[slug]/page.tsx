import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBlogPostBySlug, getBlogSlugs } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import MdxImage from '@/components/blog/MdxImage';
import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';
import PreferredSourceBadge from '@/components/marketing/PreferredSourceBadge/PreferredSourceBadge';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const title = `${post.title} | ${APP_CONFIG.name} Blog`;
  // Falls back to the site's default OG image (root layout) when a post
  // has no coverImage of its own — a shared link should never show a
  // blank/broken preview image.
  const ogImage = post.coverImage || '/images/og-image.png';

  return {
    title,
    description: post.excerpt,
    robots: { index: true, follow: true },
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author || APP_CONFIG.name],
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export function generateStaticParams() {
  const slugs = getBlogSlugs();
  return slugs.map((slug) => ({ slug: slug.replace(/\.mdx$/, '') }));
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    // A named author gets marked up as a real Person (with their role, if
    // given) — Google's own guidance on trust signals asks whether content
    // is "written or reviewed by an expert who demonstrably knows the
    // topic," which an Organization byline can't answer. Falls back to the
    // org only when a post genuinely has no named author.
    author: post.author
      ? { '@type': 'Person', name: post.author, ...(post.authorTitle ? { jobTitle: post.authorTitle } : {}) }
      : { '@type': 'Organization', name: APP_CONFIG.name },
    publisher: { '@type': 'Organization', name: APP_CONFIG.name },
    // schema.org (and Google's own guidelines) expect `image` as a fully
    // qualified URL — a bare "/images/blog/..." path is technically
    // invalid structured data, even though it happened to work fine as
    // the (browser-resolved) og:image href above. coverImage is usually a
    // local /images/... path but isn't required to be, so only prefix it
    // when it isn't already absolute.
    ...(post.coverImage
      ? { image: post.coverImage.startsWith('http') ? post.coverImage : `${APP_CONFIG.baseUrl}${post.coverImage}` }
      : {}),
  };
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
      <Header />
      <main className={styles.page}>
        <article className={styles.content}>
          <Link href={ROUTES.blog} className={styles.back}>
            &larr; Back to Blog
          </Link>

          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.meta}>
            <p className={styles.date}>{post.date}</p>
            <PreferredSourceBadge />
          </div>

          {post.coverImage && (
            <div className={styles.coverImageWrap}>
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt || post.title}
                fill
                sizes="(max-width: 900px) 100vw, 720px"
                className={styles.coverImage}
                priority
              />
            </div>
          )}

          <div className={styles.prose}>
            <MDXRemote source={post.content} components={{ img: MdxImage }} />
          </div>

          {post.author && (
            <div className={styles.authorBio}>
              <div className={styles.authorAvatar} aria-hidden="true">
                {post.author.charAt(0)}
              </div>
              <div>
                <p className={styles.authorName}>
                  {post.author}
                  {post.authorTitle && <span className={styles.authorTitle}> — {post.authorTitle}</span>}
                </p>
                {post.authorBio && <p className={styles.authorBioText}>{post.authorBio}</p>}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
