'use client';

import { BookOpen, ChevronDown, Trophy } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className='border-b border-gray-800'>
      <button
        onClick={onToggle}
        className='flex w-full items-center justify-between py-5 text-left'>
        <h3 className='text-lg font-medium text-white'>{question}</h3>
        <div
          className={`flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className='h-5 w-5 text-indigo-500' />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[1000px] pb-6' : 'max-h-0'
        }`}>
        <div className='prose prose-sm prose-invert text-gray-300'>{answer}</div>
      </div>
    </div>
  );
};

type TabType = 'contest' | 'documentation';

const FAQPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('contest');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'documentation' || tabParam === 'contest') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/faq?${params.toString()}`, { scroll: false });
  };

  const toggleFaq = (index: number) => {
    setOpenIndex(index === openIndex ? null : index);
  };

  const tokenEligibilityAnswer = (
    <div>
      <p className='mb-2'>
        Tokens must meet the following criteria at the time of your submission:
      </p>
      <ul className='list-disc pl-5 space-y-2'>
        <li>
          <strong>Launch Platform:</strong> Must be launched via Pump.fun, LaunchLab, or Bonk&apos;s
          official launch mechanism.
        </li>
        <li>
          <strong>Minimum Age:</strong> At least 7 days old.
        </li>
        <li>
          <strong>Minimum Market Cap:</strong> $100,000 USD.
        </li>
        <li>
          <strong>Minimum Liquidity:</strong> $10,000 USD.
        </li>
        <li>
          <strong>Exclusions:</strong> Known &quot;rug pulls&quot; or tokens with disabled trading
          are ineligible.
        </li>
      </ul>
      <p className='mt-3 text-sm text-gray-500 italic'>
        These requirements will be verified manually for winners.
      </p>
    </div>
  );

  const contestFaqItems = [
    {
      question: 'What is the Token Call Contest?',
      answer: (
        <p>
          The Token Call Contest is a competition where participants submit their best token price
          predictions. Winners are determined based on accuracy, timing, and market cap factors,
          with SOL prizes for the top performers.
        </p>
      ),
    },
    {
      question: 'When is the contest period?',
      answer: (
        <div>
          <p>The contest runs for one week:</p>
          <ul className='list-disc pl-5 mt-2 space-y-1'>
            <li>
              <strong>Start:</strong> Monday, May 19th, 2025 (00:01 UTC)
            </li>
            <li>
              <strong>End:</strong> Sunday, May 25th, 2025 (23:59 UTC)
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: 'How do I enter the contest?',
      answer: (
        <ul className='list-disc pl-5 space-y-2'>
          <li>
            Submit a token call via DYOR Hub and check the box for &quot;Token Call Contest&quot;.
          </li>
          <li>Only one (1) entry is allowed per user.</li>
          <li>Your &quot;Predicted Target Hit Date&quot; must be within the Contest Period.</li>
        </ul>
      ),
    },
    {
      question: 'What tokens are eligible for calls?',
      answer: tokenEligibilityAnswer,
    },
    {
      question: 'How is scoring calculated?',
      answer: (
        <div>
          <p className='font-medium mb-3'>
            Total Score = (PG_Score * TA_Score_Multiplier * MCF_Multiplier)
          </p>

          <div className='space-y-4'>
            <div>
              <p className='font-medium text-indigo-400'>Percentage Gain (PG_Score)</p>
              <p>The actual peak percentage gain of the token during the evaluation window.</p>
            </div>

            <div>
              <p className='font-medium text-indigo-400'>Time Accuracy (TA_Score_Multiplier)</p>
              <p>
                Based on the difference between your predicted peak date and the actual peak date:
              </p>
              <ul className='list-disc pl-5 mt-1 text-sm'>
                <li>0 days difference: 1.2x</li>
                <li>1 day difference: 1.1x</li>
                <li>2 days difference: 1.0x</li>
                <li>3 days difference: 0.9x</li>
                <li>More than 3 days difference: 0.8x</li>
              </ul>
            </div>

            <div>
              <p className='font-medium text-indigo-400'>Market Cap Factor (MCF_Multiplier)</p>
              <p>Based on the token&apos;s market capitalization at the time of your call:</p>
              <ul className='list-disc pl-5 mt-1 text-sm'>
                <li>$100,000 - $499,999 MC: 1.0x</li>
                <li>$500,000 - $1,999,999 MC: 1.1x</li>
                <li>$2,000,000 - $9,999,999 MC: 1.2x</li>
                <li>$10,000,000 MC or higher: 1.3x</li>
              </ul>
            </div>

            <div className='mt-4 bg-zinc-800 p-4 rounded-lg'>
              <p className='font-medium mb-2'>Scoring Example:</p>
              <p>
                Token with +500% gain (PG_Score = 500), $300K market cap (MCF = 1.0x), prediction 1
                day off (TA = 1.1x)
              </p>
              <p className='font-medium text-indigo-400 mt-1'>
                Score = 500 × 1.1 × 1.0 = 550 points
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      question: 'What are the social requirements?',
      answer: (
        <div>
          <p className='mb-2'>To be eligible for prizes, winners must:</p>
          <ul className='list-disc pl-5 space-y-1'>
            <li>Be following the official @DYORhub Twitter account.</li>
            <li>
              Have shared their contest prediction on Twitter during the Contest Period using DYOR
              Hub&apos;s share feature or by tagging @DYORhub with #DYORContestMay2025.
            </li>
          </ul>
          <p className='mt-2 text-sm text-gray-500 italic'>
            These requirements will be verified manually for winners.
          </p>
        </div>
      ),
    },
    {
      question: 'What are the prizes?',
      answer: (
        <div>
          <ul className='list-disc pl-5 space-y-1'>
            <li>
              <strong>1st Place:</strong> 1 SOL
            </li>
            <li>
              <strong>2nd Place:</strong> 0.5 SOL
            </li>
            <li>
              <strong>3rd Place:</strong> 0.25 SOL
            </li>
          </ul>
          <p className='mt-2 text-sm'>
            Prizes will be distributed to the primary, verified Solana wallet address associated
            with the winner&apos;s DYOR Hub account.
          </p>
        </div>
      ),
    },
  ];

  const documentationFaqItems = [
    {
      question: 'What is DYOR Hub?',
      answer: (
        <p>
          DYOR Hub (Do Your Own Research Hub) is a platform that helps Solana traders and investors
          make informed decisions. It provides tools to track, analyze, and share token insights
          within the Solana ecosystem.
        </p>
      ),
    },
    {
      question: 'How do I create an account?',
      answer: (
        <p>
          You can sign up by connecting your Twitter account. Click the login button in the
          top-right corner of the site and follow the authentication flow. This allows us to verify
          your identity and integrate social sharing features.
        </p>
      ),
    },
    {
      question: 'Can I connect my Solana wallet?',
      answer: (
        <p>
          Yes! After logging in, navigate to your profile account where you&apos;ll find options to
          connect your preferred Solana wallet. We support Phantom, Solflare, and other popular
          Solana wallets.
        </p>
      ),
    },
    {
      question: 'Where can I find the complete documentation?',
      answer: (
        <p>
          For a comprehensive guide to all DYOR Hub features, please visit our full documentation on
          GitBook:
          <a
            href='https://juliens-organization-7.gitbook.io/dyor-hub'
            target='_blank'
            rel='noopener noreferrer'
            className='text-indigo-400 hover:text-indigo-300 underline ml-1'>
            DYOR Hub Documentation
          </a>
        </p>
      ),
    },
  ];

  const activeFaqItems = activeTab === 'contest' ? contestFaqItems : documentationFaqItems;

  return (
    <div className='py-10 min-h-screen bg-black'>
      <div className='container max-w-4xl mx-auto px-4 sm:px-6'>
        <div className='flex flex-col items-center text-center mb-6'>
          <div className='bg-zinc-900/50 rounded-full p-3 mb-4 border border-zinc-800/80'>
            <BookOpen className='h-10 w-10 text-indigo-400' />
          </div>
          <h1 className='text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white'>
            DYOR Hub FAQ
          </h1>
          <p className='text-zinc-400 max-w-2xl'>
            Answers to frequently asked questions and contest rules.
          </p>
        </div>

        <div className='flex justify-center mb-8'>
          <div className='inline-flex rounded-md p-1 bg-zinc-900 border border-gray-700'>
            <button
              onClick={() => handleTabChange('contest')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'contest'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}>
              <Trophy className='w-4 h-4 mr-2' />
              Contest Rules
            </button>
            <button
              onClick={() => handleTabChange('documentation')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'documentation'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}>
              <BookOpen className='w-4 h-4 mr-2' />
              Documentation
            </button>
          </div>
        </div>

        <div className='bg-zinc-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden'>
          <div className='p-6 sm:p-8 space-y-0'>
            {activeFaqItems.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={index === openIndex}
                onToggle={() => toggleFaq(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
