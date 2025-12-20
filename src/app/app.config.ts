import {ApplicationConfig, importProvidersFrom, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi} from '@angular/common/http';
import {provideTranslateService, TranslateLoader} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {JwtInterceptor} from './core/interceptor/jwt.interceptor';
import { errorInterceptor } from './core/interceptor/error.interceptor';
import {OAuthModule, OAuthStorage} from 'angular-oauth2-oidc';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';

const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (http: HttpClient) =>
    new TranslateHttpLoader(http, './i18n/', '.json');

export function storageFactory(): OAuthStorage {
    return localStorage;
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
        {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500}},
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([errorInterceptor]),
            withInterceptorsFromDi()
        ),
    ]
};
