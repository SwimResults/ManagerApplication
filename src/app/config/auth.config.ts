import {AuthConfig} from "angular-oauth2-oidc";
import {environment} from "../../environments/environment";

export const authConfig: AuthConfig = {
  issuer: environment.o_auth_issuer,
  redirectUri: environment.production ? window.location.origin + "/auth" : "http://127.0.0.1:3000/auth",
  clientId: 'swimresults-pkce-client',
  responseType: 'code',
  strictDiscoveryDocumentValidation: true,
  scope: 'openid profile offline_access',
  showDebugInformation: true,
  postLogoutRedirectUri: environment.production ? window.location.origin + "/auth/logout" : "http://127.0.0.1:3000/auth/logout"
}
