# Spec Delta

## MODIFIED Requirements

### Requirement: Installable app
MTF SHALL provide a web app manifest with name "MTF By Zynis", short name "MTF By Zynis", standalone display, any orientation, paper-colored theme and background, and icons at 192 px, 512 px and maskable 512 px, plus a 180 px Apple touch icon, so browsers offer to install it. The page title and the iPhone home-screen title SHALL also be "MTF By Zynis".

#### Scenario: Install offered
- **WHEN** MTF is opened over HTTPS in a browser that supports installing web apps
- **THEN** the browser treats MTF as installable

#### Scenario: Opens standalone
- **WHEN** the installed MTF is launched from the home screen or the PC
- **THEN** it opens in its own window without browser address bar

#### Scenario: Name in the browser tab
- **WHEN** MTF is opened in a browser tab
- **THEN** the tab reads "MTF By Zynis"

#### Scenario: Name under the icon
- **WHEN** MTF is installed on a phone's home screen
- **THEN** the label under its icon reads "MTF By Zynis"
