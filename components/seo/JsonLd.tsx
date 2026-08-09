/** Renders a `<script type="application/ld+json">` block for structured
 *  data. Centralizes the "<" escape every call site needs: JSON.stringify
 *  doesn't escape it, so unescaped user/owner-entered content (a shop bio,
 *  a testimonial comment) containing "</script>" could break out of the
 *  tag and inject arbitrary HTML into the page. */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
