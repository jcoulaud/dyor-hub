'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { users as usersApi } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { User } from '@dyor-hub/types';
import { format } from 'date-fns';
import { Calendar, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';

const USERS_PER_PAGE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(
    async (page: number, search: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await usersApi.admin.getPaginatedUsers(page, USERS_PER_PAGE, search);
        setUsers(result.users || []);
        setTotalUsers(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users.');
        toast({
          title: 'Error',
          description: 'Could not fetch users. Please try again.',
          variant: 'destructive',
        });
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm, fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const pageTitle = useMemo(() => {
    if (debouncedSearchTerm) {
      return `Search Results for "${debouncedSearchTerm}" (${totalUsers})`;
    }
    return `User Management (${totalUsers})`;
  }, [debouncedSearchTerm, totalUsers]);

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold tracking-tight'>{pageTitle}</h1>

      <Card className='bg-black/80 border-zinc-800/80'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-zinc-200'>All Users</CardTitle>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500' />
              <Input
                type='text'
                placeholder='Search by username...'
                value={searchTerm}
                onChange={handleSearchChange}
                className='pl-10 w-64 bg-zinc-900 border-zinc-700 focus:border-blue-500 focus:ring-blue-500'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className='text-center py-10 text-red-500'>{error}</div>}
          {!error && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className='border-zinc-800'>
                    <TableHead className='w-[80px]'>Avatar</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Registered At</TableHead>
                    <TableHead className='text-right'>Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !users.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center py-10'>
                        <div className='flex justify-center items-center gap-2 text-zinc-400'>
                          <Loader2 className='h-5 w-5 animate-spin' />
                          <span>Loading users...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id} className='hover:bg-zinc-900/30 border-zinc-800/50'>
                        <TableCell>
                          <Link href={`/users/${user.username}`} className='block'>
                            <Avatar className='h-10 w-10 border border-zinc-700'>
                              <AvatarImage
                                src={getHighResAvatar(user.avatarUrl)}
                                alt={user.displayName}
                              />
                              <AvatarFallback className='bg-zinc-700 text-zinc-400'>
                                {user.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/users/${user.username}`}
                            className='hover:underline text-blue-400 font-medium'>
                            @{user.username}
                          </Link>
                        </TableCell>
                        <TableCell className='text-zinc-300'>{user.displayName}</TableCell>
                        <TableCell className='text-zinc-400 text-xs'>
                          <div className='flex items-center gap-1.5'>
                            <Calendar className='h-3.5 w-3.5' />
                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className='text-right text-zinc-400'>
                          {user.isAdmin ? 'Yes' : 'No'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center py-10 text-zinc-500'>
                        No users found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className='mt-6 flex justify-center'>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
