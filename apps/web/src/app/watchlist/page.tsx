'use client';

import { ActivityItem } from '@/components/activity/ActivityItem';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { WatchlistButton } from '@/components/tokens/WatchlistButton';
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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from '@/components/users/UserList';
import { useToast } from '@/hooks/use-toast';
import { ApiError, feed, users, watchlist } from '@/lib/api';
import {
  DYORHUB_SYMBOL,
  MIN_TOKEN_HOLDING_FOR_FEED,
  MIN_TOKEN_HOLDING_FOR_FOLDERS,
} from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  FeedActivity,
  Token,
  TokenGatedErrorData,
  User,
  WatchlistFolder as WatchlistFolderType,
} from '@dyor-hub/types';
import {
  AlertCircle,
  BookmarkIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderIcon,
  GripVertical,
  Lock,
  Pencil,
  PlusIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

const UNORGANIZED_FOLDER_ID = '__unorganized__';
const UNORGANIZED_FOLDER_NAME = 'Unorganized Tokens';

type WatchlistedToken = Token & { addedAt: Date };

interface FolderItem extends WatchlistFolderType {
  items: TokenItem[];
  type: 'folder';
}

interface TokenItem extends WatchlistedToken {
  type: 'token';
}

type DraggableItem = FolderItem | TokenItem;

const USERS_PER_PAGE = 10;

interface FeedContentProps {
  activities: FeedActivity[];
}

function FeedContent({ activities }: FeedContentProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card className='bg-zinc-900/30 border-zinc-800/50 p-6 text-center'>
        <p className='text-zinc-400'>No activity in your feed yet.</p>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} showUser />
      ))}
    </div>
  );
}

function FeedErrorMessage() {
  return (
    <Card className='bg-red-900/20 border-red-500/30'>
      <div className='text-center py-16 px-4'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-800/70 mb-4'>
          <AlertCircle className='h-6 w-6 text-red-300' />
        </div>
        <h3 className='text-lg font-medium text-white mb-2'>Error Loading Feed</h3>
        <p className='text-red-300 mb-6 max-w-md mx-auto'>
          There was an issue loading the feed. Please try again later.
        </p>
      </div>
    </Card>
  );
}

function findDraggableItem(
  id: UniqueIdentifier,
  items: DraggableItem[],
): DraggableItem | undefined {
  const topLevel = items.find(
    (item) =>
      (item.type === 'folder' && item.id === id) ||
      (item.type === 'token' && item.mintAddress === id),
  );
  if (topLevel) return topLevel;

  // Search within folders if not found at top level
  const allFolders = items.filter((item) => item.type === 'folder') as FolderItem[];
  for (const folder of allFolders) {
    const found = folder.items.find((token) => token.mintAddress === id);
    if (found) return found;
  }

  return undefined;
}

interface SortableFolderCardProps {
  folder: FolderItem;
  isOver: boolean;
  isVirtual: boolean;
  onNameUpdate: (folderId: string, newName: string) => Promise<void>;
  onRequestDelete: (folder: FolderItem) => void;
}

interface TokenGatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAmount: number;
  currentBalance?: string | number | null;
  featureName: string;
}

function TokenGatedDialog({
  open,
  onOpenChange,
  requiredAmount,
  currentBalance,
  featureName,
}: TokenGatedDialogProps) {
  const formattedRequired = requiredAmount.toLocaleString();
  const formattedBalance =
    typeof currentBalance === 'string' || typeof currentBalance === 'number'
      ? Number(currentBalance).toLocaleString()
      : null;

  const router = useRouter();

  const handleManageWallet = () => {
    router.push('/account/wallet');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{featureName} Access Restricted</AlertDialogTitle>
          <AlertDialogDescription>
            <p className='text-left'>
              Access to {featureName.toLowerCase()} requires holding a minimum of{' '}
              <span className='font-bold text-white'>{formattedRequired}</span> {DYORHUB_SYMBOL}{' '}
              tokens.
              {formattedBalance !== null && (
                <>
                  {' '}
                  Your current balance is{' '}
                  <span className='font-bold text-white'>{formattedBalance}</span>.
                </>
              )}{' '}
              Please ensure your primary connected wallet meets this requirement.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleManageWallet}>Manage Wallet</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading, user: currentUser } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['tokens', 'users', 'feed'].includes(tabParam)) {
      return tabParam as 'tokens' | 'users' | 'feed';
    }
    return 'tokens';
  }, [searchParams]);

  const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const { toast } = useToast();

  const [feedData, setFeedData] = useState<FeedActivity[] | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<'forbidden' | 'generic' | null>(null);
  const [feedCurrentPage, setFeedCurrentPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedAccessDeniedBalance, setFeedAccessDeniedBalance] = useState<string | null>(null);

  // --- State for folders and combined items ---
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [unorganizedTokens, setUnorganizedTokens] = useState<TokenItem[]>([]);
  // State to track active dragged item (token or folder)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // --- State to track folder being hovered over by a token ---
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  // --- State to track the origin folder of a dragged token ---
  const [draggedItemSourceFolderId, setDraggedItemSourceFolderId] = useState<string | null>(null);
  // --- State to store the data of the currently dragged item ---
  const [draggedItemData, setDraggedItemData] = useState<DraggableItem | null>(null);

  // --- Dialog States ---
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [isTokenGatedDialogOpen, setIsTokenGatedDialogOpen] = useState(false);
  const [folderCreationDeniedBalance, setFolderCreationDeniedBalance] = useState<string | null>(
    null,
  );

  // --- dnd-kit sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchWatchlistData = useCallback(async () => {
    if (!isAuthenticated || currentTab !== 'tokens') return;

    setIsLoadingTokens(true);
    setIsLoadingFolders(true);
    setUnorganizedTokens([]);
    setFolders([]);

    try {
      const [tokensData, userFoldersData] = await Promise.all([
        watchlist.getWatchlistedTokens(),
        watchlist.folders.getTokenFolders(), // Fetches only user-created folders
      ]);

      const allTokenItems: TokenItem[] = tokensData.map((token) => ({
        ...token,
        addedAt: new Date(token.addedAt),
        type: 'token' as const,
      }));

      const tokenFolderMap = new Map<string, string>();

      const fetchedFoldersProcessing: Omit<FolderItem, 'items'>[] = userFoldersData.map((f) => ({
        ...f,
        type: 'folder' as const,
      }));

      const itemFetchResults = await Promise.allSettled(
        fetchedFoldersProcessing.map((folder) => watchlist.folders.getFolderTokens(folder.id)),
      );

      itemFetchResults.forEach((result, index) => {
        const folderId = fetchedFoldersProcessing[index].id;
        if (result.status === 'fulfilled') {
          result.value.forEach((token) => {
            if (!tokenFolderMap.has(token.mintAddress)) {
              tokenFolderMap.set(token.mintAddress, folderId);
            }
          });
        } else {
          console.error(`Failed to fetch items for folder ${folderId}:`, result.reason);
        }
      });

      const finalFolders: FolderItem[] = fetchedFoldersProcessing
        .map((folderData) => ({
          ...folderData,
          items: allTokenItems.filter(
            (token) => tokenFolderMap.get(token.mintAddress) === folderData.id,
          ),
        }))
        .sort((a, b) => a.position - b.position);

      const finalUnorganizedTokens = allTokenItems.filter(
        (token) => !tokenFolderMap.has(token.mintAddress),
      );

      setFolders(finalFolders);
      setUnorganizedTokens(finalUnorganizedTokens);
    } catch (error) {
      console.error('Error fetching watchlist tokens and folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load watchlist items',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTokens(false);
      setIsLoadingFolders(false);
    }
  }, [isAuthenticated, currentTab]);

  useEffect(() => {
    fetchWatchlistData();
  }, [fetchWatchlistData]);

  const draggableItems = useMemo(() => {
    const items: DraggableItem[] = [...folders];

    if (unorganizedTokens.length > 0) {
      items.push({
        id: UNORGANIZED_FOLDER_ID,
        name: UNORGANIZED_FOLDER_NAME,
        items: unorganizedTokens,
        folderType: 'token',
        position: folders.length,
        userId: currentUser?.id ?? '',
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'folder' as const,
      });
    }

    return items;
  }, [folders, unorganizedTokens, currentUser?.id]);

  useEffect(() => {
    const fetchFollowedUsers = async (userId: string, page: number) => {
      setIsLoadingUsers(true);
      try {
        const response = await users.getFollowing(userId, page, USERS_PER_PAGE);
        setFollowedUsers(response.data);
        setUserCurrentPage(response.meta.page);
        setUserTotalPages(response.meta.totalPages);
      } catch (error) {
        console.error('Error fetching followed users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load followed users',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isAuthenticated && currentUser && currentTab === 'users') {
      fetchFollowedUsers(currentUser.id, userCurrentPage);
    }
    if (currentTab !== 'users') {
      setFollowedUsers([]);
      setIsLoadingUsers(true);
      setUserCurrentPage(1);
      setUserTotalPages(1);
    }
  }, [isAuthenticated, currentTab, toast, currentUser, userCurrentPage]);

  useEffect(() => {
    const fetchFeed = async (page: number) => {
      if (!isAuthenticated) return;

      setIsLoadingFeed(true);
      setFeedError(null);
      setFeedAccessDeniedBalance(null);
      try {
        const response = await feed.getFollowing(page, 10);
        setFeedData(response.data);
        setFeedCurrentPage(response.meta.page);
        setFeedTotalPages(response.meta.totalPages);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          setFeedError('forbidden');
          let balanceFromError = null;
          if (typeof error.data === 'object' && error.data && 'currentBalance' in error.data) {
            balanceFromError = String(error.data.currentBalance);
          }
          setFeedAccessDeniedBalance(balanceFromError);
        } else {
          setFeedError('generic');
        }
        setFeedData(null);
      } finally {
        setIsLoadingFeed(false);
      }
    };

    if (isAuthenticated && currentTab === 'feed') {
      fetchFeed(feedCurrentPage);
    }
    if (currentTab !== 'feed') {
      setFeedData(null);
      setFeedError(null);
      setIsLoadingFeed(false);
      setFeedCurrentPage(1);
      setFeedTotalPages(1);
      setFeedAccessDeniedBalance(null);
    }
  }, [currentTab, isAuthenticated, feedCurrentPage]);

  const handleTokenRemoved = useCallback((mintAddress: string) => {
    setUnorganizedTokens((prev) => prev.filter((token) => token.mintAddress !== mintAddress));
    setFolders((prevFolders) =>
      prevFolders.map((folder) => ({
        ...folder,
        items: folder.items.filter((token) => token.mintAddress !== mintAddress),
      })),
    );
  }, []);

  const handleToggleFollow = async (userId: string) => {
    const isFollowing = followedUsers.some((u) => u.id === userId);
    const previousUsers = [...followedUsers];

    if (isFollowing) {
      setFollowedUsers((prev) => prev.filter((u) => u.id !== userId));
    }

    try {
      if (isFollowing) {
        await users.unfollow(userId);
        toast({
          title: 'User unfollowed',
          description: 'You are no longer following this user.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`,
        variant: 'destructive',
      });
      setFollowedUsers(previousUsers);
    }
  };

  const handleUserPageChange = (page: number) => {
    if (page !== userCurrentPage && page > 0 && page <= userTotalPages) {
      setUserCurrentPage(page);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    const currentDraggedItemData = findDraggableItem(active.id, draggableItems);
    setDraggedItemData(currentDraggedItemData ?? null);

    let itemSourceFolderId: string | null = null;
    if (currentDraggedItemData) {
      if (currentDraggedItemData.type === 'token') {
        const parentFolder = folders.find((f) =>
          f.items.some((t) => t.mintAddress === currentDraggedItemData.mintAddress),
        );
        itemSourceFolderId = parentFolder?.id ?? null;
      }
    }

    setDraggedItemSourceFolderId(itemSourceFolderId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setOverFolderId(null);
      return;
    }

    const overItem = draggableItems.find(
      (item) =>
        (item.type === 'folder' && item.id === over.id) ||
        (item.type === 'token' && item.mintAddress === over.id),
    );

    if (!draggedItemData || !overItem) return;

    if (draggedItemData.type === 'token' && overItem.type === 'folder') {
      if (overItem.id !== overFolderId) {
        setOverFolderId(overItem.id);
      }
    } else if (overFolderId !== null) {
      setOverFolderId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverFolderId(null); // Reset hover state on drag end
    const currentDraggedItemData = draggedItemData; // Capture state before resetting
    setDraggedItemData(null); // Reset dragged item data state
    const sourceFolderId = draggedItemSourceFolderId; // Use state captured at drag start
    setDraggedItemSourceFolderId(null); // Reset source folder state

    if (!over || active.id === over.id) {
      return;
    }

    const overItemIndex = draggableItems.findIndex(
      (item) =>
        (item.type === 'folder' && item.id === over.id) ||
        (item.type === 'token' && item.mintAddress === over.id),
    );

    const overItem = overItemIndex > -1 ? draggableItems[overItemIndex] : null;

    if (!currentDraggedItemData || !over) {
      return;
    }

    // Determine the target folder ID if dropping onto a folder or an item within it
    let targetFolderId: string | null = null;

    const potentialOverItem = over ? findDraggableItem(over.id, draggableItems) : null;

    if (potentialOverItem?.type === 'folder') {
      targetFolderId = potentialOverItem.id;
    } else if (potentialOverItem?.type === 'token') {
      // Check if the target token is inside a folder
      const parentFolder = folders.find((f) =>
        f.items.some((t) => t.mintAddress === potentialOverItem.mintAddress),
      );
      targetFolderId = parentFolder?.id ?? null;
    }

    // 1. Moving a Token INTO a Folder
    // Ensure it's a token, target is a real folder (not unorganized), and not the same folder
    if (
      currentDraggedItemData.type === 'token' &&
      targetFolderId &&
      targetFolderId !== UNORGANIZED_FOLDER_ID &&
      targetFolderId !== sourceFolderId
    ) {
      // Get target folder data
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      if (!targetFolder) return;

      // Check if the token is already in the target folder
      const alreadyInTargetFolder = targetFolder.items.some(
        (t) => t.mintAddress === currentDraggedItemData.mintAddress,
      );
      if (alreadyInTargetFolder) {
        return; // Already in the folder, do nothing
      }

      const itemToAdd = { ...currentDraggedItemData, type: 'token' as const };

      // Update source state FIRST only if it was the unorganized list
      if (!sourceFolderId || sourceFolderId === UNORGANIZED_FOLDER_ID) {
        setUnorganizedTokens((prev) =>
          prev.filter((t) => t.mintAddress !== currentDraggedItemData.mintAddress),
        );
      }

      // Update folders state: Add to target AND remove from source (if source was a user folder)
      const updatedFolders = folders
        .map((folder) => {
          let items = folder.items;
          // Remove from source folder if necessary
          if (folder.id === sourceFolderId) {
            items = items.filter((t) => t.mintAddress !== currentDraggedItemData.mintAddress);
          }
          // Add to target folder
          if (folder.id === targetFolderId) {
            items = [...items, itemToAdd];
          }
          return { ...folder, items };
        })
        .sort((a, b) => a.position - b.position);

      setFolders(updatedFolders);

      try {
        // If moving from a user folder, remove from it first
        if (sourceFolderId && sourceFolderId !== UNORGANIZED_FOLDER_ID) {
          await watchlist.folders.removeTokenFromFolder(
            sourceFolderId,
            currentDraggedItemData.mintAddress,
          );
        }
        // Then add to the new folder
        await watchlist.folders.addTokenToFolder(
          targetFolderId,
          currentDraggedItemData.mintAddress,
        );
        toast({ title: 'Token added to folder' });
      } catch {
        toast({ title: 'Error', description: 'Could not move token', variant: 'destructive' });
      }
      return;
    }

    // 2. Reordering a Token WITHIN the SAME Folder
    if (
      currentDraggedItemData.type === 'token' &&
      sourceFolderId &&
      targetFolderId === sourceFolderId
    ) {
      if (sourceFolderId === UNORGANIZED_FOLDER_ID) {
        // Reorder within Unorganized
        const oldIndex = unorganizedTokens.findIndex((t) => t.mintAddress === active.id);
        const newIndex = over ? unorganizedTokens.findIndex((t) => t.mintAddress === over.id) : -1;
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setUnorganizedTokens((prev) => arrayMove(prev, oldIndex, newIndex));
          toast({ title: 'Token reordered' });
        }
      } else {
        // Reorder within a User Folder
        const folderIndex = folders.findIndex((f) => f.id === sourceFolderId);
        if (folderIndex === -1) return;

        const oldItemIndex = folders[folderIndex].items.findIndex(
          (t) => t.mintAddress === active.id,
        );
        const newItemIndex = over
          ? folders[folderIndex].items.findIndex((t) => t.mintAddress === over.id)
          : -1;

        if (oldItemIndex !== -1 && newItemIndex !== -1 && oldItemIndex !== newItemIndex) {
          const updatedFolders = [...folders];
          updatedFolders[folderIndex] = {
            ...updatedFolders[folderIndex],
            items: arrayMove(updatedFolders[folderIndex].items, oldItemIndex, newItemIndex),
          };
          setFolders(updatedFolders);

          try {
            toast({ title: 'Token reordered within folder' });
          } catch (error) {
            console.error('Error reordering token in folder:', error);
            toast({
              title: 'Error',
              description: 'Could not reorder token',
              variant: 'destructive',
            });
          }
        }
      }
      return;
    }

    // 3. Moving a Token OUT of a Folder (to top level/Unorganized)
    if (
      currentDraggedItemData.type === 'token' &&
      sourceFolderId &&
      sourceFolderId !== UNORGANIZED_FOLDER_ID &&
      targetFolderId === UNORGANIZED_FOLDER_ID
    ) {
      // Dropped onto the Unorganized folder header or one of its items
      const targetUnorganizedIndex =
        overItem &&
        overItem.type === 'token' &&
        unorganizedTokens.some((t) => t.mintAddress === overItem.mintAddress)
          ? unorganizedTokens.findIndex((t) => t.mintAddress === overItem.mintAddress)
          : unorganizedTokens.length;

      const itemToMove = { ...currentDraggedItemData, type: 'token' as const }; // Use captured data
      // Remove from source folder
      const updatedFolders = folders.map((f) => {
        if (f.id === sourceFolderId) {
          return {
            ...f,
            items: f.items.filter((t) => t.mintAddress !== currentDraggedItemData.mintAddress),
          };
        }
        return f;
      });

      // Add to unorganized list at the target index
      const updatedUnorganizedTokens = [...unorganizedTokens];
      updatedUnorganizedTokens.splice(
        targetUnorganizedIndex >= 0 ? targetUnorganizedIndex : unorganizedTokens.length,
        0,
        itemToMove,
      );

      setFolders(updatedFolders);
      setUnorganizedTokens(updatedUnorganizedTokens);

      try {
        await watchlist.folders.removeTokenFromFolder(
          sourceFolderId,
          currentDraggedItemData.mintAddress,
        );
        toast({ title: 'Token moved out of folder' });
      } catch {
        toast({ title: 'Error', description: 'Could not move token out', variant: 'destructive' });
      }
      return;
    }

    // 4. Reordering Top-Level Items (Folders and Tokens)
    // Check if we are reordering folders among themselves or top-level tokens
    if (currentDraggedItemData.type === 'folder' && overItemIndex !== -1) {
      // Reordering Folders
      // Indices must be relative to the `folders` array for reordering
      const currentActiveIndex = folders.findIndex((f) => f.id === currentDraggedItemData.id);
      // Find the target index within the *current* list of folders
      const currentOverIndex = over ? folders.findIndex((f) => f.id === over.id) : -1;

      if (
        currentActiveIndex === -1 ||
        currentOverIndex === -1 ||
        currentActiveIndex === currentOverIndex
      ) {
        return;
      }

      const reorderedFolders = arrayMove(folders, currentActiveIndex, currentOverIndex);

      setFolders(reorderedFolders);

      const movedFolders = reorderedFolders;
      if (movedFolders.some((folder, index) => folder.position !== index)) {
        try {
          await Promise.all(
            movedFolders.map(
              (folder, index) => watchlist.folders.updateFolder(folder.id, { position: index }), // API call to update position
            ),
          );
          // Update the position property in the state to match the new order
          setFolders(reorderedFolders.map((folder, index) => ({ ...folder, position: index })));
          toast({ title: 'Folders reordered' });
        } catch {
          toast({
            title: 'Error',
            description: 'Could not update folder positions',
            variant: 'destructive',
          });
        }
      }
    } else if (
      currentDraggedItemData.type === 'token' &&
      !sourceFolderId &&
      targetFolderId === UNORGANIZED_FOLDER_ID &&
      overItemIndex !== -1
    ) {
      // Reordering top-level TOKENS (within Unorganized)
      const currentActiveUnorgIndex = unorganizedTokens.findIndex(
        (t) => t.mintAddress === currentDraggedItemData.mintAddress,
      );
      const currentOverUnorgIndex = over
        ? unorganizedTokens.findIndex((t) => t.mintAddress === over.id)
        : -1;
      if (
        currentActiveUnorgIndex !== -1 &&
        currentOverUnorgIndex !== -1 &&
        currentActiveUnorgIndex !== currentOverUnorgIndex
      ) {
        setUnorganizedTokens((prev) =>
          arrayMove(prev, currentActiveUnorgIndex, currentOverUnorgIndex),
        );
        toast({ title: 'Token reordered' });
      } else {
      }
    }
  };

  const handleFeedPageChange = (page: number) => {
    if (page !== feedCurrentPage && page > 0 && page <= feedTotalPages) {
      setFeedCurrentPage(page);
    }
  };

  const handleTabChange = (newTab: string) => {
    if (['tokens', 'users', 'feed'].includes(newTab) && newTab !== currentTab) {
      const params = new URLSearchParams(searchParams);
      params.set('tab', newTab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const SortableTokenCard = memo(function SortableTokenCard({ token }: { token: TokenItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: token.mintAddress,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      // Hide original element when dragging, overlay takes over
      visibility: (isDragging ? 'hidden' : 'visible') as React.CSSProperties['visibility'],
      zIndex: isDragging ? 10 : 'auto',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className='flex items-center p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-lg hover:bg-zinc-800/30 transition-colors touch-none'>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab text-zinc-500 hover:text-zinc-300 mr-3 flex-shrink-0'>
          <GripVertical className='w-5 h-5' />
        </div>

        <div className='flex items-start flex-grow'>
          <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0'>
            {token.imageUrl ? (
              <Image
                src={token.imageUrl}
                alt={token.name}
                width={48}
                height={48}
                className='object-cover'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-blue-900/50 text-lg sm:text-xl font-bold text-blue-300'>
                {token.symbol.substring(0, 1)}
              </div>
            )}
          </div>
          <div className='flex-1 min-w-0 mx-3 sm:mx-4 overflow-hidden'>
            <div className='flex items-center gap-1'>
              <Link
                href={`/tokens/${token.mintAddress}`}
                className='font-bold text-base sm:text-lg hover:text-blue-400 transition-colors truncate'>
                {token.name}
              </Link>
              <span className='text-zinc-400 text-xs sm:text-sm flex items-center flex-shrink-0'>
                <span>$</span>
                {token.symbol}
              </span>
            </div>
            <p className='text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1 line-clamp-2 break-all'>
              {token.description || '-'}
            </p>
          </div>
          <div className='flex-shrink-0'>
            <div className='flex gap-1'>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(token.mintAddress);
                  toast({
                    title: 'Address copied',
                    description: 'Token address copied to clipboard',
                  });
                }}
                className='flex items-center justify-center rounded-lg p-1.5 transition-all duration-200 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 cursor-pointer'
                title='Copy mint address'
                aria-label='Copy mint address'>
                <Copy className='w-5 h-5' />
              </button>
              <WatchlistButton
                mintAddress={token.mintAddress}
                initialWatchlistStatus={true}
                size='sm'
                tokenSymbol={token.symbol}
                onStatusChange={(isWatchlisted) => {
                  if (!isWatchlisted) {
                    handleTokenRemoved(token.mintAddress);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  });

  const SortableFolderCard = memo(function SortableFolderCard({
    folder,
    isOver,
    isVirtual,
    onNameUpdate,
    onRequestDelete,
  }: SortableFolderCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: folder.id,
      disabled: isVirtual,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      visibility: (isDragging ? 'hidden' : 'visible') as React.CSSProperties['visibility'],
      zIndex: isDragging ? 10 : 'auto',
    };

    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(folder.name);
    const { toast } = useToast();

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedName(folder.name);
    };

    const handleSaveEdit = async () => {
      const newName = editedName.trim();
      if (newName === '' || newName === folder.name) {
        handleCancelEdit();
        return;
      }

      try {
        await watchlist.folders.updateFolder(folder.id, { name: newName });
        await onNameUpdate(folder.id, newName);
        setIsEditing(false);
        toast({ title: 'Folder renamed' });
      } catch {
        toast({ title: 'Error', description: 'Could not rename folder', variant: 'destructive' });
        handleCancelEdit(); // Revert on error
      }
    };

    const folderHeaderClasses = `flex items-center p-3 sm:p-4 rounded-t-lg ${isOver ? '' : 'hover:bg-zinc-700/50'}`;

    const outerContainerClasses = `mb-4 touch-none rounded-lg transition-colors ${isOver ? 'bg-blue-950/50' : 'bg-zinc-900/50'}`;

    return (
      <div ref={setNodeRef} style={style} className={outerContainerClasses}>
        <div className={folderHeaderClasses}>
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={`cursor-grab text-zinc-500 hover:text-zinc-300 mr-3 flex-shrink-0 ${isEditing || isVirtual ? 'opacity-30 pointer-events-none invisible' : ''}`}>
            <GripVertical className='w-5 h-5' />
          </div>

          <FolderIcon className='w-5 h-5 mr-3 text-blue-400 flex-shrink-0' />
          {isEditing ? (
            <div className='flex-1 flex items-center gap-2 mr-2'>
              <Input
                type='text'
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className='h-8 bg-zinc-700 border-zinc-600 text-white focus:ring-blue-500'
                autoFocus
              />
              <Button
                onClick={handleSaveEdit}
                size='icon'
                variant='ghost'
                className='h-7 w-7 text-green-400 hover:bg-green-900/50 hover:text-green-300'>
                {' '}
                <Check className='w-4 h-4' />{' '}
              </Button>
              <Button
                onClick={handleCancelEdit}
                size='icon'
                variant='ghost'
                className='h-7 w-7 text-red-400 hover:bg-red-900/50 hover:text-red-300'>
                {' '}
                <X className='w-4 h-4' />{' '}
              </Button>
            </div>
          ) : (
            <div className='flex-1 flex items-center gap-2 mr-2'>
              <span
                className='font-medium text-white truncate'
                onDoubleClick={isVirtual ? undefined : () => setIsEditing(true)}>
                {folder.name}
              </span>
              {!isEditing && !isVirtual && (
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => {
                      setEditedName(folder.name);
                      setIsEditing(true);
                    }}
                    className='p-1 rounded text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 transition-colors cursor-pointer'
                    title='Edit folder name'>
                    <Pencil className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => {
                      onRequestDelete(folder);
                    }}
                    className='p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer'
                    title='Delete folder'>
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              )}
            </div>
          )}
          {!isEditing && (
            <div className='flex items-center ml-auto'>
              <span className='text-sm text-zinc-400 mr-2'>{folder.items.length} items</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className={`p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer ${isVirtual ? 'invisible' : ''}`}
                aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                title={isExpanded ? 'Collapse folder' : 'Expand folder'}>
                {isExpanded ? (
                  <ChevronDown className='w-4 h-4' />
                ) : (
                  <ChevronRight className='w-4 h-4' />
                )}
              </button>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className='rounded-b-lg p-3 space-y-2'>
            {folder.items.length > 0 ? (
              <SortableContext
                items={folder.items.map((t) => t.mintAddress)}
                strategy={verticalListSortingStrategy}>
                {folder.items.map((token) => (
                  <SortableTokenCard key={token.mintAddress} token={token} />
                ))}
              </SortableContext>
            ) : (
              <div className='text-sm text-zinc-500 px-3 py-2'>Drag tokens here to add them.</div>
            )}
          </div>
        )}
      </div>
    );
  });

  const activeItemData = useMemo(() => draggedItemData, [draggedItemData]);

  const renderTokensContent = () => {
    if (isLoadingTokens || isLoadingFolders || authLoading) {
      return (
        <div className='grid gap-4'>
          <Skeleton className='h-12 w-full rounded-lg' /> {/* Placeholder for folder */}
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className='h-24 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    if (draggableItems.length === 0) {
      return (
        <Card className='bg-zinc-900/30 border-zinc-800/50'>
          <div className='text-center py-16 px-4'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/70 mb-4'>
              <BookmarkIcon className='h-6 w-6 text-blue-400' />
            </div>
            <h3 className='text-lg font-medium text-white mb-2'>Your watchlist is empty</h3>
            <p className='text-zinc-400 mb-6 max-w-md mx-auto'>
              Use the button below to create your first folder, or browse tokens and click the
              bookmark icon to add them here.
            </p>
            <div className='flex justify-center gap-4'>
              <Button onClick={handleCreateFolder} variant='outline'>
                <PlusIcon className='w-4 h-4 mr-2' />
                Create Folder
              </Button>
              <Button asChild variant='default'>
                <Link href='/'>Discover Tokens</Link>
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={draggableItems.map((item) =>
            item.type === 'folder' ? item.id : item.mintAddress,
          )}
          strategy={verticalListSortingStrategy}>
          <div className='mb-4'>
            <Button onClick={handleCreateFolder} variant='outline' size='sm'>
              <PlusIcon className='w-4 h-4 mr-2' /> Create New Folder
            </Button>
          </div>

          <div className='space-y-4'>
            {draggableItems.map((item) => {
              if (item.type === 'folder') {
                return (
                  <SortableFolderCard
                    key={item.id}
                    folder={item}
                    isOver={overFolderId === item.id}
                    isVirtual={item.id === UNORGANIZED_FOLDER_ID}
                    onNameUpdate={handleFolderNameUpdate}
                    onRequestDelete={requestFolderDelete}
                  />
                );
              }
              return null;
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId && activeItemData ? (
            activeItemData.type === 'folder' ? (
              <SortableFolderCard
                folder={activeItemData}
                isOver={false}
                isVirtual={activeItemData.id === UNORGANIZED_FOLDER_ID}
                onNameUpdate={handleFolderNameUpdate}
                onRequestDelete={requestFolderDelete}
              />
            ) : activeItemData.type === 'token' ? (
              <SortableTokenCard token={activeItemData} />
            ) : null
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const handleCreateFolder = async () => {
    if (!currentUser?.id) return;

    try {
      // Check if the user has enough tokens to create folders
      const accessCheck = await watchlist.folders.checkFolderAccess();

      const hasEnoughTokens = accessCheck.currentBalance >= accessCheck.requiredBalance;

      if (hasEnoughTokens) {
        setNewFolderName('');
        setIsCreateFolderDialogOpen(true);
      } else {
        setFolderCreationDeniedBalance(String(accessCheck.currentBalance));
        setIsTokenGatedDialogOpen(true);

        toast({
          title: 'Feature Restricted',
          description: `Creating folders requires holding at least ${accessCheck.requiredBalance.toLocaleString()} $DYORHUB tokens.`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not check access. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFolderNameUpdate = async (folderId: string, newName: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f)));
  };

  const handleFolderDelete = async (folderId: string) => {
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (!folderToDelete) return;

    const tokensToMove = folderToDelete.items;
    setUnorganizedTokens((prev) => [...prev, ...tokensToMove]);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));

    try {
      await watchlist.folders.deleteFolder(folderId);
      toast({ title: 'Folder deleted', description: `Tokens moved to main list.` });
    } catch {
      toast({ title: 'Error', description: 'Could not delete folder', variant: 'destructive' });
    }
  };

  const requestFolderDelete = (folder: FolderItem) => {
    setFolderToDelete(folder);
    setIsDeleteFolderDialogOpen(true);
  };

  const renderUsersContent = () => {
    if (isLoadingUsers || authLoading) {
      return (
        <div className='space-y-4'>
          {[...Array(USERS_PER_PAGE)].map((_, i) => (
            <Skeleton key={i} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        <UserList
          users={followedUsers}
          emptyMessage='You are not following any users yet. Explore users and click the follow button.'
          followingIds={followedUsers.map((u) => u.id)}
          onToggleFollow={handleToggleFollow}
          currentUserId={currentUser?.id}
        />

        {userTotalPages > 1 && (
          <Pagination
            currentPage={userCurrentPage}
            totalPages={userTotalPages}
            onPageChange={handleUserPageChange}
          />
        )}
      </div>
    );
  };

  const renderFeedContent = () => {
    if (isLoadingFeed || authLoading) {
      return (
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    if (feedError === 'forbidden') {
      const gatedError = new ApiError(
        403,
        `Access to the Feed feature requires holding at least ${MIN_TOKEN_HOLDING_FOR_FEED.toLocaleString()} ${DYORHUB_SYMBOL}.`,
        {
          message: `Access to the Feed feature requires holding at least ${MIN_TOKEN_HOLDING_FOR_FEED.toLocaleString()} ${DYORHUB_SYMBOL}.`,
          currentBalance: feedAccessDeniedBalance || undefined,
          requiredBalance: MIN_TOKEN_HOLDING_FOR_FEED.toString(),
          requiredTokenSymbol: DYORHUB_SYMBOL,
        } as Partial<TokenGatedErrorData>,
      );
      return <TokenGatedMessage error={gatedError} featureName='Feed' />;
    }

    if (feedError === 'generic') {
      return <FeedErrorMessage />;
    }

    return (
      <div className='space-y-6'>
        <FeedContent activities={feedData || []} />
        {feedTotalPages > 1 && (
          <Pagination
            currentPage={feedCurrentPage}
            totalPages={feedTotalPages}
            onPageChange={handleFeedPageChange}
          />
        )}
      </div>
    );
  };

  const watchlistContent = (
    <div className='container py-8 max-w-4xl mx-auto'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
        <h1 className='text-3xl font-bold'>Watchlist</h1>
      </div>

      <Tabs value={currentTab} className='w-full' onValueChange={handleTabChange}>
        <TabsList className='grid grid-cols-3 mb-8 w-full max-w-[500px]'>
          <TabsTrigger value='tokens' className='rounded-md'>
            <BookmarkIcon className='w-4 h-4 mr-2' />
            Tokens
          </TabsTrigger>
          <TabsTrigger value='users' className='rounded-md'>
            <Users className='w-4 h-4 mr-2' />
            Users
          </TabsTrigger>
          <TabsTrigger value='feed' className='rounded-md'>
            <Lock className='w-4 h-4 mr-2' />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value='tokens' className='mt-0'>
          {renderTokensContent()}
        </TabsContent>

        <TabsContent value='users' className='mt-0'>
          {renderUsersContent()}
        </TabsContent>

        <TabsContent value='feed' className='mt-0'>
          {renderFeedContent()}
        </TabsContent>
      </Tabs>

      {/* Create Folder Dialog */}
      <AlertDialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new watchlist folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-4'>
            <Input
              placeholder='Folder Name'
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewFolderName('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const trimmedName = newFolderName.trim();
                if (!trimmedName) {
                  toast({ title: 'Folder name cannot be empty', variant: 'destructive' });
                  return; // Keep dialog open
                }
                try {
                  const newFolderData = await watchlist.folders.createFolder(trimmedName, 'token');
                  const newFolder: FolderItem = {
                    ...newFolderData,
                    items: [],
                    type: 'folder',
                  };
                  setFolders((prev) =>
                    [newFolder, ...prev].sort((a, b) => a.position - b.position),
                  );
                  toast({ title: 'Folder created successfully' });
                  setIsCreateFolderDialogOpen(false);
                  setNewFolderName('');
                } catch (error) {
                  console.error('Error creating folder:', error);
                  toast({
                    title: 'Error',
                    description: 'Could not create folder',
                    variant: 'destructive',
                  });
                }
              }}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={isDeleteFolderDialogOpen} onOpenChange={setIsDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting the folder &quot;{folderToDelete?.name}&quot;
              will move all tokens inside it to the Unorganized list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (folderToDelete) {
                  handleFolderDelete(folderToDelete.id);
                }
                setFolderToDelete(null);
              }}
              className='bg-red-600 hover:bg-red-700 text-white'>
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TokenGatedDialog
        open={isTokenGatedDialogOpen}
        onOpenChange={setIsTokenGatedDialogOpen}
        requiredAmount={MIN_TOKEN_HOLDING_FOR_FOLDERS}
        currentBalance={folderCreationDeniedBalance}
        featureName='Folder Creation'
      />
    </div>
  );

  return <RequireAuth>{watchlistContent}</RequireAuth>;
}
