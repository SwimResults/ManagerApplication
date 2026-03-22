import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {OAuthService} from "angular-oauth2-oidc";
import {filter, Subscription} from "rxjs";
import {AuthService} from "../../core/service/auth.service";
import {Router} from "@angular/router";
import {SpinnerComponent} from '../../layout/element/spinner/spinner.component';

@Component({
    selector: 'sr-auth',
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss'],
    imports: [SpinnerComponent]
})
export class AuthComponent implements OnInit, OnDestroy {
  private oAuthService = inject(OAuthService);
  private authService = inject(AuthService);
  private router = inject(Router);

  user: any;

  private eventSubscription: Subscription

  constructor() {
    console.log('[AuthComponent] Constructor - subscribing to token_received events');

    this.eventSubscription = this.oAuthService.events
      .pipe(filter((e) => e.type === 'token_received'))
      .subscribe((_) => {
        console.log('[AuthComponent] Token received event fired');
        this.user = this.oAuthService.getIdentityClaims();
        console.log('[AuthComponent] User claims:', this.user);

        const scopes = this.oAuthService.getGrantedScopes();
        console.log('[AuthComponent] Granted scopes:', scopes);

        this.authService.setAuthenticated(true);
        this.authService.setScopes(scopes);

        // Determine where to navigate
        let targetUrl = '/';
        if (this.oAuthService.state) {
          targetUrl = this.oAuthService.state;
          if (!targetUrl.startsWith('/')) {
            targetUrl = decodeURIComponent(targetUrl);
          }
          console.log(`[AuthComponent] State found: ${this.oAuthService.state}, navigating to: ${targetUrl}`);
        } else {
          console.log('[AuthComponent] No state found, navigating to root');
        }

        this.router.navigateByUrl(targetUrl).then(r => {
          console.log(`[AuthComponent] Navigation to ${targetUrl} result:`, r);
          if (!r) {
            console.log('[AuthComponent] Navigation failed, trying root');
            this.router.navigateByUrl("/");
          }
        });
      });
  }

  ngOnInit() {
    console.log('[AuthComponent] ngOnInit - checking auth state');
    console.log('[AuthComponent] Current URL (window.location.href):', window.location.href);
    console.log('[AuthComponent] Current URL (window.location.hash):', window.location.hash);
    console.log('[AuthComponent] Router URL:', this.router.url);
    console.log('[AuthComponent] Has valid access token:', this.oAuthService.hasValidAccessToken());
    console.log('[AuthComponent] Has valid ID token:', this.oAuthService.hasValidIdToken());

    // Give the OAuth service a moment to process the callback
    setTimeout(() => {
      console.log('[AuthComponent] Timeout check - Has valid access token:', this.oAuthService.hasValidAccessToken());
      if (this.oAuthService.hasValidAccessToken()) {
        console.log('[AuthComponent] Already has valid access token, redirecting');
        const targetUrl = this.oAuthService.state || '/';
        this.router.navigateByUrl(targetUrl);
      } else {
        console.log('[AuthComponent] No valid access token yet, waiting for token_received event');
      }
    }, 500);
  }

  ngOnDestroy() {
    this.eventSubscription.unsubscribe();
  }
}
