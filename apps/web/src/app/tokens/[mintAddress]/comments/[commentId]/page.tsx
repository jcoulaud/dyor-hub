import { comments, tokens } from '@/lib/api';
import { sanitizeHtml } from '@/lib/utils';
import { use } from 'react';
import TokenPage from '../../page';

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

    const processedContent = sanitizeHtml(commentData.content, {
      preserveLineBreaks: true,
      lineBreakChar: ' ',
      maxLength: 160,
      replaceImagesWithText: true,
    });

    return {
      title,
      description: processedContent,
      openGraph: {
        title,
        description: processedContent,
        images: [
          {
            url: `/tokens/${mintAddress}/comments/${commentId}/opengraph-image`,
          },
        ],
      },
      twitter: {
        title,
        description: processedContent,
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
