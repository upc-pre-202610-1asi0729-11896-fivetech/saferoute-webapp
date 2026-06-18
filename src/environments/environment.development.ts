export const environment = {
  production: false,
  // Local json-server (server/db.json) for IAM / Stakeholder / Subscription / Notifications.
  // The json-server rewriter maps /api/v1/* -> /*, so this base URL works the same as Azure.
  platformProviderApiBaseUrl: 'http://localhost:3000/api/v1',
  // Spring Boot (Java) backend — Fleet bounded context. Only routes-management targets this.
  platformProviderJavaApiBaseUrl: 'https://saferoute-os.azurewebsites.net/api/v1',
  platformProviderRoutesEndpointPath: '/routes',
  platformProviderStopsEndpointPath: '/stops',
  platformProviderUsersEndpointPath: '/users',
  platformProviderOrganizationsEndpointPath: '/organizations',
  platformProviderSignInEndpointPath: '/sign-in',
  platformProviderSignUpEndpointPath: '/sign-up',
  platformProviderTripsEndpointPath: '/trips',
  platformProviderIncidentsEndpointPath: '/incidents',
  platformProviderNotificationsEndpointPath: '/notifications',
  platformProviderProfilesEndpointPath: '/profiles',
  platformProviderVehiclesEndpointPath: '/vehicles',
  platformProviderParentsEndpointPath: '/parents',
  platformProviderChildrenEndpointPath: '/children',
  platformProviderPlansEndpointPath: '/plans',
  platformProviderSubscriptionsEndpointPath: '/subscriptions',
  logoProviderApiBaseUrl: 'https://img.logo.dev/',
  logoProviderPublishableKey: 'pk_MaaysUc_QNaCWpZNw7k5UA',
  orsBaseUrl: 'https://api.openrouteservice.org',
  orsApiKey:
    'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNhMjJlYzkyNWRkMTQyMjJiNTgxYzc1NWRhYWM4NDA1IiwiaCI6Im11cm11cjY0In0=',
  simulationStepMs: 15000,
  useFakeAuth: false,
};
