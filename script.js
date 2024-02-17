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

class Calendar {
  constructor(client_id, api_key, discovery_doc, scopes) {
    this.client_id = client_id;
    this.api_key = api_key;
    this.discovery_doc = discovery_doc;
    this.scopes = scopes;

    this.tokenClient;
    this.gapiInited = false;
    this.gisInited = false;

    this.days = ["sun", "mon", "tues", "wed", "thur", "fri", "sat"];
    this.dates = [];

    this.content = {
      sun: [],
      mon: [],
      tues: [],
      wed: [],
      thur: [],
      fri: [],
      sat: [],
    };
  }

  getCalendarDates() {
    this.currentDate = new Date(); // get current date
    //console.log(this.currentDate);
    let currentDate2 = new Date();

    // make sure to test with time or else buggy : "2024-01-22T08:00:00"

    const firstDateOfTheWeek = currentDate2.getDate() - currentDate2.getDay(); // day of the month - the day of the week

    const startOfWeek = new Date(
      currentDate2.setDate(firstDateOfTheWeek)
    ).toUTCString();

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      this.dates[i] = date;
    }
  }

  getCalendarContent() {
    const isEventInWeek = (date1, date2) => {
      const trimmedDate1 = new Date(date1);
      trimmedDate1.setHours(0, 0, 0, 0);

      const trimmedDate2 = new Date(date2);
      trimmedDate2.setHours(0, 0, 0, 0);

      return trimmedDate1.getTime() === trimmedDate2.getTime();
    };

    for (let i = 0; i < 7; i++) {
      const date = this.dates[i];
      for (const event of this.calendarEvents) {
        let eventDate = new Date(event.start.dateTime);
        if (isEventInWeek(eventDate, date)) {
          this.content[this.days[i]].push(event);
        }
      }
    }
  }

  setCalendarContent() {
    this.getCalendarDates();
    this.getCalendarContent();

    for (let i = 0; i < 7; i++) {
      const day = this.days[i];
      const events = this.content[day];

      const dayElement = document.getElementById(day);
      dayElement.innerHTML = "";

      const dateElement = document.createElement("div");
      dateElement.classList.add("date");
      dateElement.innerText = this.dates[i].getDate();

      if (day == this.days[this.currentDate.getDay()]) {
        dayElement.classList.add("today");
      }

      dayElement.appendChild(dateElement);

      for (const event of events) {
        const eventElement = document.createElement("div");
        eventElement.classList.add("event");

        // eventElement.innerText = event.summary;
        // eventElement.innerText = event.start;
        // eventElement.innerText = event.end;

        // if (event.description != undefined) {
        //   eventElement.innerText = event.description;
        // } else {
        //   eventElement.innerText = event.summary;
        // }

        eventElement.innerText = event.summary;

        dayElement.appendChild(eventElement);
      }
    }
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
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: await this.client_id,
      scope: await this.scopes,
      callback: "", // defined later
    });
    this.gisInited = true;
    this.maybeEnableButtons();
  }

  maybeEnableButtons() {
    if (this.gapiInited && this.gisInited) {
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

      await this.getGoogleCalendarEvents();
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

  async getGoogleCalendarEvents() {
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

    this.calendarEvents = response.result.items;
    this.setCalendarContent();
  }
}

async function createCalendarObject() {
  const secrets = await SECRETS;

  calendar = new Calendar(
    await secrets.web.client_id,
    await secrets.api_key,
    DISCOVERY_DOC,
    SCOPES
  );

  return calendar;
}

async function initializeApp() {
  await createCalendarObject();
  if (typeof gapi !== undefined) {
    await calendar.gapiLoaded();
    await calendar.gisLoaded();
  } else {
    console.error("Google API script not loaded.");
  }
}

initializeApp(calendar);
