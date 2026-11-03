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

- **Deployment status:** Deployed on Vercel.
- **Frontend URL:** [https://issues-tracking-system.vercel.app/](https://issues-tracking-system.vercel.app/)
- **API base URL:** [https://issuetracker-api.vercel.app/api](https://issuetracker-api.vercel.app/api)
- **Source repository:** [DiyaVMendon/Issues-Tracking-System](https://github.com/DiyaVMendon/Issues-Tracking-System)
- **Hosting platform:** Vercel hosts the frontend and API as separate projects.

### Required services

- A Git provider repository connected to the hosting providers.
- MongoDB Atlas (or another remotely reachable MongoDB instance).
- Cloudinary for image uploads and deletion.
- Gmail SMTP credentials using an app password if password-reset email is enabled.
- Frontend and API hosting with HTTPS.

### Deployment approach

1. Deploy the frontend from the `client/` directory on Vercel, using `npm run build` and `dist` as the output directory.
2. Deploy the API from the `server/` directory on Vercel.
3. Configure the frontend environment variable `VITE_API_URL=https://issuetracker-api.vercel.app/api`.
4. Configure API environment variables in Vercel: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary credentials, and optional Gmail credentials.
5. Ensure MongoDB Atlas is reachable from the API, production CORS allows the frontend origin, and HTTPS is enabled.
6. Push changes to the connected GitHub branch or trigger a Vercel deployment. Redeploy the relevant project when its code or environment variables change.
7. Review deployment logs and smoke-test authentication, role access, issue updates, comments, image operations, and SPA deep links.

Update the URLs in this Deployment section and in `README.md` if the Vercel domains change. Verify provider environment variables on every deployment; never commit secrets. Review and back up the database before manual data changes.
