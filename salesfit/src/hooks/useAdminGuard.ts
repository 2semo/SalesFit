import { router } from 'expo-router';
import { useEffect } from 'react';

import { authService } from '../services/authService';

export function useAdminGuard(): void {
  useEffect(() => {
    async function check() {
      const user = await authService.getCurrentUser();
      if (!user || user.role !== 'admin') {
        router.replace('/');
      }
    }
    void check();
  }, []);
}
