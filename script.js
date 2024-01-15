/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console

const SECRETS = fetch("./secrets.json").then((response) => response.json());

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

let calendar;

class GoogleCalendar {
  constructor(client_id, api_key, discovery_doc, scopes) {
    this.client_id = client_id;
    this.api_key = api_key;
    this.discovery_doc = discovery_doc;
    this.scopes = scopes;

    this.tokenClient;
    this.gapiInited = false;
    this.gisInited = false;
  }

  gapiLoaded() {
    gapi.load("client", this.initializeGapiClient.bind(this));
    document.getElementById("authorize_button").style.visibility = "hidden";
    document.getElementById("signout_button").style.visibility = "hidden";
  }

  async initializeGapiClient() {
    const secrets = await SECRETS;
    await gapi.client.init({
      apiKey: secrets.api_key,
      discoveryDocs: [await this.discovery_doc],
    });
    this.gapiInited = true;
    this.maybeEnableButtons();
  }

  async gisLoaded() {
    console.log("gisLoaded");
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: await this.client_id,
      scope: await this.scopes,
      callback: "", // defined later
    });
    this.gisInited = true;
    this.maybeEnableButtons();
  }

  maybeEnableButtons() {
    console.log(this.gapiInited, this.gisInited);
    if (this.gapiInited && this.gisInited) {
      console.log("working!!");
      document.getElementById("authorize_button").style.visibility = "visible";
    }
  }

  handleAuthClick() {
    this.tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        throw resp;
      }

      document.getElementById("signout_button").style.visibility = "visible";
      document.getElementById("authorize_button").innerText = "Refresh";

      await this.listUpcomingEvents();
    };

    if (gapi.client.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      this.tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      this.tokenClient.requestAccessToken({ prompt: "" });
    }
  }

  handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken("");
      document.getElementById("content").innerText = "";
      document.getElementById("authorize_button").innerText = "Authorize";
      document.getElementById("signout_button").style.visibility = "hidden";
    }
  }

  async listUpcomingEvents() {
    let response;
    try {
      const request = {
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: "startTime",
      };
      response = await gapi.client.calendar.events.list(request);
    } catch (err) {
      document.getElementById("content").innerText = err.message;
      return;
    }

    const events = response.result.items;
    if (!events || events.length == 0) {
      document.getElementById("content").innerText = "No events found.";
      return;
    }
    // Flatten to string to display
    const output = events.reduce(
      (str, event) =>
        `${str}${event.summary} (${
          event.start.dateTime || event.start.date
        })\n`,
      "Events:\n"
    );
    document.getElementById("content").innerText = output;
  }
}

async function createCalendarObject() {
  const secrets = await SECRETS;

  calendar = new GoogleCalendar(
    await secrets.web.client_id,
    await secrets.api_key,
    DISCOVERY_DOC,
    SCOPES
  );

  console.log(calendar);
  return calendar;
}

async function initializeApp() {
  await createCalendarObject();
  if (typeof gapi !== "undefined") {
    calendar.gapiLoaded();
    calendar.gisLoaded();
  } else {
    console.error("Google API script not loaded.");
  }
}

initializeApp(calendar);
