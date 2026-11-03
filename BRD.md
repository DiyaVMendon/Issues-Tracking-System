# Business Requirements Document — IssueTracker

## Purpose

IssueTracker provides a shared workspace for teams to report, assign, and track issues through resolution.

## Users and roles

- **Administrator:** Manage user accounts and all issues; assign work and monitor status.
- **Employee:** View issues assigned to them, comment, and update allowed issue progress.

## Functional requirements

1. Users can register and sign in with email and password.
2. Users can view and update their profile and change their password.
3. Administrators can create, edit, deactivate, and delete managed user accounts.
4. Administrators can create, assign, filter, update, and delete issues.
5. Employees can view their assigned issues and update their issue status and due date.
6. Users with access to an issue can add and read comments.
7. Issues support image attachments, preview, and removal.
8. Dashboards summarize issue counts by status.

## Architecture and technology

The system consists of a React/Vite single-page client and a Node.js/Express API. The API persists users, issues, and comments in MongoDB through Mongoose. JWTs protect routes that use the token-verification middleware. Cloudinary stores issue and profile images.

## Non-functional requirements

- Do not commit credentials or secrets.
- Validate the authorization and role on every production API route.
- Restrict production CORS to the deployed frontend origin.
- Use HTTPS for deployed client and API traffic.
- Configure and monitor database, image storage, and email services independently.

## Deployment

### Status and URLs

- **Deployment status:** Not deployed; no live deployment URL or Git remote was found in the repository.
- **Frontend URL:** Pending deployment.
- **API URL:** Pending deployment.
- **Recommended deployment:** Vercel for the static client and Render (or an equivalent Node.js web-service platform) for the API.

### Required services

- A Git provider repository connected to the hosting providers.
- MongoDB Atlas (or another remotely reachable MongoDB instance).
- Cloudinary for image uploads and deletion.
- Gmail SMTP credentials using an app password if password-reset email is enabled.
- Frontend and API hosting with HTTPS.

### Initial deployment approach

1. Deploy the API from the `server/` directory with `node local.js` as the start command.
2. Configure API environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary credentials, and optional Gmail credentials.
3. Deploy the client from `client/`, building with `npm run build` and publishing `dist`.
4. Set client `VITE_API_URL` to the deployed API origin plus `/api`.
5. Configure SPA route fallback, production CORS, and secure authorization checks before public release.
6. Smoke-test authentication, role-specific access, issue updates, comments, and image operations.
7. Update the frontend and API URLs in both this document and `README.md` after deployment.

### Updating a deployment

Push approved changes to the connected deployment branch, verify provider environment variables, redeploy the affected service, inspect build/runtime logs, and smoke-test the deployed application. Database migrations or manual data changes must be reviewed and backed up before execution.
