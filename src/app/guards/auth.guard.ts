import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const currentUser = authService.currentUserValue;
  if (currentUser && currentUser.token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};