import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ChartAnalysisDto } from './dto/chart-analysis.dto';

const DecodedStorySchema = z.object({
  priceJourney: z
    .string()
    .describe(
      'Brief description of the main path the price has taken recently.',
    ),
  momentumMeter: z
    .string()
    .describe("Current 'energy' or force behind the price."),
  battleZones: z
    .string()
    .describe('Key price levels (support/resistance) explained simply.'),
  volumeSignals: z
    .string()
    .describe(
      'What trading volume is revealing about trader interest and conviction.',
    ),
});

const ChartWhispererSchema = z
  .object({
    unfilteredTruth: z
      .string()
      .describe(
        'A single, direct sentence summarizing the most dominant current price action.',
      ),
    decodedStory: DecodedStorySchema.describe(
      'Key observations explained simply.',
    ),
    inferredSentiment: z
      .string()
      .describe(
        'Inferred crowd sentiment based strictly on price/volume, using cautious language.',
      ),
    bottomLine: z
      .string()
      .describe(
        "A single, concise takeaway about the chart's current picture.",
      ),
  })
  .describe('The structured analysis from the Chart Whisperer AI.');

export type ChartWhispererOutput = z.infer<typeof ChartWhispererSchema>;

@Injectable()
export class AiAnalysisService {
  private llm: ChatOpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }

    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0.7,
    });
  }

  private buildPrompt(input: ChartAnalysisDto): string {
    const {
      tokenName,
      tokenAddress,
      tokenAge,
      numberOfCandles,
      candleType,
      ohlcvDataJson,
    } = input;

    const promptParts = [
      'Act as my expert crypto chart analyst, "The Chart Whisperer." You have the following characteristics:',
      '- You possess an uncanny ability to read market psychology and momentum directly from price and volume patterns.',
      "- You're brutally honest and direct – you tell me what the chart *says*, not what social media is hyping or what I might wish to hear.",
      "- You've spent years observing how herd mentality and speculative waves play out in volatile markets, especially for assets like memecoins.",
      '- You specialize in translating complex chart data into simple, easily understandable insights for traders who are not technical analysis experts.',
      '- You focus on identifying true momentum, key price zones where battles are won or lost, and what trading volume is revealing about trader conviction.',
      '- You understand that memecoin traders need clear, straightforward takeaways without confusing jargon.',
      '\nYour Mission for this Token (' +
        tokenName +
        ' - address: ' +
        tokenAddress +
        '), which has been trading for approximately ' +
        tokenAge +
        ':',
      '1. Analyze the provided OHLCV (Open, High, Low, Close, Volume) data (JSON format below).',
      '2. Demystify its recent price action and current momentum in the simplest terms possible.',
      '3. Explain what the chart patterns are indicating about potential shifts in crowd behavior or sentiment, based *strictly* on the price and volume data presented.',
      '4. Deliver your analysis in a structured way that is easy for a non-expert memecoin trader to grasp and find insightful.',
      '\nProvided OHLCV Data:',
      'The data consists of ' +
        numberOfCandles +
        ' candlesticks, each representing a ' +
        candleType +
        ' interval.',
      ohlcvDataJson,
      '\nAnalysis Output Structure:',
      'You MUST follow the schema provided to structure your output.',
      '\nImportant Constraints - YOU MUST ADHERE TO THESE AT ALL TIMES:',
      '* ABSOLUTELY NO financial advice.',
      '* DO NOT make any price predictions, forecasts, or speculate on future price movements beyond describing current, visible momentum.',
      '* DO NOT tell anyone to buy, sell, or hold.',
      "* Your analysis must be STRICTLY limited to the provided OHLCV data and the token's age context. DO NOT use any external information, news, social media sentiment, or your prior knowledge about this specific token or the broader crypto market.",
      '* Use extremely simple, everyday language. Avoid all technical jargon.',
      '* Maintain the "Chart Whisperer" persona throughout: direct, insightful, experienced, and focused on making charts understandable for the average memecoin trader.',
    ];
    return promptParts.join('\n');
  }

  async getChartAnalysis(
    input: ChartAnalysisDto,
  ): Promise<ChartWhispererOutput> {
    const prompt = this.buildPrompt(input);

    console.log('Sending prompt to LLM:', prompt);

    try {
      const llmWithSchema = this.llm.withStructuredOutput(ChartWhispererSchema);
      const analysis = await llmWithSchema.invoke(prompt);
      return analysis;
    } catch (error) {
      console.error('Error getting structured analysis from LLM:', error);
      throw new Error('Failed to get AI chart analysis.');
    }
  }
}
