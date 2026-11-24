---
title: Install orso
description: Download the macOS app, or install orso on macOS or Linux from the terminal.
category: getting-started
order: 2
---

## macOS: download the app

1. [Download the DMG](/#get-orso) for Apple Silicon or Intel.
2. Open the DMG and drag Orso to Applications.
3. Launch Orso from Applications. It starts orso and opens the editor in its own window, so you don't need a terminal.

Orso isn't notarized by Apple yet, so macOS asks you to allow it the first time. Open **System Settings → Privacy & Security**, click **Open Anyway**, then launch Orso again.

Every release is also on [GitHub](https://github.com/Blaise1030/cms/releases/latest).

## macOS: Homebrew (terminal)

```sh
brew install blaise1030/tap/orso
```

## macOS or Linux: installer script

The script downloads the right release for your computer and checks its sha256 before installing it.

```sh
curl -fsSL https://raw.githubusercontent.com/Blaise1030/cms/main/scripts/install.sh | sh
```

- To install a specific version, set `ORSO_VERSION`, for example `ORSO_VERSION=0.1.5`.
- To install somewhere else, set `ORSO_INSTALL_DIR`.

A binary installed this way can be flagged by Gatekeeper. The installer clears that flag when it can. On a Mac, the app or Homebrew avoids the problem altogether.

## Open orso

**If you installed the app**, launch Orso from Applications, or click its icon in the Dock. The editor opens in the app's window.

**If you installed from the terminal**, run:

```sh
orso serve --open
```

That opens orso in your browser at an address like `http://orso.localhost:<port>/?t=…`.

- orso only listens on your own computer (`127.0.0.1`).
- The `?t=` token in the link is what lets your browser in. If you lose the tab, run `orso serve --open` again to get a fresh link. See [orso says it can't reach the daemon](/help/daemon-unreachable/).
- Keep the terminal open while you work. Press Ctrl-C to stop orso.

## Check your version

If you installed from the terminal, run:

```sh
orso --version
```

Include this number when you [report a problem](/help/report-a-problem/).

## Next step

[Sign in with GitHub](/help/sign-in-with-github/) so orso can open your repos and create pull requests.
