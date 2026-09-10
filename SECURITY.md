# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report them privately, in either of these ways:

- **GitHub private vulnerability reporting** — go to the **Security** tab of this
  repository and choose **Report a vulnerability**. This opens a private thread
  with the maintainers and is the fastest route for anything in this code.
- **Email** — [privacy@infoplaza.nl](mailto:privacy@infoplaza.nl), the address
  published on Infoplaza's
  [disclaimer and privacy page](https://www.infoplaza.com/en/disclaimer-and-privacy).

We aim to acknowledge a report within five working days.

## Scope

This repository contains example code. Reports about the examples themselves —
say, a change that would leak the API key to the browser — belong here.

Issues in the Infoplaza Platform API itself are not in scope for this
repository; report those through [platform.infoplaza.com](https://platform.infoplaza.com/).

## A note on running these examples

The examples are written to be read, and they are meant to run locally. Two
properties are deliberate and are not vulnerabilities in the examples, but they
do matter if you deploy one publicly:

- **The API routes are unauthenticated.** Every `/api/…` route attaches your API
  key and forwards the request, so anyone who can reach your deployment can spend
  your credits.
- **The API log is shared between visitors.** The log of Platform calls is kept
  in one server-wide list, so one visitor can see the requests and responses of
  another. The API key itself is always redacted.

Put a deployment behind authentication, or keep it private.
