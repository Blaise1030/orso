---
title: "orso says it can't reach the daemon"
description: What to do when the page can't connect to orso.
category: troubleshooting
order: 1
---

orso's editor runs in the Orso app or your browser, but it talks to the `orso` program running on your computer. If the page says it can't reach it, one of these is usually the cause.

## orso isn't running

If you use the app, quit it and open it again. If you started orso from a terminal, check that window. If it has stopped, or you closed it, start it again:

```sh
orso serve --open
```

## The link is out of date

Each time orso starts, it creates a new link with a new `?t=` token. An old tab or bookmark won't work after a restart. Use the new link that `orso serve --open` opens, or let the app open its own window.

## Still stuck

- If you installed from the terminal, run `orso --version` to check orso is installed ([Install orso](/help/install-orso/)) and on your `PATH`. If you use the app, check that Orso is in Applications and open it again.
- Make sure nothing else is using orso's port.
- See [Report a problem](/help/report-a-problem/).
