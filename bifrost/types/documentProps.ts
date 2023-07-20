export interface DocumentProps {
  // props inspired by NextJS's metadata conventions
  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#the-metadata-object
  title?: string;
  description?: string;
  viewport?: { [key: string]: string };
  metaTags?: MetaTag[];
}

type MetaTag = { name?: string; property?: string; content: string };
