import {Injectable, inject} from '@angular/core';
import {HttpRequest, HttpHandler, HttpEvent, HttpInterceptor} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OAuthService} from "angular-oauth2-oidc";

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private oAuthService = inject(OAuthService);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

        console.log("intercept request", request.url);

        if (!this.oAuthService.hasValidIdToken()) {
            console.log('Not logged in, sending request without token');
            return next.handle(request);
        }

        if (request.url.includes("api.swimresults.de") || request.url.includes("api-dev.swimresults.de") || request.url.includes("localhost:8090")) {
            console.log("send request to", request.url, "with auth");
            const modifiedReq = request.clone({
                //headers: request.headers.set('Authorization', `Bearer ${userToken}`),
                headers: request.headers.set('Authorization', this.oAuthService.authorizationHeader()),
            });

            return next.handle(modifiedReq);
        }

        return next.handle(request);

    }
}
