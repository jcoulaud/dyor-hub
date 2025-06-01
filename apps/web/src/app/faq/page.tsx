'use client';

import {
  DYORHUB_SYMBOL,
  MIN_TOKEN_HOLDING_FOR_AI_TA,
  MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS,
  MIN_TOKEN_HOLDING_FOR_FEED,
  MIN_TOKEN_HOLDING_FOR_FOLDERS,
  MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS,
  MIN_TOKEN_HOLDING_FOR_TOP_TRADERS,
} from '@/lib/constants';
import { BookOpen, ChevronDown, Star, Trophy } from 'lucide-react';
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
          isOpen ? 'max-h-[4000px] pb-6' : 'max-h-0'
        }`}>
        <div className='prose prose-sm prose-invert text-gray-300'>{answer}</div>
      </div>
    </div>
  );
};

type TabType = 'contests' | 'overview' | 'features';

const FAQPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    // Handle legacy parameters
    if (tabParam === 'documentation') {
      setActiveTab('overview'); // Map old documentation to overview
    } else if (tabParam === 'contest' || tabParam === 'contests') {
      setActiveTab('contests');
    } else if (tabParam === 'overview' || tabParam === 'features') {
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

  const contestsFaqItems = [
    {
      question: 'Token Call Contest #1 (May 19-25, 2025) - ENDED',
      answer: (
        <div>
          <div className='bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4'>
            <p className='text-red-400 font-medium'>This contest has ended.</p>
          </div>

          <div className='space-y-4'>
            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Contest Overview</h4>
              <p>
                The Token Call Contest was a competition where participants submitted their best
                token price predictions. Winners were determined based on accuracy, timing, and
                market cap factors, with SOL prizes for the top performers.
              </p>
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Contest Period</h4>
              <ul className='list-disc pl-5 space-y-1'>
                <li>
                  <strong>Start:</strong> Monday, May 19th, 2025 (00:01 UTC)
                </li>
                <li>
                  <strong>End:</strong> Sunday, May 25th, 2025 (23:59 UTC)
                </li>
              </ul>
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Entry Requirements</h4>
              <ul className='list-disc pl-5 space-y-2'>
                <li>
                  Submit a token call via DYOR Hub with &quot;Token Call Contest&quot; checked
                </li>
                <li>Only one (1) entry allowed per user</li>
                <li>&quot;Predicted Target Hit Date&quot; must be within the Contest Period</li>
              </ul>
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Token Eligibility</h4>
              {tokenEligibilityAnswer}
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Scoring System</h4>
              <p className='font-medium mb-3'>
                Total Score = (PG_Score × TA_Score_Multiplier × MCF_Multiplier)
              </p>

              <div className='space-y-3'>
                <div>
                  <p className='font-medium text-green-400'>Percentage Gain (PG_Score)</p>
                  <p className='text-sm'>
                    The actual peak percentage gain of the token during the evaluation window.
                  </p>
                </div>

                <div>
                  <p className='font-medium text-green-400'>Time Accuracy (TA_Score_Multiplier)</p>
                  <p className='text-sm mb-1'>
                    Based on the difference between predicted and actual peak date:
                  </p>
                  <ul className='list-disc pl-5 text-sm space-y-1'>
                    <li>0 days difference: 1.2x</li>
                    <li>1 day difference: 1.1x</li>
                    <li>2 days difference: 1.0x</li>
                    <li>3 days difference: 0.9x</li>
                    <li>More than 3 days: 0.8x</li>
                  </ul>
                </div>

                <div>
                  <p className='font-medium text-green-400'>Market Cap Factor (MCF_Multiplier)</p>
                  <p className='text-sm mb-1'>Based on token market cap at time of call:</p>
                  <ul className='list-disc pl-5 text-sm space-y-1'>
                    <li>$100K - $499K: 1.0x</li>
                    <li>$500K - $1.9M: 1.1x</li>
                    <li>$2M - $9.9M: 1.2x</li>
                    <li>$10M+: 1.3x</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Social Requirements</h4>
              <p className='mb-2'>Winners were required to:</p>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  Follow{' '}
                  <a
                    href='https://x.com/dyorhub'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-indigo-400 hover:text-indigo-300 underline'>
                    @DYORhub
                  </a>{' '}
                  on Twitter
                </li>
                <li>Retweet the official contest announcement</li>
                <li>Share their prediction on Twitter with #DYORHubContest</li>
              </ul>
            </div>

            <div>
              <h4 className='font-medium text-indigo-400 mb-2'>Prizes</h4>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
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
            </div>
          </div>
        </div>
      ),
    },
    {
      question: 'Future Contests',
      answer: (
        <div>
          <p className='mb-4'>
            We regularly host contests and competitions for the DYOR Hub community. Stay tuned for
            announcements of upcoming contests!
          </p>
          <div className='bg-indigo-900/20 border border-indigo-700 rounded-lg p-4'>
            <p className='text-indigo-300 font-medium mb-2'>How to Stay Updated:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>
                Follow{' '}
                <a
                  href='https://x.com/dyorhub'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-indigo-400 hover:text-indigo-300 underline'>
                  @DYORhub
                </a>{' '}
                on Twitter
              </li>
              <li>Check this FAQ page regularly for updates</li>
              <li>Join our community channels for early announcements</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const overviewFaqItems = [
    {
      question: 'What is DYOR Hub?',
      answer: (
        <div>
          <p className='mb-3'>
            DYOR Hub (Do Your Own Research Hub) is a comprehensive platform designed to help Solana
            traders and investors make informed decisions. It provides advanced tools to track,
            analyze, and share token insights within the Solana ecosystem.
          </p>
          <p className='mb-3'>
            Our platform combines real-time data analysis, social features, and AI-powered insights
            to give you everything you need for thorough token research.
          </p>
        </div>
      ),
    },
    {
      question: 'Useful Links',
      answer: (
        <div>
          <p className='mb-4'>Here are some helpful links for DYOR Hub:</p>
          <ul className='space-y-2 mb-6'>
            <li>
              <strong>Main Platform:</strong>{' '}
              <a
                href='https://dyorhub.xyz'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://dyorhub.xyz/
              </a>
            </li>
            <li>
              <strong>Official Twitter:</strong>{' '}
              <a
                href='https://x.com/DYORhub'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://x.com/DYORhub
              </a>
            </li>
            <li>
              <strong>Founder&apos;s Twitter:</strong>{' '}
              <a
                href='https://x.com/JulienCoulaud'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://x.com/JulienCoulaud
              </a>
            </li>
            <li>
              <strong>Discord Community:</strong>{' '}
              <a
                href='https://discord.com/invite/MDw6vG8E3y'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://discord.com/invite/MDw6vG8E3y
              </a>
            </li>
            <li>
              <strong>Telegram Group:</strong>{' '}
              <a
                href='https://t.me/dyorhub_official'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://t.me/dyorhub_official
              </a>
            </li>
            <li>
              <strong>GitHub Repository:</strong>{' '}
              <a
                href='https://github.com/jcoulaud/dyor-hub'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://github.com/jcoulaud/dyor-hub
              </a>
            </li>
          </ul>

          <div className='mb-4'>
            <h4 className='font-medium text-indigo-400 mb-3'>💎 $DYORHUB Token Information</h4>
            <ul className='space-y-2'>
              <li>
                <strong>Contract Address:</strong>{' '}
                <span className='font-mono text-indigo-400'>
                  2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump
                </span>
              </li>
              <li>
                <strong>Market Data:</strong>{' '}
                <a
                  href='https://dexscreener.com/solana/2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-indigo-400 hover:text-indigo-300 underline'>
                  https://dexscreener.com/solana/2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump
                </a>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      question: 'Team & Tokenomics',
      answer: (
        <div>
          <div className='mb-6'>
            <h4 className='font-medium text-indigo-400 mb-3'>💎 Token Specifications</h4>
            <p className='mb-4'>
              The $DYORHUB token is the core utility token of the DYORHub platform — powering
              research, rewards, and token-gated features across the ecosystem.
            </p>
            <p className='mb-4'>
              Importantly, <strong>$DYORHUB was launched using Pump.fun</strong>, following a fully
              decentralized, transparent, and community-first tokenomics model.
            </p>

            <div className='bg-zinc-800/50 rounded-lg p-4 mb-4'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-600'>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>Type</th>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>
                      Number of Tokens
                    </th>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>Percentage</th>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-b border-gray-700'>
                    <td className='py-3 px-3 text-white font-medium align-middle'>Total Supply</td>
                    <td className='py-3 px-3 align-middle'>1 Billion</td>
                    <td className='py-3 px-3 align-middle'>100%</td>
                    <td className='py-3 px-3 align-middle'>-</td>
                  </tr>
                  <tr className='border-b border-gray-700'>
                    <td className='py-3 px-3 text-white font-medium align-middle'>Team</td>
                    <td className='py-3 px-3 align-middle'>47 Million</td>
                    <td className='py-3 px-3 align-middle'>4.7%</td>
                    <td className='py-3 px-3 align-middle'>Locked on Streamflow</td>
                  </tr>
                  <tr>
                    <td className='py-3 px-3 text-white font-medium align-middle'>Circulating</td>
                    <td className='py-3 px-3 align-middle'>953 Million</td>
                    <td className='py-3 px-3 align-middle'>95.3%</td>
                    <td className='py-3 px-3 align-middle'>Available for trading</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className='mb-6'>
            <h4 className='font-medium text-indigo-400 mb-3'>💼 Relevant Addresses</h4>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-600'>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>Type</th>
                    <th className='text-left py-3 px-3 text-indigo-400 align-middle'>Address</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-b border-gray-700'>
                    <td className='py-3 px-3 text-white font-medium align-middle'>
                      Marketing Wallet
                    </td>
                    <td className='py-3 px-3 font-mono text-xs break-all align-middle'>
                      B5BwurzzkE1c6S4mrbcuenBTA3F7WwCWQP59dtScbsgx
                    </td>
                  </tr>
                  <tr>
                    <td className='py-3 px-3 text-white font-medium align-middle'>Meteora LP</td>
                    <td className='py-3 px-3 align-middle'>
                      <a
                        href='https://app.meteora.ag/dlmm/BHTJoj5aNjWPzVViGbe2sSuGU7huGGCLBWJEqXPzseD6'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-indigo-400 hover:text-indigo-300 underline text-xs'>
                        View Liquidity Pool
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className='mb-6'>
            <h4 className='font-medium text-indigo-400 mb-3'>⚙️ Fair Launch via Pump.fun</h4>
            <p className='mb-3'>
              We chose to launch $DYORHUB on{' '}
              <a
                href='https://pump.fun'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                Pump.fun
              </a>{' '}
              because it guarantees a{' '}
              <strong>rug-proof, fair, and immutable token distribution</strong>, with no tricks or
              hidden allocations.
            </p>

            <div className='bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4'>
              <p className='text-green-300 font-medium mb-2'>What this means:</p>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  ✅ <strong>No presale</strong>
                </li>
                <li>
                  ✅ <strong>No private allocation</strong>
                </li>
                <li>
                  ✅ <strong>No dev mint</strong>
                </li>
                <li>
                  ✅ <strong>No wallet whitelist</strong>
                </li>
                <li>
                  ✅ <strong>No liquidity rug risk</strong>
                </li>
              </ul>
            </div>
          </div>

          <div className='mb-6'>
            <h4 className='font-medium text-indigo-400 mb-3'>🔐 Why This Matters</h4>
            <p className='mb-3'>
              Launching with pump.fun protects users and keeps the playing field level:
            </p>
            <ul className='list-disc pl-5 space-y-2 text-sm'>
              <li>
                <strong>No centralized supply control</strong> - Community owns the majority
              </li>
              <li>
                <strong>No team wallets selling on your head</strong> - Team allocation is locked
              </li>
              <li>
                <strong>No token rug risk</strong> - Liquidity is permanently locked
              </li>
              <li>
                <strong>Easy on-chain verification</strong> - All transactions are transparent
              </li>
            </ul>
            <p className='mt-4 text-sm font-medium text-indigo-300'>
              We believe in <strong>doing your own research</strong> — and that starts with a fair
              launch.
            </p>
          </div>

          <div className='mb-4'>
            <h4 className='font-medium text-indigo-400 mb-3'>👥 Team</h4>
            <p className='mb-3'>
              <strong>DYOR Hub</strong> was created by <strong>Julien Coulaud</strong>, a fully{' '}
              <strong>doxxed developer</strong> (
              <a
                href='https://x.com/JulienCoulaud'
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-400 hover:text-indigo-300 underline'>
                https://x.com/JulienCoulaud
              </a>
              ) with extensive experience in web and crypto. From inception, our mission has been to
              build an open, transparent, and community-driven platform that makes crypto research
              more efficient and secure for the Solana memecoins ecosystem.
            </p>
            <p className='mb-4'>
              While Julien leads development, <strong>DYOR Hub is open-source</strong> and benefits
              greatly from <strong>community contributions</strong>. We welcome feedback and
              suggestions from our users.
            </p>

            <div className='bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-4'>
              <p className='text-indigo-300 font-medium mb-2'>📌 Community Involvement</p>
              <ul className='list-disc pl-5 space-y-2 text-sm'>
                <li>
                  <strong>GitHub Issues:</strong> We use GitHub to track feature requests, bug
                  reports, and ideas. If you&apos;ve identified an improvement or found an issue,
                  please open a ticket or join discussions on existing topics.
                </li>
                <li>
                  <strong>🗣️ Discord Community:</strong> Our Discord serves as a hub for
                  collaboration. We&apos;ve established dedicated channels for feature suggestions,
                  use case discussions, and roadmap planning. It&apos;s also an excellent place to
                  connect with fellow users and influence platform development.
                </li>
                <li>
                  <strong>🤝 Code Contributions:</strong> Developers are invited to contribute to
                  the codebase. We believe in transparent, collaborative development.
                </li>
              </ul>
            </div>

            <p className='mb-4'>
              DYOR Hub is designed to be the essential research tool for cryptocurrency enthusiasts
              who value data-driven decision making.
            </p>

            <div className='bg-indigo-900/20 border border-indigo-700 rounded-lg p-4'>
              <p className='text-indigo-300 font-medium mb-2'>Core Values:</p>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  <strong>Transparency</strong> - All development and decisions are made publicly
                </li>
                <li>
                  <strong>Community First</strong> - Users and community members drive our roadmap
                </li>
                <li>
                  <strong>Fair Distribution</strong> - No special allocations or insider advantages
                </li>
                <li>
                  <strong>Continuous Innovation</strong> - Constantly improving tools and features
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const featuresFaqItems = [
    {
      question: 'Login & Account Creation',
      answer: (
        <div>
          <p className='mb-4'>Getting started with DYOR Hub is simple and secure:</p>

          <div className='mb-4'>
            <img
              src='/images/faq/login/login-button.png'
              alt='DYOR Hub login button interface - Sign in button in top right corner'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Select the &quot;Sign&quot; button in the top right corner
            </p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Step-by-Step Process:</h5>
            <ol className='list-decimal pl-5 space-y-2'>
              <li>
                <strong>Click Login:</strong> Find the login button in the top-right corner of any
                page
              </li>
              <li>
                <strong>Twitter Authentication:</strong> Connect your Twitter account for secure
                verification
              </li>
              <li>
                <strong>Permission Grant:</strong> Follow the OAuth flow to grant necessary
                permissions
              </li>
              <li>
                <strong>Account Setup:</strong> Your profile is automatically created upon
                successful authentication
              </li>
              <li>
                <strong>Immediate Access:</strong> Start using basic features right away
              </li>
            </ol>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/login/twitter-auth.png'
              alt='Twitter authorization screen with Authorize App button'
              className='w-full max-w-sm mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Click &quot;Authorize App&quot; to complete authentication
            </p>
          </div>

          <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4'>
            <p className='text-blue-300 font-medium mb-2'>Why Twitter Integration?</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>
                <strong>Verified Identity:</strong> Ensures authentic user interactions
              </li>
              <li>
                <strong>Social Features:</strong> Enables sharing and following capabilities
              </li>
              <li>
                <strong>Spam Prevention:</strong> Reduces bot accounts and fake profiles
              </li>
              <li>
                <strong>Seamless Experience:</strong> One-click authentication without passwords
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      question: 'Token Search & Discovery',
      answer: (
        <div>
          <p className='mb-4'>
            DYOR Hub uses Contract Address (CA) search only to prevent users from accidentally
            landing on scam tokens when typing tickers. This ensures you always find the exact token
            you&apos;re looking for.
          </p>

          <div className='mb-4'>
            <img
              src='/images/faq/search/search-interface.png'
              alt='DYOR Hub token search interface - Enter a token Contract Address (CA) to search'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Enter a token Contract Address (CA) to search
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Token Detail Pages',
      answer: (
        <div>
          <p className='mb-4'>
            Every token listed on DYOR Hub has its own detail page. This page gathers key info,
            on-chain data, community discussion, and links all in one place.
          </p>

          <div className='mb-4'>
            <img
              src='/images/faq/token-detail/token-overview.png'
              alt='Example DYOR Hub token detail page showing comprehensive token information'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Social Links</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Official links: Twitter/X, Telegram, Discord, Website</li>
                <li>
                  <span className='text-red-400'>Red Twitter/X Icon:</span> Account changed username
                  before
                </li>
                <li>
                  <span className='text-blue-400'>Website Expiration:</span> Hover to see domain
                  expiry date
                </li>
                <li>
                  <span className='text-green-400'>Verified Dev:</span> Badge for verified
                  developers
                </li>
              </ul>
            </div>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Token Information</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Price, Market Cap, 24h Volume</li>
                <li>Total & Circulating Supply</li>
                <li>Top Holder Concentration</li>
                <li>Creation Date & Creator Wallet</li>
                <li>Creation Transaction (Solscan link)</li>
                <li>24-hour price chart</li>
              </ul>
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Community Discussion</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Share thoughts and analysis</li>
                <li>Voting: Upvote/downvote comments</li>
                <li>Share to X (Twitter) with preview</li>
                <li>Tip $DYORHUB for valuable comments</li>
                <li>Verified team member badges</li>
              </ul>
            </div>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Token Calls</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Summary of price/market cap predictions</li>
                <li>Total, Active, Successful calls</li>
                <li>Accuracy percentage</li>
                <li>&quot;View all&quot; and &quot;Make a Prediction&quot;</li>
                <li>Community sentiment indicator</li>
              </ul>
            </div>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/token-detail/community-discussion.png'
              alt='Community discussion section showing comments and voting features'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Discuss the token with the community
            </p>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/token-detail/token-calls-summary.png'
              alt='Token calls summary widget showing user predictions'
              className='w-full max-w-sm mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Summary of user predictions for the token
            </p>
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Bundle Analysis</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Coordinated wallet detection (bundles)</li>
                <li>Total Bundled % of supply</li>
                <li>Current Holdings % (0% = distributed)</li>
                <li>SOL invested by bundles</li>
                <li>Number of bundles and wallets</li>
              </ul>
            </div>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>External Resources</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>Quick links to Dexscreener</li>
                <li>Birdeye analytics</li>
                <li>Solscan blockchain explorer</li>
                <li>Pump.fun (if applicable)</li>
                <li>Market sentiment overview</li>
              </ul>
            </div>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/token-detail/bundle-analysis.png'
              alt='Bundle analysis section showing coordinated wallet detection'
              className='w-full max-w-sm mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Coordinated wallet activity analysis
            </p>
          </div>

          <div className='bg-yellow-900/20 border border-yellow-700 rounded-lg p-4'>
            <p className='text-yellow-300 font-medium mb-2'>🔍 Bundle Analysis Key</p>
            <p className='text-sm'>
              High &quot;Current Holdings %&quot; might suggest risk, as the bundled group could
              still dump their tokens. If &quot;Current Holdings %&quot; is 0%, the token is
              considered &quot;distributed&quot; - a good sign indicating the initial group likely
              sold off.
            </p>
          </div>

          <div className='mb-4 mt-6'>
            <h5 className='font-medium text-indigo-400 mb-2'>Token Analysis Features</h5>
            <p className='mb-3'>
              DYOR Hub provides comprehensive analysis tools to help you research tokens thoroughly:
            </p>
            <img
              src='/images/faq/token-detail/token-analyses.png'
              alt='Four analysis features available on token pages'
              className='w-full rounded-lg border border-gray-700 shadow-lg mb-4'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>
              Four powerful analysis tools for token research
            </p>
            <ul className='list-disc pl-5 space-y-2 text-sm'>
              <li>
                <strong>Early Buyers Analysis:</strong> See the first buyers of any token and
                whether they&apos;re still holding
              </li>
              <li>
                <strong>Diamond Hands Analysis:</strong> Advanced insights into holder distribution
                and whale movements
              </li>
              <li>
                <strong>AI Trading Analysis:</strong> AI-powered technical analysis and price
                predictions
              </li>
              <li>
                <strong>Top Traders Analysis:</strong> See the top traders of any token and their
                PnL
              </li>
            </ul>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Risk Score Assessment</h5>
            <p className='mb-3'>
              The Risk Score API helps assess token investment risk by evaluating multiple factors
              and generating a normalized risk score from 1-10. This enables users to make more
              informed decisions when trading tokens on Solana.
            </p>
            <img
              src='/images/faq/token-detail/risk-score.png'
              alt='Risk score feature showing token risk assessment'
              className='w-full max-w-md mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Comprehensive risk assessment for informed trading
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Wallet Verification',
      answer: (
        <div>
          <p className='mb-4'>
            Connect your wallet to DYOR Hub to unlock more features, verify ownership, and interact
            with the community.
          </p>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Why Connect Your Wallet?</h5>
            <ul className='list-disc pl-5 space-y-2'>
              <li>
                <strong>Verify Ownership:</strong> Prove you control a specific wallet
              </li>
              <li>
                <strong>Access Features:</strong> Use features available only to token holders or
                verified users
              </li>
              <li>
                <strong>Enable Tipping:</strong> Let others tip you $DYORHUB via your public profile
              </li>
              <li>
                <strong>Get Team Verification:</strong> Get a &quot;Verified Team&quot; badge if
                your wallet matches a token&apos;s developer address
              </li>
            </ul>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>How to Connect</h5>
            <ol className='list-decimal pl-5 space-y-2'>
              <li>Go to Account → Wallet Connection</li>
              <li>
                Click <strong>Connect Wallet</strong>. The site will detect Phantom or other Solana
                wallets
              </li>
            </ol>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/wallet/wallet-connection.png'
              alt='Wallet connection page in Account settings'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Navigate to Account → Wallet to connect
            </p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>How to Verify</h5>
            <ol className='list-decimal pl-5 space-y-2'>
              <li>
                After connecting, click <strong>Verify Now</strong>
              </li>
              <li>
                <strong>Sign a message</strong> in your wallet to confirm ownership (this is free,
                no transaction cost)
              </li>
            </ol>
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div>
              <img
                src='/images/faq/wallet/wallet-verification.png'
                alt='Wallet connected, ready for verification'
                className='w-full rounded-lg border border-gray-700 shadow-lg'
              />
              <p className='text-xs text-gray-400 mt-2 text-center'>
                Click Verify Now to start verification
              </p>
            </div>
            <div>
              <img
                src='/images/faq/wallet/sign-message.png'
                alt='Sign message in wallet interface'
                className='w-full rounded-lg border border-gray-700 shadow-lg'
              />
              <p className='text-xs text-gray-400 mt-2 text-center'>
                Sign the message in your wallet
              </p>
            </div>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/wallet/verification-complete.png'
              alt='Wallet verified successfully status'
              className='w-full max-w-md mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>Verification complete!</p>
          </div>

          <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4'>
            <p className='text-blue-300 font-medium mb-2'>🔒 Privacy</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>
                Your wallet address is <strong>private by default</strong>
              </li>
              <li>
                Turn on &quot;Public Profile Visibility&quot; if you want your address shown
                publicly for tips
              </li>
              <li>
                This verification system ensures identity validation while maintaining transparent,
                verifiable ownership
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      question: 'User Profiles',
      answer: (
        <div>
          <p className='mb-4'>
            Every DYOR Hub user gets a <strong>public profile page</strong> showing their activity,
            predictions, and reputation. Profiles help identify valuable contributors and allow
            users to follow, tip, and interact.
          </p>
          <p className='mb-4'>
            You can view a profile by clicking a username or going to:
            <span className='font-mono text-indigo-400 ml-2'>
              https://dyorhub.xyz/users/&lt;username&gt;
            </span>
          </p>

          <div className='mb-4'>
            <img
              src='/images/faq/profiles/user-profile-page.png'
              alt='Complete user profile page example showing stats and achievements'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>Example user profile page</p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Identity & Stats</h5>
            <p className='mb-2'>Profiles show key info:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>Display Name & Username</li>
              <li>&quot;Verified Token Team&quot; Badge (if applicable)</li>
              <li>Follower/Following Counts</li>
              <li>Actions: Share, Follow, Tip</li>
              <li>Link to Twitter/X Profile</li>
              <li>Engagement Stats: Number of comments, replies, and votes</li>
            </ul>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Achievements</h5>
            <p className='mb-2'>Users earn badges for milestones like:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>Consistent activity</li>
              <li>Accurate predictions</li>
              <li>High community engagement</li>
              <li>Other platform achievements</li>
            </ul>
            <p className='text-sm text-gray-400 mt-2'>
              Badges quickly show a user&apos;s reliability and participation level.
            </p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Prediction Performance</h5>
            <p className='mb-2'>This section shows how well the user predicts token performance:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>Number of Calls & Success Rate</li>
              <li>Timing Accuracy (%): How close their calls are to target dates</li>
              <li>Average Return: Average gains on successful calls</li>
              <li>Average Market Cap: The typical size of tokens they make calls on</li>
            </ul>
            <p className='text-sm text-gray-400 mt-2'>
              Click &quot;View All Calls&quot; to see their full prediction history.
            </p>
          </div>

          <div className='bg-green-900/20 border border-green-700 rounded-lg p-4'>
            <p className='text-green-300 font-medium mb-2'>💡 Activity Timeline</p>
            <p className='text-sm mb-2'>A history of the user&apos;s actions on the platform:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>Comments and replies</li>
              <li>Votes</li>
              <li>Token predictions</li>
            </ul>
            <p className='text-sm mt-2'>
              You can filter the timeline by activity type and sort by date or engagement.
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Leaderboards',
      answer: (
        <div>
          <p className='mb-4'>
            DYOR Hub Leaderboards highlight the most active, accurate, and helpful users. They help
            you see top contributors, track your own stats, and encourage friendly competition.
          </p>
          <p className='mb-4'>
            Leaderboards update in real-time and have been used for{' '}
            <strong>promotions with SOL rewards</strong> (like for top referrers).
          </p>

          <div className='mb-4'>
            <img
              src='/images/faq/leaderboard/leaderboard-overview.png'
              alt='Example Upvotes Received leaderboard showing community rankings'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>
              Example: &quot;Upvotes Received&quot; leaderboard
            </p>
          </div>

          <p className='mb-3'>There are several leaderboard categories:</p>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Token Calls</h5>
            <p className='mb-2'>
              Ranks users on how well they predict token performance. Metrics include:
            </p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>
                <strong>Success Rate:</strong> How often calls are right.
              </li>
              <li>
                <strong>Timing Precision:</strong> How close calls are to the target date.
              </li>
              <li>
                <strong>Average Return:</strong> Average gain on successful calls.
              </li>
              <li>
                <strong>Average Market Cap:</strong> Typical size of tokens called.
              </li>
            </ul>
            <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-3'>
              <p className='text-blue-300 font-medium mb-2'>How the Calls Score is Calculated:</p>
              <p className='text-sm mb-2'>The score uses this formula:</p>
              <p className='text-sm font-mono bg-zinc-800 p-2 rounded mb-2'>
                Score = (Successful Calls / Total Calls) × log(Total Calls + 1)
              </p>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  <code>(Successful Calls / Total Calls)</code> is the Success Rate.
                </li>
                <li>
                  <code>log(Total Calls + 1)</code> rewards making more calls, but less aggressively
                  than just counting total calls. This prevents spamming low-quality calls to climb
                  the ranks.
                </li>
              </ul>
              <p className='text-sm mt-2'>
                This formula balances accuracy (Success Rate) with activity (Total Calls).
              </p>
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Community Categories</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  <strong>Reputation:</strong> A combined score based on all your activity on the
                  platform. High reputation users are often trusted community members.
                </li>
                <li>
                  <strong>Top Referrers:</strong> Tracks who has brought the most new users to DYOR
                  Hub via the referral program. Important for referral promotions.
                </li>
                <li>
                  <strong>Posts:</strong> Ranks users by the number and quality of their posts.
                </li>
              </ul>
            </div>
            <div className='bg-zinc-800/50 rounded-lg p-4'>
              <h5 className='font-medium text-purple-400 mb-2'>Engagement Categories</h5>
              <ul className='list-disc pl-5 space-y-1 text-sm'>
                <li>
                  <strong>Comments:</strong> Ranks users based on their comment activity, rewarding
                  helpful discussion participation.
                </li>
                <li>
                  <strong>Upvotes Given:</strong> Shows who gives the most upvotes, recognizing
                  users who support good content.
                </li>
                <li>
                  <strong>Upvotes Received:</strong> Shows who receives the most upvotes,
                  highlighting users whose contributions are valued by the community.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      question: 'Calls',
      answer: (
        <div>
          <p className='mb-3'>
            Make <strong>Token Calls</strong> on DYOR Hub to predict a token&apos;s future price or
            market cap. Calls are public, timestamped, and tracked automatically, promoting
            accountability.
          </p>
          <p className='mb-4'>
            This isn&apos;t about vague guesses; it&apos;s about making specific, trackable
            predictions.
          </p>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>How to Make a Call</h5>
            <p className='mb-3'>
              On any token detail page, click <strong>&quot;Make a Prediction&quot;</strong>.
              You&apos;ll need to set:
            </p>
            <ul className='list-disc pl-5 space-y-2'>
              <li>
                <strong>Target:</strong> Predict the <em>Market Cap</em> or <em>Price</em>.
              </li>
              <li>
                <strong>Format:</strong> Predict a percentage gain (e.g., +50%), a multiple (e.g.,
                2x), or a specific target value (e.g., $1M market cap).
              </li>
              <li>
                <strong>Timeframe:</strong> When you expect it to happen (e.g., 1 week, 1 month).
              </li>
              <li>
                <strong>Reasoning (Optional):</strong> Briefly explain why you&apos;re making the
                call.
              </li>
            </ul>
          </div>

          <div className='mb-4'>
            <img
              src='/images/faq/calls/make-prediction.png'
              alt='Making a prediction interface for token calls'
              className='w-full max-w-xs mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>Making a prediction</p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Calls in Community Discussion</h5>
            <p className='mb-3'>
              Your call appears in the token&apos;s <strong>Community Discussion</strong> like a
              comment, but with special formatting to stand out.
            </p>
            <img
              src='/images/faq/calls/call-in-discussion.png'
              alt='How a call appears in community discussion'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              How a call looks in the discussion
            </p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Call Detail Page</h5>
            <p className='mb-3'>Each call gets its own page with detailed tracking:</p>
            <img
              src='/images/faq/calls/call-detail-page.png'
              alt='Detailed view of a specific call with tracking chart'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>
              Detailed view of a specific call
            </p>
            <p className='mb-2'>This page shows:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm'>
              <li>
                <strong>Chart:</strong> Tracks the price/market cap towards your target over time.
              </li>
              <li>
                <strong>Metrics:</strong> Compares the target, starting value, and current status.
              </li>
              <li>
                <strong>Timing:</strong> Shows when the call was made and the deadline.
              </li>
              <li>
                <strong>Your Analysis:</strong> Your original reasoning (if provided).
              </li>
              <li>
                <strong>Outcome:</strong> Clearly marked as success ✅ or failure ❌, with the
                actual performance multiple (e.g., 2.02x).
              </li>
              <li>
                <strong>Interaction:</strong> Others can reply, vote, tip $DYORHUB, or share your
                call visually on Twitter/X.
              </li>
            </ul>
            <p className='mt-3 text-sm'>
              These pages make it easy to see how predictions perform and recognize accurate
              callers.
            </p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Token Calls Explorer</h5>
            <p className='mb-3'>
              The <strong>Token Calls Explorer</strong> is a dashboard showing all calls made on the
              platform. Analyze community-wide accuracy, timing, and performance.
            </p>
            <p className='mb-2'>You can view:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm mb-3'>
              <li>All Calls</li>
              <li>Active Calls</li>
              <li>Successful Calls</li>
              <li>Failed Calls</li>
            </ul>
            <p className='mb-2'>Each entry shows:</p>
            <ul className='list-disc pl-5 space-y-1 text-sm mb-3'>
              <li>
                <strong>Who made the call & for which token</strong>
              </li>
              <li>
                <strong>Status</strong> (✅ Success, ⏳ Pending, ❌ Failed)
              </li>
              <li>
                <strong>Starting Market Cap</strong>
              </li>
              <li>
                <strong>Target Value</strong> (price or market cap)
              </li>
              <li>
                <strong>Actual Growth Multiple</strong>
              </li>
              <li>
                <strong>Call Timestamp & Deadline</strong>
              </li>
            </ul>
            <p className='mb-3 text-sm'>
              You can filter by <strong>date range</strong>, <strong>user</strong>, or{' '}
              <strong>token</strong>.
            </p>
            <img
              src='/images/faq/calls/calls-explorer.png'
              alt='Token Calls Explorer dashboard showing all platform calls'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-3'>
              Exploring all calls on the platform
            </p>
            <p className='text-sm'>
              Use the explorer to find successful predictors, track active calls, or see which
              tokens are getting attention.
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Tipping',
      answer: (
        <div>
          <p className='mb-4'>
            Show appreciation for helpful content by sending <code>$DYORHUB</code> tokens directly
            to other users. You can tip insightful comments or user profiles.
          </p>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>How to Tip</h5>

            <p className='mb-3'>
              <strong>1. Start the Tip</strong>
            </p>
            <p className='mb-3'>
              Click the <strong>&quot;Tip&quot;</strong> icon below a comment or on a user&apos;s
              profile.
            </p>
            <img
              src='/images/faq/tipping/tip-button.png'
              alt='Tip button below a comment'
              className='w-full max-w-md mx-auto rounded-lg border border-gray-700 shadow-lg mb-4'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>
              Tip button below a comment
            </p>

            <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4'>
              <p className='text-blue-300 text-sm'>
                You can only tip users who have made their wallet public in their profile settings.
              </p>
            </div>

            <p className='mb-3'>
              <strong>2. Choose the Amount</strong>
            </p>
            <p className='mb-3'>
              A popup will ask how many <code>$DYORHUB</code> tokens you want to send. You can:
            </p>
            <ul className='list-disc pl-5 space-y-1 text-sm mb-3'>
              <li>Enter a custom amount</li>
              <li>Choose a preset amount (e.g., 10k, 20k, 50k, 100k)</li>
            </ul>
            <img
              src='/images/faq/tipping/tip-amount-selection.png'
              alt='Tip amount selection popup'
              className='w-full max-w-sm mx-auto rounded-lg border border-gray-700 shadow-lg mb-4'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>Tip amount selection</p>

            <p className='mb-3'>
              <strong>3. Confirm in Wallet</strong>
            </p>
            <p className='mb-3'>
              Click <strong>&quot;Send Tip&quot;</strong>. Your connected wallet (like Phantom) will
              ask you to approve the transaction.
            </p>

            <p className='mb-3'>
              <strong>4. Confirmation</strong>
            </p>
            <p className='mb-3'>
              After the transaction succeeds, you&apos;ll see a confirmation showing the amount sent
              and who received it.
            </p>
            <img
              src='/images/faq/tipping/tip-confirmation.png'
              alt='Tip sent confirmation'
              className='w-full max-w-sm mx-auto rounded-lg border border-gray-700 shadow-lg mb-4'
            />
            <p className='text-xs text-gray-400 mt-2 text-center mb-4'>Tip sent confirmation</p>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Tip History</h5>
            <p className='mb-3'>
              See all your sent and received tips in <strong>Account → Tips</strong>. This includes
              the <strong>date</strong>, <strong>amount</strong>, and{' '}
              <strong>what was tipped</strong> (comment or profile).
            </p>
            <img
              src='/images/faq/tipping/tip-history.png'
              alt='Tip history in account settings'
              className='w-full rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Your tip history in account settings
            </p>
          </div>

          <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4'>
            <p className='text-blue-300 text-sm'>
              Remember, you can tip specific comments or user profiles directly.
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Referral Program',
      answer: (
        <div>
          <p className='mb-4'>
            Invite friends to DYOR Hub using your referral code or link. Referrals help grow the
            community, boost your leaderboard rank, and might earn you rewards during special
            promotions.
          </p>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Get Your Referral Link/Code</h5>
            <p className='mb-3'>Go to Account → Referrals to find:</p>
            <ul className='list-disc pl-5 space-y-1'>
              <li>Your Unique Referral Code (5 characters)</li>
              <li>A Shareable Referral Link (includes your code)</li>
            </ul>
            <p className='mt-2 text-sm'>
              Share the link or code with friends. When someone signs up using it, they count as
              your referral.
            </p>
          </div>

          <div className='grid md:grid-cols-2 gap-4 mb-4'>
            <div>
              <img
                src='/images/faq/referral/referral-code.png'
                alt='Referral code and link in Account settings'
                className='w-full rounded-lg border border-gray-700 shadow-lg'
              />
              <p className='text-xs text-gray-400 mt-2 text-center'>Your referral code and link</p>
            </div>
            <div>
              <img
                src='/images/faq/referral/referral-tracking.png'
                alt='My Referrals section showing referred users'
                className='w-full rounded-lg border border-gray-700 shadow-lg'
              />
              <p className='text-xs text-gray-400 mt-2 text-center'>Track your referrals</p>
            </div>
          </div>

          <div className='mb-4'>
            <h5 className='font-medium text-indigo-400 mb-2'>Benefits of Referring</h5>
            <ul className='list-disc pl-5 space-y-2'>
              <li>Help build the DYOR Hub community</li>
              <li>Climb the Referral Leaderboard</li>
              <li>Potentially earn SOL rewards during promotions</li>
              <li>Increase your visibility on the platform</li>
            </ul>
          </div>

          <div className='bg-green-900/20 border border-green-700 rounded-lg p-4'>
            <p className='text-green-300 font-medium mb-2'>Using Someone Else&apos;s Code</p>
            <p className='text-sm mb-3'>
              If someone referred you, enter their 5-character code in the &quot;Referred By&quot;
              section and click &quot;Apply Code&quot; in your account settings.
            </p>
            <img
              src='/images/faq/referral/apply-code.png'
              alt="Referred By section to enter someone's code"
              className='w-full max-w-md mx-auto rounded-lg border border-gray-700 shadow-lg'
            />
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Enter a referral code you received
            </p>
          </div>
        </div>
      ),
    },
    {
      question: 'Token-Gated Features & Requirements',
      answer: (
        <div>
          <p className='mb-2'>
            DYOR Hub offers premium features unlocked by holding our native {DYORHUB_SYMBOL} token.
            Here are the token holding requirements:
          </p>
          <ul className='list-disc pl-5 space-y-2'>
            <li>
              <strong>Social Feed:</strong> {MIN_TOKEN_HOLDING_FOR_FEED.toLocaleString()}{' '}
              {DYORHUB_SYMBOL} - Follow users and view all their activity in one place under the
              Feed tab in your watchlist.
            </li>
            <li>
              <strong>Custom Folders:</strong> {MIN_TOKEN_HOLDING_FOR_FOLDERS.toLocaleString()}{' '}
              {DYORHUB_SYMBOL} - Create and organize custom token folders for better portfolio
              tracking.
            </li>
            <li>
              <strong>Early Buyers Analysis:</strong>{' '}
              {MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS.toLocaleString()} {DYORHUB_SYMBOL} - Run an
              analysis to see the first buyers of any token (in order) and whether they&apos;re
              still holding.
            </li>
            <li>
              <strong>Diamond Hands Analysis:</strong>{' '}
              {MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS.toLocaleString()} {DYORHUB_SYMBOL} - Get
              advanced insights into token holder distribution, whale movements, and detailed wallet
              activity.
            </li>
            <li>
              <strong>AI Technical Analysis:</strong> {MIN_TOKEN_HOLDING_FOR_AI_TA.toLocaleString()}{' '}
              {DYORHUB_SYMBOL} - Access AI-powered technical analysis and price predictions.
            </li>
            <li>
              <strong>Top Traders Analysis:</strong>{' '}
              {MIN_TOKEN_HOLDING_FOR_TOP_TRADERS.toLocaleString()} {DYORHUB_SYMBOL} - See the top
              traders of any token and their PnL
            </li>
          </ul>
          <p className='mt-3 text-sm text-gray-500 italic'>
            Token must be held in your connected wallet to access these features.
          </p>
        </div>
      ),
    },
  ];

  const activeFaqItems =
    activeTab === 'overview'
      ? overviewFaqItems
      : activeTab === 'features'
        ? featuresFaqItems
        : contestsFaqItems;

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
            Comprehensive answers to frequently asked questions, contest information, and platform
            documentation.
          </p>
        </div>

        <div className='flex justify-center mb-8'>
          <div className='inline-flex rounded-md p-1 bg-zinc-900 border border-gray-700'>
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}>
              <BookOpen className='w-4 h-4 mr-2' />
              Overview
            </button>
            <button
              onClick={() => handleTabChange('features')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'features'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}>
              <Star className='w-4 h-4 mr-2' />
              Features
            </button>
            <button
              onClick={() => handleTabChange('contests')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'contests'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}>
              <Trophy className='w-4 h-4 mr-2' />
              Contests
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
