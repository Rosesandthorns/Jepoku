
'use client';

import { useTransition } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { forceRefreshData } from '@/lib/actions';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await forceRefreshData();
      window.location.reload();
    });
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "text-red-600 focus:bg-red-100 focus:text-red-700",
        isPending && "cursor-not-allowed opacity-50"
      )}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
      <span>{isPending ? 'Refreshing...' : 'Refresh Data'}</span>
    </DropdownMenuItem>
  );
}
