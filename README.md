# IssueTracker

IssueTracker is a web-based issue tracking system for teams. Administrators can manage users and issues, while employees can view and update issues assigned to them.

> **Live application:** [issues-tracking-system.vercel.app](https://issues-tracking-system.vercel.app/)
> **API:** [issuetracker-api.vercel.app](https://issuetracker-api.vercel.app/) (`/api` is the API base path).
GitHub Repository: https://github.com/DiyaVMendon/Issues-Tracking-System

## Features

- JWT-based sign-in with role-specific admin and employee dashboards.
- Create, search, filter, assign, update, and delete issues.
- Track issue status, priority, assignee, and due date.
- Add comments and upload or remove issue image attachments.
- Manage user accounts and account status (administrator).
- View and edit profile details; change passwords.
- Light and dark themes.
- Paginated API results and scroll-based loading in issue lists.

## Administrator access

- Email: `admin@gmail.com`
- Password: 12345678

## Architecture

The application is split into two independently run projects:

```text
client/                 React single-page application
  src/pages/            Login, dashboards, issues, users, and profile pages
  src/api/               Axios API helper
  src/reducers/          Redux control/authentication state
server/                  Express API
  routes/                Authentication and issue routes
  controllers/           Request handling and business logic
  middleware/            JWT verification and image upload validation
  models/                Mongoose user, issue, and comment models
```

The React client communicates with the Express API using Axios. The API uses MongoDB through Mongoose, JWT bearer tokens for protected endpoints, and Cloudinary for image storage.

## Tech stack

| Area | Technologies |
|---|---|
| Client | React 19, Vite 8, React Router, Redux, Axios, React Select |
| API | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (`jsonwebtoken`), bcrypt |
| Image storage | Cloudinary, Multer memory storage |
| Email | Gmail SMTP configuration for password-reset email |

## Requirements

- Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+ recommended).
- npm.
- MongoDB connection string (local MongoDB or MongoDB Atlas).
- Cloudinary account for issue attachments and profile avatars.
- Gmail account with an app password if password-reset email is enabled.

## Run locally

### 1. Configure the API

Create `server/.env`:

```dotenv
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/issuetracker
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Needed for password-reset email:
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

Never commit `.env` files or real credentials. `JWT_EXPIRES_IN` defaults to `7d` when omitted.

Install dependencies and start the API:

```bash
cd server
npm install
node local.js
```

The API listens on `http://localhost:5001` by default. Its health endpoint is `GET /`.

### 2. Configure and run the client

Create `client/.env`:

```dotenv
VITE_API_URL=http://localhost:5001/api
```

Then start Vite:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite. Vite environment variables are embedded at build time; restart the dev server after changing `.env`.

### 3. Check the client

```bash
cd client
npm run lint
npm run build
npm run preview
```

There is currently no automated test script configured in either package.

## Environment variables

| Variable | Project | Required | Purpose |
|---|---|---:|---|
| `PORT` | Server | No | API listening port; defaults to `5001`. |
| `MONGO_URI` | Server | Yes | MongoDB connection string. |
| `JWT_SECRET` | Server | Yes | Secret used to sign and verify access tokens. Use a unique, high-entropy secret. |
| `JWT_EXPIRES_IN` | Server | No | JWT lifetime; defaults to `7d` (for example, `1h`, `7d`). |
| `CLOUDINARY_CLOUD_NAME` | Server | Yes for image operations | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Server | Yes for image operations | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Server | Yes for image operations | Cloudinary API secret. |
| `EMAIL_USER` | Server | For password-reset email | Gmail account used to send reset messages. |
| `EMAIL_PASS` | Server | For password-reset email | Gmail app password; do not use or publish an account password. |
| `VITE_API_URL` | Client | No locally | API base URL, including `/api`. Defaults to `http://localhost:5001/api`. |

## API

The API base path is `/api`. JSON endpoints use JSON request bodies unless a route accepts multipart form data. Protected routes require:

```http
Authorization: Bearer <access-token>
```

### Authentication and account management

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register an account. |
| `POST` | `/api/auth/login` | Public | Sign in; returns an access token in `data` and the user role. |
| `GET` | `/api/auth/profile` | Token | Read the current profile. |
| `PUT` | `/api/auth/profile` | Token, multipart | Update profile; optional `avatar` image field. |
| `PUT` | `/api/auth/profile/password` | Token | Change the current password. |
| `GET` | `/api/auth/users/all` | Token; administrator required | List active users for issue assignment. |
| `GET` | `/api/auth/users/manage` | Token; administrator required | Get the managed-user list (supports pagination/search). |
| `POST` | `/api/auth/users/manage` | Token; administrator required | Create a managed user. |
| `PUT` | `/api/auth/users/manage/:id` | Token; administrator required | Update a managed user. |
| `DELETE` | `/api/auth/users/manage/:id` | Token; administrator required | Delete a managed user. |
| `GET` | `/api/auth/users` | Token | Read a user by query parameter. |
| `POST` | `/api/auth/reset-password/:token` | Public | Reset a password using a reset token. |

### Issues and comments

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/issues/create-issue` | Route currently has no token middleware; multipart | Create an issue; optional `issue_image` upload. |
| `GET` | `/api/issues` | Token | List issues. Supports `page`, `limit`, `status`, `priority`, `sort`, `search`, and administrator `userId` filters. |
| `GET` | `/api/issues/get-issue/:id` | Route currently has no token middleware | Read an issue by ID. |
| `PUT` | `/api/issues/update-issue/:id` | Route currently has no token middleware | Update issue fields. |
| `DELETE` | `/api/issues/delete-issue/:id` | Route currently has no token middleware | Delete an issue. |
| `GET` | `/api/issues/:id/comments` | Token; assigned employee or administrator | List issue comments. |
| `POST` | `/api/issues/:id/comments` | Token; assigned employee or administrator | Add a comment (`{ "text": "..." }`). |
| `DELETE` | `/api/issues/:id/attachment` | Token; assigned employee or administrator | Remove the issue image from Cloudinary and the issue record. |

> **Deployment security note:** The issue create, read-by-ID, update, and delete routes currently do not apply `verifyToken` middleware in `server/routes/IssueRoutes.js`. Protect and authorize these routes before exposing a production API.

Successful endpoints generally return a JSON object with a `message` and, when applicable, `data`. Errors return a non-2xx status and a `message`.

## Deployment

### Current deployment status

- **Live application URL:** [https://issues-tracking-system.vercel.app/](https://issues-tracking-system.vercel.app/)
- **Frontend host:** Vercel; project root is `client/`, built with Vite.
- **API base URL:** [https://issuetracker-api.vercel.app/api](https://issuetracker-api.vercel.app/api)
- **API host:** Vercel.
- **Source repository:** [DiyaVMendon/Issues-Tracking-System](https://github.com/DiyaVMendon/Issues-Tracking-System)

### Hosting layout

- **Frontend:** Vercel static hosting, built from the `client/` directory.
- **API:** Vercel deployment at `https://issuetracker-api.vercel.app/`; the client calls its `/api` endpoints.
- **Database:** MongoDB Atlas.
- **Images:** Cloudinary.
- **Email:** Gmail SMTP with an app password, if password reset is enabled.

Before production use, secure the issue routes noted above, configure CORS to allow only the frontend origin, and validate the password-reset flow.

### Deployment and updates

The application is deployed from the GitHub repository using Vercel projects for the client and API. For a new environment or redeployment:

1. Connect [DiyaVMendon/Issues-Tracking-System](https://github.com/DiyaVMendon/Issues-Tracking-System) to Vercel and create or select the relevant project.
2. For the frontend project, set the root directory to `client/`, the build command to `npm run build`, and the output directory to `dist`.
3. Set the frontend project's `VITE_API_URL` to `https://issuetracker-api.vercel.app/api` in Vercel's environment variables for the required deployment environments.
4. For the API project, use `server/` as its root directory and configure `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary credentials, and optional Gmail credentials in Vercel. Never expose server secrets as `VITE_` variables.
5. Ensure the API deployment can reach MongoDB Atlas and Cloudinary, and that CORS permits the frontend origin.
6. Push changes to the connected deployment branch or trigger a deployment from Vercel. Redeploy the API for server changes and the frontend for client changes or `VITE_API_URL` changes.
7. Review Vercel build/runtime logs and smoke-test sign-in, role-specific access, issue operations, comments, image uploads/removal, and direct navigation/refresh on client routes.

## Project brief

See [BRD.md](./BRD.md) for the business requirements and deployment brief.
