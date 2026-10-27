# Deploy and Host Kan on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/kan-boards?referralCode=sLjDXb&utm_medium=integration&utm_source=button&utm_campaign=kan-boards)

[Kan](https://kan.bn/) is an open-source Trello alternative. It gives your team workspaces with boards, lists and cards, with labels, checklists, due dates, comments, attachments, an activity log, reusable board templates, public or private boards, and Trello import. This template runs Kan 0.6.0 on its own Postgres with a Railway bucket for files, creates your admin account on first boot and keeps sign-up invite-only.

## About Hosting Kan

The stack is two services and a bucket: Kan, Postgres and a Railway bucket.

- **Upstream's images, pinned.** Kan runs the official `ghcr.io/kanbn/kan` web image at a fixed release (0.6.0). The wrapper ([source](https://github.com/two-workspaces/kan)) adds upstream's migration bundle to the same container, so database migrations run on every start with no separate migrate service.
- **Admin on first boot, sign-up closed.** The admin account is created from `KAN_ADMIN_EMAIL` and the generated `KAN_ADMIN_PASSWORD`. Public sign-up is off, so only people you invite can create an account.
- **Attachments in a Railway bucket.** Card attachments go straight from the browser to the bucket through short-lived signed URLs, and the bucket is set up on boot to accept uploads from your Kan domain. Nothing is stored on the Kan container.
- **No email needed.** Sign-in is email and password, and you can add teammates with an invite link (below). Kan never needs to send an email to work.
- **Small footprint.** Kan idles at about 200 MB of RAM and Postgres at about 70 MB.

## Common Use Cases

- Team task boards for product, engineering, marketing or support work
- Moving off Trello, with your boards brought over by Trello import
- Public roadmaps and changelogs as read-only boards
- Personal or family boards for projects, plans and to-do lists
- Driving boards from scripts and other tools through Kan's REST API

## Dependencies for Kan Hosting

- Postgres 17 (included, private network only)
- A Railway bucket (included)

### Deployment Dependencies

- [Kan documentation](https://docs.kan.bn/)
- [Kan on GitHub](https://github.com/kanbn/kan)
- [Template source on GitHub](https://github.com/two-workspaces/kan)

### Implementation Details

**Sign in.** When the deploy is green, open your Railway domain and sign in with `KAN_ADMIN_EMAIL` and the password in the Kan service's `KAN_ADMIN_PASSWORD` variable. Both are only used on the first boot; change the password in Settings afterwards. Then create your workspace.

**Adding teammates.** Sign-up only lets in emails with a pending invite. In your workspace's Members page:

1. Invite the person by email. Without SMTP no email goes out, but the invite lets that address sign up.
2. Send them the workspace invite link from the same page. They open it, choose Sign up with the invited email, and land in your workspace.

To let anyone sign up, set `NEXT_PUBLIC_DISABLE_SIGN_UP` to `false` and redeploy.

**Email.** Invites, password resets and mention notifications by email need SMTP, and Railway only allows outbound SMTP on the Pro plan. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` to the Kan service to turn them on.

**Trello import.** Create a Trello Power-Up API key and add `TRELLO_APP_API_KEY` and `TRELLO_APP_SECRET` to the Kan service, then connect Trello under Settings.

**Single sign-on.** Kan supports Google, GitHub, Microsoft, GitLab, Discord and generic OIDC logins. Set the provider's client ID and secret on the Kan service, for example `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_DISCOVERY_URL`.

**Custom domains.** Add the domain to the Kan service in Railway, then set `NEXT_PUBLIC_BASE_URL` to `https://your.domain` and redeploy. The bucket is set up to accept uploads from the new domain on that boot.

**Upgrading.** Bump the version in both `FROM` lines of the Dockerfile in your fork and redeploy. Migrations run on start, so back up Postgres first. Kan is pre-1.0, so read the [release notes](https://github.com/kanbn/kan/releases) before you upgrade.

**Back up.** Boards, cards and users are in Postgres; attachments are in the bucket. Use Railway's volume backups or `pg_dump` for the database.

## Why Deploy Kan on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Kan on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
