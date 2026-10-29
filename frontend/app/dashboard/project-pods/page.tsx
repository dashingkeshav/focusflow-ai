'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectPodsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/focus-rooms');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-400 font-mono text-xs">
      Redirecting to Focus Rooms...
    </div>
  );
}
