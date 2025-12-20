import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SnackBarService } from '../service/ui/snack-bar.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(SnackBarService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const status = error.status;
        const message = (error.error && (error.error.message || error.error.error || error.error)) || error.message || 'Unknown error';
        snackBar.open(`${status}: ${message}`);
      } else {
        snackBar.open(`Error: ${String(error)}`);
      }
      return throwError(() => error);
    })
  );
};
