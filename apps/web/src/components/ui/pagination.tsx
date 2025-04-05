import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (isLoading || page === currentPage) return;
    onPageChange(page);
  };

  const SIBLINGS = 1;
  const BOUNDARIES = 1;

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  const totalPageNumbers = SIBLINGS * 2 + 3; // siblings + current + first + last

  // Render pagination UI
  return (
    <div className='flex items-center justify-center'>
      <div className='flex items-center gap-1'>
        {/* Previous button */}
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={isLoading || currentPage === 1}
          className={`
            flex items-center justify-center
            px-2 py-1.5 rounded-l-md border cursor-pointer
            ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
            bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300
            transition-colors duration-200
          `}>
          <ChevronLeft className='h-3 w-3' />
        </button>

        {(() => {
          // Case 1: Not enough pages to need ellipsis
          if (totalPages <= totalPageNumbers) {
            return range(1, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
                className={`
                  min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                  ${
                    currentPage === page
                      ? 'bg-blue-600 text-white font-medium border-blue-700'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  transition-colors duration-200
                `}>
                {page}
              </button>
            ));
          }

          // Calculate left and right siblings
          const leftSiblingIndex = Math.max(currentPage - SIBLINGS, BOUNDARIES);
          const rightSiblingIndex = Math.min(currentPage + SIBLINGS, totalPages - BOUNDARIES);

          const shouldShowLeftDots = leftSiblingIndex > BOUNDARIES + 1;
          const shouldShowRightDots = rightSiblingIndex < totalPages - BOUNDARIES;

          // Case 2: Show left dots but no right dots
          if (!shouldShowLeftDots && shouldShowRightDots) {
            const leftItemCount = SIBLINGS * 2 + BOUNDARIES;
            const leftRange = range(1, leftItemCount);

            return (
              <>
                {leftRange.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    disabled={isLoading}
                    className={`
                      min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                      ${
                        currentPage === page
                          ? 'bg-blue-600 text-white font-medium border-blue-700'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      transition-colors duration-200
                    `}>
                    {page}
                  </button>
                ))}

                <button
                  disabled
                  className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                  <span className='text-center'>•••</span>
                </button>

                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={isLoading}
                  className={`
                    min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                    ${
                      currentPage === totalPages
                        ? 'bg-blue-600 text-white font-medium border-blue-700'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    transition-colors duration-200
                  `}>
                  {totalPages}
                </button>
              </>
            );
          }

          // Case 3: Show right dots but no left dots
          if (shouldShowLeftDots && !shouldShowRightDots) {
            const rightItemCount = SIBLINGS * 2 + BOUNDARIES;
            const rightRange = range(totalPages - rightItemCount + 1, totalPages);

            return (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={isLoading}
                  className={`
                    min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                    ${
                      currentPage === 1
                        ? 'bg-blue-600 text-white font-medium border-blue-700'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    transition-colors duration-200
                  `}>
                  1
                </button>

                <button
                  disabled
                  className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                  <span className='text-center'>•••</span>
                </button>

                {rightRange.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    disabled={isLoading}
                    className={`
                      min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                      ${
                        currentPage === page
                          ? 'bg-blue-600 text-white font-medium border-blue-700'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      transition-colors duration-200
                    `}>
                    {page}
                  </button>
                ))}
              </>
            );
          }

          // Case 4: Show both left and right dots
          const middleRange = range(leftSiblingIndex, rightSiblingIndex);

          return (
            <>
              <button
                onClick={() => handlePageChange(1)}
                disabled={isLoading}
                className={`
                  min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                  ${
                    currentPage === 1
                      ? 'bg-blue-600 text-white font-medium border-blue-700'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  transition-colors duration-200
                `}>
                1
              </button>

              <button
                disabled
                className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                <span className='text-center'>•••</span>
              </button>

              {middleRange.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                  className={`
                    min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                    ${
                      currentPage === page
                        ? 'bg-blue-600 text-white font-medium border-blue-700'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    transition-colors duration-200
                  `}>
                  {page}
                </button>
              ))}

              <button
                disabled
                className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                <span className='text-center'>•••</span>
              </button>

              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={isLoading}
                className={`
                  min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                  ${
                    currentPage === totalPages
                      ? 'bg-blue-600 text-white font-medium border-blue-700'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  transition-colors duration-200
                `}>
                {totalPages}
              </button>
            </>
          );
        })()}

        {/* Next button */}
        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={isLoading || currentPage === totalPages}
          className={`
            flex items-center justify-center
            px-2 py-1.5 rounded-r-md border-t border-r border-b cursor-pointer
            ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}
            bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300
            transition-colors duration-200
          `}>
          <ChevronRight className='h-3 w-3' />
        </button>
      </div>
    </div>
  );
}
