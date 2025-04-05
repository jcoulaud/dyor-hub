'use client';

import { BadgesList } from '@/components/admin/badges/BadgesList';
import { CreateBadgeDialog } from '@/components/admin/badges/CreateBadgeDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function AdminBadgesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleTabChange = (value: string) => {
    setSelectedCategory(value);
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Badges</h1>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className='bg-blue-600 hover:bg-blue-700 text-white'>
          <Plus className='mr-2 h-4 w-4' />
          New Badge
        </Button>
      </div>

      <Tabs defaultValue='all' onValueChange={handleTabChange}>
        <TabsList className='bg-zinc-900/50 text-zinc-400'>
          <TabsTrigger
            value='all'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            All Badges
          </TabsTrigger>
          <TabsTrigger
            value='streak'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Streak
          </TabsTrigger>
          <TabsTrigger
            value='content'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Content
          </TabsTrigger>
          <TabsTrigger
            value='engagement'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Engagement
          </TabsTrigger>
          <TabsTrigger
            value='voting'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Voting
          </TabsTrigger>
          <TabsTrigger
            value='reception'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Reception
          </TabsTrigger>
          <TabsTrigger
            value='quality'
            className='data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100'>
            Quality
          </TabsTrigger>
        </TabsList>

        <TabsContent value='all'>
          <BadgesList category={selectedCategory === 'all' ? undefined : selectedCategory} />
        </TabsContent>

        <TabsContent value='streak'>
          <BadgesList category='streak' />
        </TabsContent>

        <TabsContent value='content'>
          <BadgesList category='content' />
        </TabsContent>

        <TabsContent value='engagement'>
          <BadgesList category='engagement' />
        </TabsContent>

        <TabsContent value='voting'>
          <BadgesList category='voting' />
        </TabsContent>

        <TabsContent value='reception'>
          <BadgesList category='reception' />
        </TabsContent>

        <TabsContent value='quality'>
          <BadgesList category='quality' />
        </TabsContent>
      </Tabs>

      <CreateBadgeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
