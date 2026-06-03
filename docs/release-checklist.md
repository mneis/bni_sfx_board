# Release Checklist

Use this checklist before moving `staging` into `main`. The goal is to keep the live GitHub Pages app reliable for real BNI meetings.

## Before Merging To Main

- [ ] App loads locally.
- [ ] App version query string is bumped if CSS, JavaScript, config, or translations changed.
- [ ] App loads on an iPad browser.
- [ ] Browser console has no critical errors.
- [ ] Existing sounds play.
- [ ] Stop All works.
- [ ] Global volume works.
- [ ] Quick Actions work.
- [ ] Meeting Flow Mode works, if changed.
- [ ] Timer works, if changed.
- [ ] Import/export works, if changed.
- [ ] Spotify remains optional, if changed.

## After Deploy

- [ ] GitHub Pages URL opens.
- [ ] Config loads correctly.
- [ ] Audio files load correctly.
- [ ] iPad layout looks correct.
- [ ] Stop All works on the live site.

## Release Notes

- [ ] Record what changed.
- [ ] Record any known limitations.
- [ ] Confirm whether operators need setup or usage notes before the next meeting.
