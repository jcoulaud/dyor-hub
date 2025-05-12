'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { credits as apiCredits } from '@/lib/api';
import type {
  CreateCreditPackageDto,
  CreditPackage,
  UpdateCreditPackageDto,
} from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Coins, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  credits: z.coerce.number().int().positive('Credits must be a positive number'),
  solPrice: z.coerce.number().nonnegative('SOL Price cannot be negative'),
  isActive: z.boolean(),
});

type PackageFormData = z.infer<typeof packageSchema>;

export default function AdminCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const { toast } = useToast();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      credits: 10,
      solPrice: 0.1,
      isActive: true,
    },
  });

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiCredits.admin.findAllPackages(true);
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast({
        title: 'Error Loading Packages',
        description: 'Could not retrieve credit packages.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const openEditDialog = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    reset({
      name: pkg.name,
      credits: pkg.credits,
      solPrice: pkg.solPrice,
      isActive: pkg.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPackage(null);
    reset({
      name: '',
      credits: 10,
      solPrice: 0.1,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingPackage(null);
      reset();
    }
  };

  const onSubmit = async (data: PackageFormData) => {
    setIsSubmitting(true);
    const apiData = { ...data };

    try {
      let result: CreditPackage;
      if (editingPackage) {
        result = await apiCredits.admin.updatePackage(
          editingPackage.id,
          apiData as UpdateCreditPackageDto,
        );
        toast({ title: 'Package Updated', description: `Package "${result.name}" saved.` });
      } else {
        result = await apiCredits.admin.createPackage(apiData as CreateCreditPackageDto);
        toast({ title: 'Package Created', description: `Package "${result.name}" added.` });
      }
      handleOpenChange(false);
      await loadPackages();
    } catch (error: unknown) {
      console.error('Failed to save package:', error);
      let message = 'Could not save the credit package.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: editingPackage ? 'Update Failed' : 'Creation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pkg: CreditPackage) => {
    if (!confirm(`Are you sure you want to delete the package "${pkg.name}"?`)) {
      return;
    }
    try {
      await apiCredits.admin.deletePackage(pkg.id);
      toast({ title: 'Package Deleted', description: `Package "${pkg.name}" removed.` });
      await loadPackages();
    } catch (error: unknown) {
      console.error('Failed to delete package:', error);
      let message = 'Could not delete the credit package.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: 'Deletion Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className='container mx-auto p-4 md:p-8 space-y-8'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-black flex items-center justify-center border border-amber-500/50'>
            <Coins className='h-5 w-5 text-amber-500' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-zinc-100'>Credit Packages</h1>
            <p className='text-zinc-400'>Manage available credit packages</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreateDialog}
              className='bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700'>
              <PlusCircle className='mr-2 h-4 w-4' /> Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100'>
            <DialogHeader>
              <DialogTitle>{editingPackage ? 'Edit Package' : 'New Package'}</DialogTitle>
              <DialogDescription className='text-zinc-400'>
                {editingPackage
                  ? 'Update the details for this credit package.'
                  : 'Create a new credit package for users to purchase.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name' className='text-zinc-300'>
                  Package Name
                </Label>
                <Input
                  id='name'
                  {...register('name')}
                  className='bg-black border-zinc-800 text-zinc-100'
                  placeholder='e.g. Basic Package'
                />
                {errors.name && <p className='text-red-400 text-sm'>{errors.name.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='credits' className='text-zinc-300'>
                  Credits Amount
                </Label>
                <Input
                  id='credits'
                  type='number'
                  {...register('credits')}
                  className='bg-black border-zinc-800 text-zinc-100'
                  placeholder='10000'
                />
                {errors.credits && <p className='text-red-400 text-sm'>{errors.credits.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='solPrice' className='text-zinc-300'>
                  SOL Price
                </Label>
                <Input
                  id='solPrice'
                  type='number'
                  step='any'
                  {...register('solPrice')}
                  className='bg-black border-zinc-800 text-zinc-100'
                  placeholder='0.1'
                />
                {errors.solPrice && (
                  <p className='text-red-400 text-sm'>{errors.solPrice.message}</p>
                )}
              </div>

              <div className='flex items-center justify-between'>
                <Label htmlFor='isActive' className='text-zinc-300'>
                  Active Package
                </Label>
                <Controller
                  name='isActive'
                  control={control}
                  render={({ field }) => (
                    <Switch id='isActive' checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <DialogFooter className='gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => handleOpenChange(false)}
                  className='flex-1 bg-black border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                  className='flex-1 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700'>
                  {isSubmitting
                    ? 'Saving...'
                    : editingPackage
                      ? 'Update Package'
                      : 'Create Package'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className='space-y-4'>
          <Skeleton className='h-12 w-full bg-zinc-900' />
          <Skeleton className='h-12 w-full bg-zinc-900' />
          <Skeleton className='h-12 w-full bg-zinc-900' />
        </div>
      ) : packages.length > 0 ? (
        <div className='bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='border-zinc-800 hover:bg-zinc-900'>
                <TableHead className='text-zinc-400'>Name</TableHead>
                <TableHead className='text-right text-zinc-400'>Credits</TableHead>
                <TableHead className='text-right text-zinc-400'>SOL Price</TableHead>
                <TableHead className='text-center text-zinc-400'>Status</TableHead>
                <TableHead className='text-right text-zinc-400'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className='border-zinc-800 hover:bg-zinc-900'>
                  <TableCell className='font-medium text-zinc-100'>{pkg.name}</TableCell>
                  <TableCell className='text-right text-zinc-100'>
                    {pkg.credits.toLocaleString()}
                  </TableCell>
                  <TableCell className='text-right text-zinc-100'>{pkg.solPrice}</TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={pkg.isActive ? 'default' : 'secondary'}
                      className={
                        pkg.isActive
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
                      }>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right space-x-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => openEditDialog(pkg)}
                      className='hover:bg-zinc-800 text-zinc-400 hover:text-amber-500'>
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleDelete(pkg)}
                      className='hover:bg-zinc-800 text-zinc-400 hover:text-red-500'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center py-12 text-center bg-zinc-950 border border-zinc-800 rounded-lg'>
          <div className='relative w-16 h-16 mb-4'>
            <div className='absolute inset-0 bg-amber-500/20 rounded-full'></div>
            <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
              <AlertCircle className='h-8 w-8 text-amber-500' />
            </div>
          </div>
          <h3 className='text-lg font-medium text-zinc-100'>No Packages Found</h3>
          <p className='text-zinc-400 mt-2'>Create your first credit package to get started.</p>
          <Button
            onClick={openCreateDialog}
            className='mt-6 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700'>
            <PlusCircle className='mr-2 h-4 w-4' /> Add First Package
          </Button>
        </div>
      )}
    </div>
  );
}
