import { Injectable, inject } from '@angular/core';
import {OAuthService, TokenResponse} from "angular-oauth2-oidc";
import {authConfig} from "../../config/auth.config";
import {ReplaySubject} from "rxjs";
import {Router} from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private oAuthService = inject(OAuthService);
    private router = inject(Router);

    private isAuthenticatedSubject = new ReplaySubject<boolean>(1);
    public isAuthenticated = this.isAuthenticatedSubject.asObservable();

    private scopesSubject = new ReplaySubject<string[]>(1);
    public scopes = this.scopesSubject.asObservable();

    constructor() {
        this.scopesSubject.next([]);
        this.setup();
    }

    setup() {
        console.log("loading auth config", authConfig)
        this.oAuthService.configure(authConfig);

        // Subscribe to all OAuth events to debug
        this.oAuthService.events.subscribe(event => {
            console.log('[AuthService] OAuth Event:', event.type, event);
        });

        this.oAuthService.loadDiscoveryDocumentAndTryLogin().then(loginResult => {
            console.log("[AuthService] loadDiscoveryDocumentAndTryLogin result:", loginResult);
            console.log("[AuthService] Has valid access token:", this.oAuthService.hasValidAccessToken());
            console.log("[AuthService] Has valid ID token:", this.oAuthService.hasValidIdToken());
            console.log("[AuthService] Refresh token exists:", !!this.oAuthService.getRefreshToken());
            console.log("[AuthService] Access token:", this.oAuthService.getAccessToken()?.substring(0, 50) + "...");

            // Check if we have valid tokens (either from fresh login or existing session)
            if (this.oAuthService.hasValidAccessToken()) {
                console.log("[AuthService] Valid access token found");
                this.loadTokenData();
                this.oAuthService.setupAutomaticSilentRefresh();
            } else if (this.oAuthService.getRefreshToken()) {
                // Only try to refresh if we have a refresh token but no valid access token
                console.log("[AuthService] No valid access token, attempting refresh");
                this.refreshToken().then(_ => {
                    this.oAuthService.setupAutomaticSilentRefresh();
                }).catch(err => {
                    console.error("[AuthService] Refresh token failed:", err);
                    this.setAuthenticated(false);
                });
            } else {
                console.log("[AuthService] No valid tokens or refresh token available");
                this.setAuthenticated(false);
            }
        }).catch(err => {
            console.error("[AuthService] loadDiscoveryDocumentAndTryLogin error:", err);
            this.setAuthenticated(false);
        });
    }

    login() {
        this.oAuthService.initCodeFlow(this.router.url)
    }

    logout() {
        this.oAuthService.revokeTokenAndLogout().then(_ => {
            this.isAuthenticatedSubject.next(false);
        });
    }

    loadTokenData() {
        if (this.oAuthService.hasValidIdToken()) {
            this.isAuthenticatedSubject.next(true);
            this.setScopes(this.oAuthService.getGrantedScopes())
        } else {
            this.setAuthenticated(false);
        }
    }


    refreshToken(): Promise<TokenResponse> {
        return new Promise<TokenResponse>((resolve, reject) => {
            this.oAuthService.refreshToken().then(response => {
                this.loadTokenData()
                resolve(response);
            }).catch(reason => {
                reject(reason);
            });
        });
    }


    setAuthenticated(authed: boolean) {
        this.isAuthenticatedSubject.next(authed);
    }

    setScopes(scopes: object) {
        this.scopesSubject.next(scopes as string[]);
    }
}
