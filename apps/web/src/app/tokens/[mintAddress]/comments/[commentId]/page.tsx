import { comments, tokens } from '@/lib/api';
import { use } from 'react';
import TokenPage from '../../../[mintAddress]/page';

interface PageProps {
  params: Promise<{ mintAddress: string; commentId: string }>;
}

export default function Page({ params }: PageProps) {
  const { mintAddress, commentId } = use(params);
  return <TokenPage params={Promise.resolve({ mintAddress })} commentId={commentId} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mintAddress: string; commentId: string }>;
}) {
  const { mintAddress, commentId } = await params;

  try {
    const [tokenData, commentData] = await Promise.all([
      tokens.getByMintAddress(mintAddress),
      comments.get(commentId),
    ]);

    const title = `Comment on ${tokenData.symbol || tokenData.name} by ${commentData.user.displayName} - DYOR hub`;
    const description = commentData.content.replace(/<[^>]*>/g, '').substring(0, 160);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: `/tokens/${mintAddress}/comments/${commentId}/opengraph-image`,
          },
        ],
      },
      twitter: {
        title,
        description,
        card: 'summary_large_image',
        images: [`/tokens/${mintAddress}/comments/${commentId}/twitter-image`],
      },
    };
  } catch {
    return {
      title: 'Comment - DYOR hub',
    };
  }
}
