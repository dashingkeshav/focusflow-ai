# FocusFlow AI Chrome extension

The Manifest V3 extension protects an active FocusFlow session with
task-aware site classification, warning/return/block choices, a session
popup, and privacy-safe focus telemetry. It does not read page contents,
capture screenshots, or store actual keystrokes or mouse coordinates.

## Install from the source folder

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Select **Load unpacked** and choose this `extension` folder.
3. Open the FocusFlow extension popup and expand **Connect to your FocusFlow
   account**.
4. Enter the origin of your deployed dashboard and backend API, then choose
   **Save & connect** and approve access to those sites.
5. Open the dashboard in a new tab, sign in, and start a Smart Focus session.

Production origins must use HTTPS. HTTP is accepted only for localhost
development (the defaults are `http://localhost:3000` and
`http://localhost:5001`). The extension registers its dashboard bridge only
for the configured app origin and requests host access only for the app and
API origins you entered.

## Downloadable ZIP

Versioned GitHub releases include `FocusFlow-Chrome-Extension.zip`. Unzip it
and use **Load unpacked** with the extracted folder. A Chrome Web Store
listing is not configured by this repository.
