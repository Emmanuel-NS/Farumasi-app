import type { Metadata } from "next";
import {
  absoluteMediaUrl,
  fetchArticleMeta,
  siteOrigin,
} from "@/lib/server/article-meta";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleMeta(id);
  if (!article) {
    return { title: "Health Article" };
  }

  const title = article.title;
  const description =
    (article.summary ?? "").trim() ||
    `${article.category ?? "Health"} · Read on FARUMASI`;
  const canonical = `${siteOrigin()}/health/${article.slug ?? id}`;
  const image = absoluteMediaUrl(article.image_url);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "FARUMASI Health",
      ...(image
        ? {
            images: [
              {
                url: image,
                width: 1200,
                height: 630,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default function HealthArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
