'use client';

import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokenCalls } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { CreateTokenCallInput } from '@dyor-hub/types';
import { addDays, addMonths, addWeeks, addYears, format, isFuture, isValid } from 'date-fns';
import { motion } from 'framer-motion';
import { BarChart, Calendar, LineChart, Loader2, Percent, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const TIMEFRAME_OPTIONS = {
  '1d': '1 Day',
  '3d': '3 Days',
  '1w': '1 Week',
  '2w': '2 Weeks',
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
  '3y': '3 Years',
  '10y': '10 Years',
};

const getDateFromTimeframe = (timeframe: string): Date => {
  const now = new Date();
  switch (timeframe) {
    case '1d':
      return addDays(now, 1);
    case '3d':
      return addDays(now, 3);
    case '1w':
      return addWeeks(now, 1);
    case '2w':
      return addWeeks(now, 2);
    case '1m':
      return addMonths(now, 1);
    case '3m':
      return addMonths(now, 3);
    case '6m':
      return addMonths(now, 6);
    case '1y':
      return addYears(now, 1);
    case '3y':
      return addYears(now, 3);
    case '10y':
      return addYears(now, 10);
    default:
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
}

const formatMarketCapDisplay = (value: number): string => {
  if (!value) return '0';
  return Math.floor(value).toLocaleString('en-US');
};

export function MakeCallForm({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  onCallCreated,
  onClose,
  currentMarketCap,
  circulatingSupply,
}: MakeCallFormProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuthContext();
  const [predictionType, setPredictionType] = useState<PredictionType>('percent');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('price');
  const [inputValue, setInputValue] = useState<string>('');
  const [timeframeDuration, setTimeframeDuration] = useState<string>('1m');
  const [dateSelectionMethod, setDateSelectionMethod] = useState<DateSelectionMethod>('preset');
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isPriceInvalid = !currentTokenPrice || currentTokenPrice <= 0;

  const calculateMarketCap = useCallback(() => {
    if (currentMarketCap) {
      return currentMarketCap;
    }

    if (circulatingSupply && currentTokenPrice) {
      try {
        const supply = parseFloat(circulatingSupply);
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

  const calculatedTargetPrice = useMemo(() => {
    const numericValue = parseFloat(inputValue);
    if (isNaN(numericValue) || numericValue <= 0 || currentTokenPrice <= 0) {
      return null;
    }

    try {
      switch (predictionType) {
        case 'price':
          return numericValue < currentTokenPrice ? null : numericValue;
        case 'percent':
          return currentTokenPrice * (1 + numericValue / 100);
        case 'multiple':
          return numericValue <= 1 ? null : currentTokenPrice * numericValue;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [predictionType, inputValue, currentTokenPrice]);

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
    return (calculatedTargetPrice / currentTokenPrice) * tokenMarketCap;
  }, [
    calculatedTargetPrice,
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

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!isAuthenticated) {
        setFormError('You must be logged in to make a prediction.');
        return;
      }

      if (!calculatedTargetPrice || calculatedTargetPrice <= 0) {
        setFormError('Please enter a valid positive target.');
        return;
      }

      if (calculatedTargetPrice <= currentTokenPrice) {
        setFormError('Target price must be higher than the current price.');
        return;
      }

      // Validate market cap if in market cap mode
      if (!isTargetMarketCapValid) {
        setFormError('Target market cap must be higher than the current market cap.');
        return;
      }

      if (!timeframeDuration) {
        setFormError('Please select a timeframe.');
        return;
      }

      if (!selectedDate || !isFuture(selectedDate)) {
        setFormError('Please select a future date.');
        return;
      }

      setIsLoading(true);

      const roundedTargetPrice = calculatedTargetPrice
        ? parseFloat(calculatedTargetPrice.toFixed(8))
        : 0;

      if (roundedTargetPrice <= 0) {
        setFormError('Calculated target price is invalid after rounding.');
        setIsLoading(false);
        return;
      }

      const payload: CreateTokenCallInput = {
        tokenId,
        targetPrice: roundedTargetPrice,
        timeframeDuration,
      };

      try {
        await tokenCalls.create(payload);
        toast({
          title: 'Prediction Submitted!',
          description: `Your call for ${tokenSymbol} to reach $${formatPrice(roundedTargetPrice)} by ${format(selectedDate, 'PPP')} has been recorded.`,
        });

        setInputValue('');
        setPredictionType('price');
        setTimeframeDuration('1m');
        setSelectedDate(addMonths(new Date(), 1));
        setDateSelectionMethod('preset');
        setDisplayMode('price');
        setFormError(null);
        onCallCreated?.();
        onClose?.();
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
    },
    [
      isAuthenticated,
      predictionType,
      inputValue,
      calculatedTargetPrice,
      currentTokenPrice,
      timeframeDuration,
      tokenId,
      tokenSymbol,
      onCallCreated,
      onClose,
      toast,
      selectedDate,
      setDisplayMode,
      displayMode,
      tokenMarketCap,
      predictedMarketCap,
      isTargetMarketCapValid,
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
            onValueChange={(value) => setDisplayMode(value as DisplayMode)}
            className='h-8 w-full'>
            <TabsList className='h-7 p-0.5 bg-zinc-900 border border-zinc-800 w-full'>
              <TabsTrigger
                value='price'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white w-1/2'
                disabled={isLoading}>
                <span className='text-xs flex items-center justify-center gap-1'>
                  <LineChart className='h-3 w-3' /> Price
                </span>
              </TabsTrigger>
              <TabsTrigger
                value='marketcap'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white w-1/2'
                disabled={isLoading}>
                <span className='text-xs flex items-center justify-center gap-1'>
                  <BarChart className='h-3 w-3' /> Market Cap
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
              <div className='text-lg font-semibold text-green-400'>
                $
                {displayMode === 'price'
                  ? formatPrice(calculatedTargetPrice)
                  : tokenMarketCap > 0
                    ? formatMarketCapDisplay(
                        predictionType === 'price' && displayMode === 'marketcap'
                          ? parseFloat(inputValue)
                          : (calculatedTargetPrice / currentTokenPrice) * tokenMarketCap,
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
                !isLoading && !isPriceInvalid && handlePredictionTypeChange(option.value)
              }
              className={cn(
                'relative cursor-pointer rounded-lg overflow-hidden border p-2 transition-all',
                predictionType === option.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                (isLoading || isPriceInvalid) && 'opacity-50 cursor-not-allowed',
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
                ? currentTokenPrice.toString()
                : '0'
          }
          step='any'
          required
          disabled={isLoading || isPriceInvalid}
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
                disabled={isLoading || isPriceInvalid}>
                <span className='text-xs'>Preset</span>
              </TabsTrigger>
              <TabsTrigger
                value='calendar'
                className='h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white'
                disabled={isLoading || isPriceInvalid}>
                <span className='text-xs'>Custom</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {dateSelectionMethod === 'preset' && (
          <Select
            value={timeframeDuration}
            onValueChange={setTimeframeDuration}
            disabled={isLoading || isPriceInvalid}>
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
                  disabled={isLoading || isPriceInvalid}
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
                  disabled={isLoading || isPriceInvalid}
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
                  disabled={isLoading || isPriceInvalid}
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

      <Button
        type='submit'
        disabled={
          !isAuthenticated ||
          isLoading ||
          !calculatedTargetPrice ||
          isPriceInvalid ||
          !isTargetMarketCapValid
        }
        className='w-full rounded-md h-10 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2'>
        {isLoading ? (
          <>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Submitting...</span>
          </>
        ) : (
          <span>Submit Prediction</span>
        )}
      </Button>
    </form>
  );
}
