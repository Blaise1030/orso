---
title: Introducing Orso
description: A site builder that runs on your machine, lets your content team make changes themselves, and publishes through the pull request you already review.
pubDate: "2026-11-22"
categories: [announcements]
tags: [announcement, astro, open source]
---

## The "can you change the pricing?" problem

On most teams, a small copy change follows a long route. Someone posts in a chat, a developer finds the file, edits it, and deploys. The content team waits, and the developer loses an afternoon to work that isn't theirs.

A hosted CMS fixes the wait, but it takes the content out of the repo. You get a subscription, a second place to look, and a site that is harder for everyone else to change.

We wanted a third option: the content team edits the site directly, and the repo stays exactly as it is.

## What Orso is

Orso is a site builder that runs on your own computer. It is a single program that serves its editor in your browser and works on the Astro project in your Git repo.

- **Your site stays a plain Astro project.** There is no database and no proprietary format. If you stop using Orso, the site still builds and deploys.
- **Every edit happens on a change.** A change is a Git branch with a readable title. Your live site never moves until the change is merged.
- **Publishing is a pull request.** Each change gets a preview link for review, then goes live through the same process you already use for code.

## What it does today

Open a project and the rail gives you five tabs:

- **Content** lists every Markdown collection in the repo. Each entry has a form for its fields and a rich-text editor for the body.
- **Preview** runs your site live, on the page you are editing, on desktop and mobile.
- **Design** holds the colours, fonts and spacing that apply across the site.
- **Code** shows the files, for when you want to look under the hood.
- **History** keeps every save as a checkpoint you can restore.

You can also ask for changes in plain words. Connect a coding agent such as OpenCode, Claude Code, Codex or Cursor, describe what you want ("add an FAQ to the pricing page"), and it edits the project on the current change. You review the result like any other pull request.

## What it doesn't do

Orso is not a hosted service, and it doesn't try to be one. You need a Mac or Linux computer, a GitHub account, and write access to the repo you want to edit. Windows isn't supported yet. Orso is in alpha, so expect rough edges.

It is free and open source under the MIT licence. There is no paid plan, and no part of your site is locked behind Orso.

## Try it

Download Orso for macOS or Linux from [the download section](/#get-orso). On a Mac, open the DMG and drag Orso to Applications, then launch it.

If you prefer the terminal, Homebrew works too:

```sh
brew install blaise1030/tap/orso
orso serve --open
```

Create a site from the starter template, or open a repo you already have. Make a change, look at the preview, and publish it when you are happy. The [install guide](/help/install-orso/) walks through each step, and [What is Orso?](/help/what-is-orso/) explains how the pieces fit together.

We will use this blog for product updates and practical notes on running a content site in a repo. If there is something you would like us to cover, open an issue on [GitHub](https://github.com/Blaise1030/cms/issues).
