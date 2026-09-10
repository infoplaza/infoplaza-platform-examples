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
things are worth knowing before you deploy one publicly.

**The route handlers are gated, but not sealed.** Each one attaches your API key
and forwards the request, which makes its URL a working copy of a paid endpoint
that carries no key. Three checks stand in front of them: the request has to
come from the deployment's own origin, it has to carry a signed short-lived
token the app hands to its own pages, and a caller may only ask so often. The
origin check holds completely against another party calling these URLs from
their own front end, because a browser will not let a page forge the header it
reads. Against a program none of it holds completely — anything a browser sends,
a script can send too — and the rate limit is counted in memory, so on a
serverless host each instance counts on its own. A limit that really holds
belongs in the host's firewall. The Next.js example documents all of this under
"Before you deploy this publicly".

**The API log is shared between visitors.** The log of Platform calls is kept in
one server-wide list, so one visitor can see the requests and responses of
another. The API key itself is always redacted.

Neither is a vulnerability in the examples. A deployment that has to be private
still belongs behind authentication.
