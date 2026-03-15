# Feature Specification: Album Quotient App

**Feature Branch**: `001-album-quotient-app`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Build a web app that allows the user to select a last.fm username and generate an 'album listening' analysis for the last 600 scrobbles on that account."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Album Quotient (Priority: P1)

A user visits The Album Report and sees a landing page with the site
title, a stylized vinyl record image, and a brief explanation of what
the app does. They enter their last.fm username into a text input and
submit. The app fetches their last 600 scrobbles from last.fm,
determines album track listings, and runs the album quotient algorithm
to classify each scrobble as "part of an album listen" or a "one-off."
While fetching and analyzing, the user sees a loading state. Once
complete, the app displays a results view showing:

- Their **album quotient** (the percentage of tracks listened to as
  part of an album vs. one-offs)
- The **total number of albums** they listened to "as a unit"
- Their **top listened-to album** (the album with the highest number
  of tracks listened to as part of album runs)

**Why this priority**: This is the entire core value proposition. Without
the analysis, there is no product.

**Independent Test**: Can be fully tested by entering a valid last.fm
username and verifying that the loading state appears, the analysis
completes, and all three result metrics are displayed with correct
values.

**Acceptance Scenarios**:

1. **Given** the user is on the landing page, **When** they enter a
   valid last.fm username and submit, **Then** a loading state is
   displayed while the app fetches scrobbles and runs the algorithm.

2. **Given** the app has finished fetching and analyzing, **When** the
   results are ready, **Then** the results view displays the album
   quotient percentage, total albums listened to as a unit, and the
   top listened-to album.

3. **Given** the user enters a username with no scrobbles or a
   nonexistent username, **When** they submit, **Then** an appropriate
   error message is shown explaining the problem.

4. **Given** the user enters a username whose recent history contains
   only one-off tracks (no album runs detected), **When** results
   display, **Then** the album quotient shows 0% and the total
   albums as a unit shows 0 with appropriate messaging.

5. **Given** the user enters a username whose scrobbles include short
   albums (1-4 tracks), **When** the algorithm runs, **Then** those
   short-album runs are weighted lower than full-length album runs
   in the quotient calculation.

---

### User Story 2 - Share Results (Priority: P2)

After viewing their results, a user clicks a "Share" button. The app
generates a unique, shareable URL and persists the analysis results.
The user copies the URL and sends it to a friend. The friend opens the
URL in their browser and sees the same results page — the album
quotient, total albums as a unit, top album, and the username the
analysis was performed for — without needing to re-run the analysis.

**Why this priority**: Sharing is what drives virality and gives the
app social utility. It depends on the core analysis (US1) being
complete but is the natural next step in the user journey.

**Independent Test**: Can be tested by generating results for a
username, clicking share, opening the resulting URL in a new
browser/incognito session, and verifying the same results appear.

**Acceptance Scenarios**:

1. **Given** the user is viewing their results, **When** they click
   the share button, **Then** a unique URL is generated and presented
   for copying.

2. **Given** a valid share URL exists, **When** anyone opens that URL
   in a browser, **Then** the persisted results are displayed
   identically to what the original user saw.

3. **Given** a share URL that does not correspond to any persisted
   result, **When** someone opens it, **Then** an error page is
   shown explaining the results were not found or have expired.

---

### User Story 3 - Visual Design and Polish (Priority: P3)

The entire app has a cohesive visual identity:

- **Color palette**: Soft, medium-dark gray base background with
  multiple levels of soft white/gray text and soft gold and red
  accent colors.
- **Landing page**: The site title "The Album Report" at the top,
  a stylized vinyl record image below, explanatory text, and a
  username input field.
- **Loading state**: A visually engaging loading indicator that
  fits the app's aesthetic while the analysis runs.
- **Results view**: Clean presentation of the album quotient and
  supporting stats with visual hierarchy that draws the eye to the
  headline number first.
- **Responsive**: The layout works naturally across desktop and
  mobile screen sizes.

**Why this priority**: The visual design elevates the experience from
a utility to something worth sharing. It depends on US1 and US2
providing the functional surface to style.

**Independent Test**: Can be tested by loading the app on desktop
and mobile viewports and verifying the color palette, layout,
typography, and visual hierarchy match the design specification.

**Acceptance Scenarios**:

1. **Given** the user loads the app on any device, **When** the
   landing page renders, **Then** the background is a soft medium-dark
   gray, text uses soft white/gray tones, and accent elements use
   soft gold and red.

2. **Given** the user is on the landing page, **When** they see the
   hero section, **Then** the site title "The Album Report" is
   prominently displayed, followed by a stylized vinyl record image
   and explanatory text.

3. **Given** the user submits a username, **When** the app is
   loading, **Then** a visually polished loading indicator is shown
   that fits the dark/gold/red aesthetic.

4. **Given** the app is viewed on a mobile device, **When** any page
   renders, **Then** the layout adapts fluidly with appropriately
   sized touch targets and readable text.

---

### Edge Cases

- What happens when the last.fm API is temporarily unavailable or
  rate-limited? The app MUST show an error message suggesting the
  user try again later.
- What happens when a user has fewer than 600 scrobbles? The app
  MUST analyze whatever scrobbles are available and note the reduced
  sample size in the results.
- What happens when scrobble data is missing album information for
  some tracks? Those tracks MUST be classified as one-offs since
  album membership cannot be determined.
- What happens when the same album appears in multiple separate
  listening sessions? Each session MUST be evaluated independently
  as a potential album run.
- What happens when a user re-enters the same username? The app
  MUST re-run the analysis with fresh data (scrobbles may have
  changed since last analysis).
- What happens when an album's track listing cannot be determined
  from available data? Those tracks MUST be classified as one-offs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display a landing page with the title
  "The Album Report," a stylized vinyl record image, explanatory
  text, and a text input for a last.fm username.
- **FR-002**: The app MUST accept a last.fm username and fetch
  the user's most recent 600 scrobbles.
- **FR-003**: The app MUST determine album track listings (track
  order and total track count) for albums appearing in the
  user's scrobbles.
- **FR-004**: The app MUST run an album quotient algorithm that
  identifies "album runs" — sequences of tracks from the same
  album in the user's listening history that indicate intentional
  album listening.
- **FR-005**: The algorithm MUST evaluate album runs based on
  multiple factors:
  - Whether the user started from the first track on the album
  - How many consecutive album tracks were played in sequence
  - Whether the user listened to a contiguous portion of the
    album even if not starting from track 1
- **FR-006**: The algorithm MUST allow partial album listens to
  qualify as album runs — users do not need to listen to every
  track on an album for it to count.
- **FR-007**: The algorithm MUST weight short albums (1-4 tracks)
  lower than albums with a standard number of tracks (5+) when
  calculating the album quotient.
- **FR-008**: The app MUST display a loading state while fetching
  scrobbles and performing the analysis.
- **FR-009**: The app MUST display results including: the album
  quotient (percentage of tracks listened as part of an album),
  total number of albums listened to as a unit, and the user's
  top listened-to album.
- **FR-010**: The app MUST provide a share button on the results
  page that generates a unique, copyable URL.
- **FR-011**: The app MUST persist analysis results so they can
  be retrieved and displayed to anyone who opens the share URL.
- **FR-012**: The app MUST display appropriate error messages
  when a username is invalid, not found, has no scrobbles, or
  when the data source is unavailable.
- **FR-013**: The app MUST use a color palette of soft medium-dark
  gray backgrounds, soft white/gray text at various levels, and
  soft gold and red accent colors.
- **FR-014**: The app MUST be responsive and usable on both
  desktop and mobile screen sizes.

### Key Entities

- **Scrobble**: A single track play event associated with a user.
  Key attributes: artist name, album name, track name, timestamp.
- **Album**: A released collection of tracks. Key attributes:
  artist name, album name, total track count, ordered track
  listing.
- **Album Run**: A detected sequence of consecutive scrobbles
  from the same album that indicates intentional album listening.
  Key attributes: album reference, tracks played, starting
  position in album, run length, whether it started from track 1,
  short-album flag.
- **Analysis Result**: The computed output for a given username.
  Key attributes: username, album quotient percentage, total
  albums as a unit, top album, individual album run details,
  total scrobbles analyzed, timestamp of analysis.
- **Share Link**: A persistent reference to a saved analysis
  result. Key attributes: unique identifier, reference to
  analysis result, creation timestamp.

## Assumptions

- The last.fm API (or equivalent data source) provides scrobble
  history including artist, album, and track names with timestamps.
- Album track listings (track order and count) can be retrieved
  from last.fm or a similar music metadata source.
- A "scrobble" represents a single completed or near-completed
  track play.
- The analysis operates on the most recent 600 scrobbles at the
  time of the request; results represent a snapshot in time.
- Persisted results do not need to update automatically — they
  are a snapshot of the analysis at the time it was generated.
- No user authentication is required — the app is a public tool
  that queries publicly available last.fm data.
- Share URLs do not expire by default but may be subject to
  storage limits over time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter a last.fm username and receive
  their album quotient results within 15 seconds on a standard
  connection.
- **SC-002**: The loading state is visible within 1 second of
  submitting a username, providing immediate feedback.
- **SC-003**: The results page displays all three metrics (album
  quotient percentage, total albums as a unit, top album) clearly
  and accurately.
- **SC-004**: Share URLs successfully load the correct persisted
  results for any visitor, without requiring re-analysis.
- **SC-005**: The app is fully usable on viewports from 320px to
  1920px wide without horizontal scrolling or content overflow.
- **SC-006**: Error states for invalid usernames, missing data,
  or service unavailability are displayed within 5 seconds with
  actionable messages.
- **SC-007**: The album quotient algorithm correctly distinguishes
  album runs from one-off listens, weighting short albums lower,
  and produces consistent results for the same input data.
