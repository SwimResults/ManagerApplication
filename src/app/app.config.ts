import {ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withHashLocation} from '@angular/router';

import {routes} from './app.routes';
import {HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi} from '@angular/common/http';
import {provideTranslateService, TranslateLoader} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {JwtInterceptor} from './core/interceptor/jwt.interceptor';
import { errorInterceptor } from './core/interceptor/error.interceptor';
import {OAuthModule, OAuthService, OAuthStorage} from 'angular-oauth2-oidc';
import {SWIMRESULTS_API_CONFIG, SwimResultsApiConfig} from '@swimresults/angular';
import {environment} from '../environments/environment';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';

const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (http: HttpClient) =>
    new TranslateHttpLoader(http, './i18n/', '.json');

export function storageFactory(): OAuthStorage {
    return localStorage;
}

// API clients from @swimresults/angular. HttpClient requests get the token from the JwtInterceptor;
// authHeader is only used by the import progress stream (fetch, no interceptors).
export function swimResultsApiConfigFactory(): SwimResultsApiConfig {
    const oAuthService = inject(OAuthService);
    return {
        apiUrls: environment.api_urls,
        authHeader: () => oAuthService.hasValidIdToken() ? oAuthService.authorizationHeader() : null,
    };
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({eventCoalescing: true}),
        provideTranslateService({
            defaultLanguage: 'de',
            loader: {
                provide: TranslateLoader,
                useFactory: httpLoaderFactory,
                deps: [HttpClient]
            }
        }),

        importProvidersFrom([
            OAuthModule.forRoot({
                resourceServer: {
                    allowedUrls: [],
                    sendAccessToken: true,
                }
            }),
        ]),

        {provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true},
        {provide: OAuthStorage, useFactory: storageFactory},
        {provide: SWIMRESULTS_API_CONFIG, useFactory: swimResultsApiConfigFactory},
        {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500}},
        provideRouter(routes, withHashLocation()),
        provideHttpClient(
            withInterceptors([errorInterceptor]),
            withInterceptorsFromDi()
        ),
    ]
};


