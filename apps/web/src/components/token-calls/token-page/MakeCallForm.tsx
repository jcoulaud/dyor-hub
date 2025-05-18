'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokenCalls, tokens } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { Comment, CreateTokenCallInput } from '@dyor-hub/types';
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  format,
  isFuture,
  isValid,
  isWithinInterval,
} from 'date-fns';
import { motion } from 'framer-motion';
import { BarChart, Calendar, LineChart, Loader2, Percent, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const TIMEFRAME_OPTIONS: Record<string, string> = {
  '15m': '15 Minutes',
  '30m': '30 Minutes',
  '1h': '1 Hour',
  '3h': '3 Hours',
  '6h': '6 Hours',
  '12h': '12 Hours',
  '1d': '1 Day',
  '3d': '3 Days',
  '1w': '1 Week',
  '2w': '2 Weeks',
  '1M': '1 Month',
  '3M': '3 Months',
  '6M': '6 Months',
  '1y': '1 Year',
};

// Define contest period constants (UTC)
const CONTEST_START_DATE_UTC = new Date(Date.UTC(2025, 4, 19, 0, 1, 0)); // May 19, 2025, 00:01 UTC
const CONTEST_END_DATE_UTC = new Date(Date.UTC(2025, 4, 25, 23, 59, 0)); // May 25, 2025, 23:59 UTC

const getDateFromTimeframe = (timeframe: string): Date => {
  const now = new Date();
  const value = parseInt(timeframe.slice(0, -1), 10);
  const unit = timeframe.slice(-1);

  if (isNaN(value)) return addMonths(now, 1);

  switch (unit) {
    case 'm':
      return addMinutes(now, value);
    case 'h':
      return addHours(now, value);
    case 'd':
      return addDays(now, value);
    case 'w':
      return addWeeks(now, value);
    case 'M':
      return addMonths(now, value);
    case 'y':
      return addYears(now, value);
    default:
      // Default to 1 month if unit is unrecognized
      return addMonths(now, 1);
  }
};

type PredictionType = 'price' | 'percent' | 'multiple';
type DateSelectionMethod = 'preset' | 'calendar';
type DisplayMode = 'price' | 'marketcap';

interface MakeCallFormProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  onCallCreated?: () => void;
  onClose?: () => void;
  currentMarketCap?: number;
  circulatingSupply?: string;
  onAddComment?: (comment: Comment) => void;
}

const formatMarketCapDisplay = (value: number): string => {
  if (!value || value === 0) return '0';
  if (value < 1) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

type ConfirmationDialogState = {
  isOpen: boolean;
  initialPrice: number;
  currentPrice: number;
  initialMarketCap: number | null;
  currentMarketCap: number | null;
  displayMode: DisplayMode;
  onConfirm: () => void;
};

export function MakeCallForm({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  onCallCreated,
  onClose,
  currentMarketCap,
  circulatingSupply,
  onAddComment,
}: MakeCallFormProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuthContext();
  const [predictionType, setPredictionType] = useState<PredictionType>('percent');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('marketcap');
  const [inputValue, setInputValue] = useState<string>('');
  const [timeframeDuration, setTimeframeDuration] = useState<string>('1M');
  const [dateSelectionMethod, setDateSelectionMethod] = useState<DateSelectionMethod>('preset');
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(getDateFromTimeframe('1M'));
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isContestEntry, setIsContestEntry] = useState(false);
  const isPriceInvalid = !currentTokenPrice || currentTokenPrice <= 0;
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    initialPrice: 0,
    currentPrice: 0,
    initialMarketCap: null,
    currentMarketCap: null,
    displayMode: 'marketcap',
    onConfirm: () => {},
  });

  const isContestPeriodActive = useMemo(() => {
    const now = new Date();
    // Convert current local time to UTC for comparison with UTC contest dates
    const nowUtc = new Date(now.valueOf() + now.getTimezoneOffset() * 60000);
    return isWithinInterval(nowUtc, { start: CONTEST_START_DATE_UTC, end: CONTEST_END_DATE_UTC });
  }, []);

  const initialReferencePrice = useMemo(() => currentTokenPrice, [currentTokenPrice]);

  const calculateMarketCap = useCallback(() => {
    if (currentMarketCap) {
      return currentMarketCap;
    }

    if (circulatingSupply && currentTokenPrice > 0) {
      try {
        const supply = parseFloat(circulatingSupply);
        if (isNaN(supply)) return 0;
        return currentTokenPrice * supply;
      } catch {
        return 0;
      }
    }

    return 0;
  }, [currentMarketCap, circulatingSupply, currentTokenPrice]);

  const tokenMarketCap = calculateMarketCap();

  // Initialize date input fields when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setDay(format(selectedDate, 'd'));
      setMonth(format(selectedDate, 'M'));
      setYear(format(selectedDate, 'yyyy'));
    }
  }, [selectedDate]);

  // Update selectedDate when manual inputs change
  useEffect(() => {
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum && monthNum && yearNum) {
      const newDate = new Date(yearNum, monthNum - 1, dayNum);
      if (isValid(newDate) && isFuture(newDate)) {
        setSelectedDate(newDate);
      }
    }
  }, [day, month, year]);

  // Update selected date when timeframeDuration changes in preset mode
  useEffect(() => {
    if (dateSelectionMethod === 'preset') {
      setSelectedDate(getDateFromTimeframe(timeframeDuration));
    }
  }, [timeframeDuration, dateSelectionMethod]);

  const handlePredictionTypeChange = (value: string) => {
    setPredictionType(value as PredictionType);
    setInputValue('');
    setFormError(null);
  };

  const getDefaultExplanation = useCallback(
    () => `I just made a prediction on $${tokenSymbol}. What do you think?`,
    [tokenSymbol],
  );

  const calculatedTargetPrice = useMemo(() => {
    const numericValue = parseFloat(inputValue);
    if (isNaN(numericValue) || numericValue <= 0 || initialReferencePrice <= 0) {
      return null;
    }

    try {
      switch (predictionType) {
        case 'price':
          return numericValue < initialReferencePrice ? null : numericValue;
        case 'percent':
          return initialReferencePrice * (1 + numericValue / 100);
        case 'multiple':
          return numericValue <= 1 ? null : initialReferencePrice * numericValue;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [predictionType, inputValue, initialReferencePrice]);

  // Calculate predicted market cap from target price
  const predictedMarketCap = useMemo(() => {
    if (!tokenMarketCap || tokenMarketCap <= 0) return null;

    // For direct market cap entry
    if (predictionType === 'price' && displayMode === 'marketcap') {
      const inputNum = parseFloat(inputValue);
      return !isNaN(inputNum) ? inputNum : null;
    }

    // For price/percent/multiple calculation
    if (!calculatedTargetPrice) return null;
    return (calculatedTargetPrice / initialReferencePrice) * tokenMarketCap;
  }, [
    calculatedTargetPrice,
    initialReferencePrice,
    currentTokenPrice,
    tokenMarketCap,
    predictionType,
    displayMode,
    inputValue,
  ]);

  // Determine if the form is valid for submission
  const isTargetMarketCapValid = useMemo(() => {
    if (displayMode !== 'marketcap' || !tokenMarketCap || tokenMarketCap <= 0) {
      return true; // Not in market cap mode or no market cap data
    }

    if (predictionType === 'price') {
      const inputNum = parseFloat(inputValue);
      return !isNaN(inputNum) && inputNum > tokenMarketCap;
    }

    return predictedMarketCap !== null && predictedMarketCap > tokenMarketCap;
  }, [displayMode, tokenMarketCap, predictionType, inputValue, predictedMarketCap]);

  // Check if target price exceeds the maximum allowed (x10000)
  const isTargetPriceValid = useMemo(() => {
    // If we're in market cap mode, perform validation based on market cap
    if (displayMode === 'marketcap') {
      if (predictionType === 'price') {
        // Direct market cap entry
        const inputNum = parseFloat(inputValue);
        if (isNaN(inputNum) || tokenMarketCap <= 0) return true;
        return inputNum <= tokenMarketCap * 10000;
      } else if (predictedMarketCap !== null && tokenMarketCap > 0) {
        // For percent/multiple prediction types using market cap display
        return predictedMarketCap <= tokenMarketCap * 10000;
      }
      return true;
    }

    // Default price-based validation
    if (!calculatedTargetPrice || initialReferencePrice <= 0) return true;
    return calculatedTargetPrice <= initialReferencePrice * 10000;
  }, [
    calculatedTargetPrice,
    initialReferencePrice,
    displayMode,
    predictionType,
    inputValue,
    predictedMarketCap,
    tokenMarketCap,
  ]);

  const proceedWithSubmission = useCallback(async () => {
    setIsLoading(true);
    setFormError(null);

    let targetPriceValue = 0;
    let finalCalculatedTargetPrice = null;
    const numericValue = parseFloat(inputValue);

    if (!isNaN(numericValue) && numericValue > 0 && initialReferencePrice > 0) {
      try {
        switch (predictionType) {
          case 'price':
            finalCalculatedTargetPrice = numericValue;
            break;
          case 'percent':
            finalCalculatedTargetPrice = initialReferencePrice * (1 + numericValue / 100);
            break;
          case 'multiple':
            finalCalculatedTargetPrice =
              numericValue <= 1 ? null : initialReferencePrice * numericValue;
            break;
        }
      } catch {
        finalCalculatedTargetPrice = null;
      }
    }

    if (finalCalculatedTargetPrice === null || finalCalculatedTargetPrice <= 0) {
      setFormError('Could not determine a valid target price for submission.');
      setIsLoading(false);
      return;
    }

    if (displayMode === 'marketcap' && predictionType === 'price') {
      const inputNum = parseFloat(inputValue);
      if (!isNaN(inputNum) && tokenMarketCap > 0 && initialReferencePrice > 0) {
        const rawValue = (inputNum / tokenMarketCap) * initialReferencePrice;
        if (!Number.isFinite(rawValue) || rawValue > 1e15) {
          setFormError('The market cap value is too large to convert to a valid token price.');
          setIsLoading(false);
          return;
        }
        targetPriceValue = parseFloat(rawValue.toFixed(8));
      }
    } else {
      targetPriceValue = finalCalculatedTargetPrice
        ? parseFloat(finalCalculatedTargetPrice.toFixed(8))
        : 0;
    }

    if (targetPriceValue <= 0) {
      setFormError('Calculated target price is invalid after rounding.');
      setIsLoading(false);
      return;
    }

    if (targetPriceValue <= initialReferencePrice) {
      setFormError('Target price must be higher than the initial reference price.');
      setIsLoading(false);
      return;
    }

    if (!isTargetPriceValid) {
      setFormError(
        displayMode === 'marketcap'
          ? 'Target market cap cannot exceed 10,000x the initial market cap.'
          : 'Target price cannot exceed 10,000x the initial reference price.',
      );
      setIsLoading(false);
      return;
    }

    if (!isTargetMarketCapValid) {
      setFormError('Target market cap must be higher than the initial market cap.');
      setIsLoading(false);
      return;
    }

    if (!Number.isFinite(targetPriceValue) || targetPriceValue > 1e15) {
      setFormError('Target price value is too large. Please enter a smaller target.');
      setIsLoading(false);
      return;
    }

    if (!selectedDate || !isFuture(selectedDate)) {
      setFormError('Please select a future date.');
      setIsLoading(false);
      return;
    }

    const payload: CreateTokenCallInput = {
      tokenMintAddress: tokenId,
      targetPrice: targetPriceValue,
      targetDate: selectedDate,
      explanation: explanation.trim() || getDefaultExplanation(),
      isContestEntry: isContestEntry && isContestPeriodActive,
    };

    try {
      const { comment } = await tokenCalls.create(payload);
      let toastMessage = '';

      const displayTarget =
        displayMode === 'marketcap' && predictionType === 'price'
          ? parseFloat(inputValue)
          : finalCalculatedTargetPrice && initialReferencePrice > 0
            ? predictionType === 'price'
              ? finalCalculatedTargetPrice
              : (finalCalculatedTargetPrice / initialReferencePrice) * tokenMarketCap // Percent/Multiple mode, calculate target market cap
            : 0;

      if (displayMode === 'marketcap') {
        toastMessage = `Your call for ${tokenSymbol} to reach a market cap of $${formatMarketCapDisplay(displayTarget)} by ${format(selectedDate, 'PPP')} has been recorded.`;
      } else {
        toastMessage = `Your call for ${tokenSymbol} to reach $${formatPrice(displayTarget)} by ${format(selectedDate, 'PPP')} has been recorded.`;
      }

      if (payload.isContestEntry) {
        toastMessage += ' Your contest entry has been submitted!';
      }

      toast({
        title: 'Prediction Submitted!',
        description: toastMessage,
      });

      setInputValue('');
      setPredictionType('percent');
      setTimeframeDuration('1M');
      setSelectedDate(getDateFromTimeframe('1M'));
      setDateSelectionMethod('preset');
      setDisplayMode('marketcap');
      setFormError(null);
      setExplanation('');
      setIsContestEntry(false);
      onCallCreated?.();
      onClose?.();

      if (onAddComment && comment) {
        onAddComment({ ...comment, replies: comment.replies ?? [] });
      }
    } catch (error) {
      let errorMsg = 'Failed to submit prediction. Please try again.';
      if (error instanceof ApiError && error.message) {
        errorMsg = error.message;
      }
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [
    tokenId,
    initialReferencePrice,
    inputValue,
    predictionType,
    displayMode,
    tokenMarketCap,
    timeframeDuration,
    selectedDate,
    dateSelectionMethod,
    tokenSymbol,
    isTargetMarketCapValid,
    isTargetPriceValid,
    isAuthenticated,
    onCallCreated,
    onClose,
    toast,
    explanation,
    onAddComment,
    getDefaultExplanation,
    isContestEntry,
    isContestPeriodActive,
  ]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!isAuthenticated) {
        setFormError('You must be logged in to make a prediction.');
        return;
      }

      // --- Initial Validations ---
      let validationTargetPrice: number | null = null;
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue) && numericValue > 0 && initialReferencePrice > 0) {
        try {
          switch (predictionType) {
            case 'price':
              validationTargetPrice = numericValue;
              break;
            case 'percent':
              validationTargetPrice = initialReferencePrice * (1 + numericValue / 100);
              break;
            case 'multiple':
              validationTargetPrice =
                numericValue <= 1 ? null : initialReferencePrice * numericValue;
              break;
          }
        } catch {
          /* ignore calculation error for validation */
        }
      }

      if (validationTargetPrice === null || validationTargetPrice <= 0) {
        setFormError('Please enter a valid positive target.');
        return;
      }

      if (validationTargetPrice <= initialReferencePrice) {
        setFormError('Target price must be higher than the initial reference price.');
        return;
      }

      if (!isTargetMarketCapValid) {
        setFormError('Target market cap must be higher than the initial market cap.');
        return;
      }

      if (!isTargetPriceValid) {
        setFormError(
          displayMode === 'marketcap'
            ? 'Target market cap cannot exceed 10,000x the initial market cap.'
            : 'Target price cannot exceed 10,000x the initial reference price.',
        );
        return;
      }

      if (!selectedDate || !isFuture(selectedDate)) {
        setFormError('Please select a future date.');
        return;
      }

      setIsCheckingPrice(true);

      try {
        const priceData = await tokens.getCurrentTokenPrice(tokenId);
        const currentPrice = priceData.price;

        if (currentPrice === null || typeof currentPrice !== 'number') {
          setFormError('Could not verify the current price. Please try again.');
          setIsCheckingPrice(false);
          return;
        }

        // Calculate current Market Cap based on fetched price
        let currentMarketCap: number | null = null;

        if (circulatingSupply && typeof currentPrice === 'number' && currentPrice > 0) {
          try {
            const supply = parseFloat(circulatingSupply);

            if (!isNaN(supply) && supply > 0) {
              currentMarketCap = currentPrice * supply;
            } else {
              currentMarketCap = 0;
            }
          } catch {
            currentMarketCap = 0;
          }
        } else {
          currentMarketCap = 0;
        }

        const priceDifferencePercent =
          Math.abs((currentPrice - initialReferencePrice) / initialReferencePrice) * 100;

        const PRICE_CHANGE_THRESHOLD = 1;

        if (priceDifferencePercent > PRICE_CHANGE_THRESHOLD) {
          setConfirmationDialog({
            isOpen: true,
            initialPrice: initialReferencePrice,
            currentPrice: currentPrice,
            initialMarketCap: tokenMarketCap,
            currentMarketCap: currentMarketCap,
            displayMode: displayMode,
            onConfirm: () => {
              setConfirmationDialog({ ...confirmationDialog, isOpen: false });
              proceedWithSubmission();
            },
          });
          setIsCheckingPrice(false);
        } else {
          await proceedWithSubmission();

          setIsCheckingPrice(false);
        }
      } catch (error) {
        setFormError(
          error instanceof ApiError
            ? error.message
            : 'An unexpected error occurred during price check.',
        );
        setIsCheckingPrice(false);
      }
    },
    [
      isAuthenticated,
      predictionType,
      inputValue,
      initialReferencePrice,
      timeframeDuration,
      tokenId,
      selectedDate,
      proceedWithSubmission,
      isTargetMarketCapValid,
      isTargetPriceValid,
      displayMode,
      confirmationDialog,
    ],
  );

  const getIconForPredictionType = (type: PredictionType) => {
    switch (type) {
      case 'percent':
        return <Percent className='h-4 w-4' />;
      case 'multiple':
        return <TrendingUp className='h-4 w-4' />;
      case 'price':
        return <LineChart className='h-4 w-4' />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-5 py-2'>
      {isPriceInvalid && (
        <div className='rounded-lg bg-red-900/20 border border-red-900 p-3 shadow-sm'>
          <p className='text-sm font-medium text-red-400 flex items-center'>
            <span className='mr-2'>⚠️</span>
            Current token price data is unavailable. Predictions cannot be made.
          </p>
        </div>
      )}

      {/* Display Mode Toggle */}
      {!isPriceInvalid && (
        <div className='flex justify-center w-full'>
          <Tabs
            value={displayMode}
            onValueChange={(value) => {
              setDisplayMode(value as DisplayMode);
              setInputValue('');
              setFormError(null);
            }}
            className='h-8 w-full'>
            <TabsList className='h-7 p-0.5 bg-zinc-900 border border-zinc-800 w-full'>
              <TabsTrigger
                value='marketcap'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white w-1/2'
                disabled={isLoading || isCheckingPrice}>
                <span className='text-xs flex items-center justify-center gap-1'>
                  <BarChart className='h-3 w-3' /> Market Cap
                </span>
              </TabsTrigger>
              <TabsTrigger
                value='price'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white w-1/2'
                disabled={isLoading || isCheckingPrice}>
                <span className='text-xs flex items-center justify-center gap-1'>
                  <LineChart className='h-3 w-3' /> Price
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Price Display Row */}
      {!isPriceInvalid && (
        <div className='grid grid-cols-2 gap-3'>
          {/* Current Price/Market Cap */}
          <div className='bg-zinc-900/80 p-3 rounded-lg border border-zinc-800'>
            <div className='text-xs text-zinc-400'>
              Current {displayMode === 'price' ? 'Price' : 'Market Cap'}
            </div>
            <div className='text-lg font-semibold text-white'>
              $
              {displayMode === 'price'
                ? formatPrice(currentTokenPrice)
                : formatMarketCapDisplay(tokenMarketCap)}
            </div>
          </div>

          {/* Calculated Target Display */}
          {calculatedTargetPrice !== null ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-zinc-900/80 p-3 rounded-lg border border-zinc-800'>
              <div className='text-xs text-zinc-400'>
                Predicted {displayMode === 'price' ? 'Target' : 'Market Cap'}
              </div>
              <div
                className={`text-lg font-semibold ${isTargetPriceValid ? 'text-green-400' : 'text-red-400'}`}>
                $
                {displayMode === 'price'
                  ? formatPrice(calculatedTargetPrice)
                  : tokenMarketCap > 0
                    ? formatMarketCapDisplay(
                        predictionType === 'price' && displayMode === 'marketcap'
                          ? parseFloat(inputValue)
                          : (calculatedTargetPrice / initialReferencePrice) * tokenMarketCap,
                      )
                    : formatMarketCapDisplay(calculatedTargetPrice)}
              </div>
            </motion.div>
          ) : (
            <div className='bg-zinc-900/80 p-3 rounded-lg border border-zinc-800'>
              <div className='text-xs text-zinc-400'>
                Predicted {displayMode === 'price' ? 'Target' : 'Market Cap'}
              </div>
              <div className='text-lg font-semibold text-zinc-600'>--</div>
            </div>
          )}
        </div>
      )}

      {/* Show warning if target exceeds 10000x */}
      {calculatedTargetPrice !== null && !isTargetPriceValid && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-lg bg-red-900/20 border border-red-900 p-3 shadow-sm'>
          <p className='text-sm font-medium text-red-400 flex items-center'>
            <span className='mr-2'>⚠️</span>
            {displayMode === 'marketcap'
              ? 'Target market cap cannot exceed 10,000x the current market cap.'
              : 'Target price cannot exceed 10,000x the current price.'}
          </p>
        </motion.div>
      )}

      {/* Prediction Type Cards */}
      <div className='space-y-2'>
        <Label className='text-sm font-medium text-zinc-300'>I want to predict...</Label>
        <div className='grid grid-cols-3 gap-2'>
          {[
            { value: 'percent', label: 'Percentage' },
            { value: 'multiple', label: 'Multiple' },
            { value: 'price', label: displayMode === 'price' ? 'Target Price' : 'Target MCap' },
          ].map((option) => (
            <div
              key={option.value}
              onClick={() =>
                !isLoading &&
                !isCheckingPrice &&
                !isPriceInvalid &&
                handlePredictionTypeChange(option.value)
              }
              className={cn(
                'relative cursor-pointer rounded-lg overflow-hidden border p-2 transition-all',
                predictionType === option.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                (isLoading || isCheckingPrice || isPriceInvalid) && 'opacity-50 cursor-not-allowed',
              )}>
              <div className='flex items-center justify-center mb-1'>
                {getIconForPredictionType(option.value as PredictionType)}
              </div>
              <div className='text-center'>
                <div className='text-xs font-medium'>{option.label}</div>
              </div>
              {predictionType === option.value && (
                <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500' />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Value */}
      <div className='space-y-2'>
        <Label
          htmlFor='predictionValue'
          className='text-sm font-medium text-zinc-300 flex items-center'>
          {getIconForPredictionType(predictionType)}
          <span className='ml-2'>
            {predictionType === 'price'
              ? `Target ${displayMode === 'price' ? 'Price' : 'Market Cap'} ($)`
              : predictionType === 'percent'
                ? 'Percentage Gain (%)'
                : 'Multiple (x)'}
          </span>
        </Label>
        <Input
          id='predictionValue'
          type='number'
          placeholder={
            predictionType === 'price'
              ? displayMode === 'price'
                ? 'e.g., 1.50'
                : 'e.g., 1500000'
              : predictionType === 'percent'
                ? 'e.g., 50'
                : 'e.g., 2'
          }
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setFormError(null);
          }}
          min={
            predictionType === 'multiple'
              ? '1.00001' // Ensures > 1
              : predictionType === 'price'
                ? (initialReferencePrice * 1.000001).toFixed(8) // Min slightly above current
                : '0'
          }
          step='any'
          required
          disabled={isLoading || isCheckingPrice || isPriceInvalid}
          className='bg-zinc-900 border-zinc-800 focus:border-blue-500'
        />
      </div>

      {/* Timeframe Selection */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium text-zinc-300'>Target Date</Label>
          <Tabs
            value={dateSelectionMethod}
            onValueChange={(value) => setDateSelectionMethod(value as DateSelectionMethod)}
            className='h-8'>
            <TabsList className='h-7 p-0.5 bg-zinc-900 border border-zinc-800'>
              <TabsTrigger
                value='preset'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white'
                disabled={isLoading || isCheckingPrice || isPriceInvalid}>
                <span className='text-xs'>Preset</span>
              </TabsTrigger>
              <TabsTrigger
                value='calendar'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white'
                disabled={isLoading || isCheckingPrice || isPriceInvalid}>
                <span className='text-xs'>Custom</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {dateSelectionMethod === 'preset' && (
          <Select
            value={timeframeDuration}
            onValueChange={setTimeframeDuration}
            disabled={isLoading || isCheckingPrice || isPriceInvalid}>
            <SelectTrigger className='bg-zinc-900 border-zinc-800 h-9'>
              <SelectValue placeholder='Select timeframe' />
            </SelectTrigger>
            <SelectContent className='bg-zinc-900 border-zinc-800'>
              {Object.entries(TIMEFRAME_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {dateSelectionMethod === 'calendar' && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div className='flex-1 relative'>
                <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500'>
                  M
                </span>
                <Input
                  id='month'
                  type='number'
                  min='1'
                  max='12'
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className='h-9 bg-zinc-800 border-zinc-700 text-center pl-7'
                  placeholder='MM'
                  aria-label='Month'
                  disabled={isLoading || isCheckingPrice || isPriceInvalid}
                />
              </div>
              <span className='text-zinc-500 text-sm'>/</span>
              <div className='flex-1 relative'>
                <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500'>
                  D
                </span>
                <Input
                  id='day'
                  type='number'
                  min='1'
                  max='31'
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className='h-9 bg-zinc-800 border-zinc-700 text-center pl-7'
                  placeholder='DD'
                  aria-label='Day'
                  disabled={isLoading || isCheckingPrice || isPriceInvalid}
                />
              </div>
              <span className='text-zinc-500 text-sm'>/</span>
              <div className='flex-1 relative'>
                <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500'>
                  Y
                </span>
                <Input
                  id='year'
                  type='number'
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 10}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className='h-9 bg-zinc-800 border-zinc-700 text-center pl-7'
                  placeholder='YYYY'
                  aria-label='Year'
                  disabled={isLoading || isCheckingPrice || isPriceInvalid}
                />
              </div>
            </div>

            {selectedDate && (
              <div className='flex items-center text-xs text-blue-300'>
                <Calendar className='h-3 w-3 mr-1' />
                <span>{format(selectedDate, 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>
        )}

        {/* Display estimated target date only for preset mode */}
        {selectedDate && dateSelectionMethod === 'preset' && (
          <div className='flex items-center text-xs text-blue-300'>
            <Calendar className='h-3 w-3 mr-1' />
            <span>{format(selectedDate, 'MMMM d, yyyy')}</span>
          </div>
        )}
      </div>

      {/* Explanation Textarea */}
      <div className='space-y-2'>
        <Label htmlFor='explanation' className='text-sm font-medium text-zinc-300'>
          Explanation <span className='text-zinc-400'>(Optional)</span>
        </Label>
        <Textarea
          id='explanation'
          value={explanation}
          onChange={(e) => {
            setExplanation(e.target.value);
          }}
          placeholder={'Why do you think the price will reach this target?'}
          className={cn(
            'bg-zinc-900 border-zinc-800 focus:border-blue-500 min-h-[80px] placeholder:text-zinc-500',
          )}
          disabled={isLoading || isCheckingPrice || isPriceInvalid}
        />
      </div>

      {/* Error Display */}
      {formError && (
        <div className='bg-red-900/20 p-2 rounded-md border border-red-800/50 text-sm text-red-400'>
          {formError}
        </div>
      )}

      {!isAuthenticated && (
        <div className='bg-amber-900/20 p-2 rounded-md border border-amber-800/50 text-xs text-amber-400 text-center'>
          Please log in to make a prediction
        </div>
      )}

      {/* Contest Entry Checkbox - Moved and Styled */}
      {isContestPeriodActive && (
        <div className='p-3 my-4 rounded-md bg-zinc-800 border border-zinc-700'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='contest-entry-checkbox'
              checked={isContestEntry}
              onCheckedChange={(checked) => setIsContestEntry(Boolean(checked))}
              className='border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white h-5 w-5'
            />
            <Label
              htmlFor='contest-entry-checkbox'
              className='text-sm font-medium text-gray-200 cursor-pointer'>
              Enter this call into the current Trading Contest!
            </Label>
          </div>
          <p className='text-xs text-zinc-400 mt-1.5 ml-7'>
            Ensure your prediction meets all contest criteria (token age, MC, liquidity, target date
            within contest).
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type='submit'
        className='w-full rounded-md h-10 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2'
        disabled={
          isLoading || isCheckingPrice || !isAuthenticated || isPriceInvalid || !inputValue.trim()
        }>
        {(isLoading || isCheckingPrice) && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
        {isCheckingPrice ? 'Checking Price...' : isLoading ? 'Submitting...' : 'Submit Prediction'}
      </Button>

      {/* Disclaimer Text */}
      <p className='text-xs text-zinc-500 text-center px-2'>
        Note: The prediction is recorded using the token price at the exact moment of submission.
      </p>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmationDialog.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmationDialog({ ...confirmationDialog, isOpen: false })
        }>
        <AlertDialogContent className='bg-zinc-900 border-zinc-800 text-zinc-100'>
          <AlertDialogHeader>
            <AlertDialogTitle>Price Change Confirmation</AlertDialogTitle>
            <AlertDialogDescription className='text-zinc-400'>
              The market conditions for ${tokenSymbol} changed while you were setting up your
              prediction.
              <br />
              <br />
              {confirmationDialog.displayMode === 'price' ? (
                <>
                  Initial Price: <strong>${formatPrice(confirmationDialog.initialPrice)}</strong>
                  <br />
                  Current Price: <strong>${formatPrice(confirmationDialog.currentPrice)}</strong>
                </>
              ) : (
                <>
                  Initial Market Cap:{' '}
                  <strong>
                    ${formatMarketCapDisplay(confirmationDialog.initialMarketCap ?? 0)}
                  </strong>
                  <br />
                  Current Market Cap:{' '}
                  <strong>
                    ${formatMarketCapDisplay(confirmationDialog.currentMarketCap ?? 0)}
                  </strong>
                </>
              )}
              <br />
              <br />
              <span>
                Do you still want to submit your prediction with this new{' '}
                {confirmationDialog.displayMode === 'price' ? 'price' : 'market cap'} of{' '}
                <strong>
                  {confirmationDialog.displayMode === 'price'
                    ? `$${formatPrice(confirmationDialog.currentPrice)}`
                    : `$${formatMarketCapDisplay(confirmationDialog.currentMarketCap ?? 0)}`}
                </strong>
                ?
              </span>
              <br />
              <br />
              <span className='text-xs italic'>
                P.S. The final price will be calculated at the exact moment of submission.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-zinc-100'
              onClick={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-blue-600 hover:bg-blue-700 text-white'
              onClick={confirmationDialog.onConfirm}>
              Yes, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
