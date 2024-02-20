/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console

const SECRETS = fetch("../secrets.json").then((response) => response.json());

let calendar;

class CalendarApp {
  constructor(clientId, apiKey, discoveryDocs, scopes) {
    this.clientId = clientId;
    this.apiKey = apiKey;
    this.allCalendarEvents;
    this.discoveryDocs = discoveryDocs;
    this.scopes = scopes;

    this.tokenClient;
    this.gapiInited = false;
    this.gisInited = false;

    this.days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    this.currentDate = new Date(); // actual current date (will not change)
  }

  async initializeApp() {
    // test dates: new Date("2024-02-01")
    let currentDate = new Date(); // actual current date (will not change)
    this.setCalendarContent(currentDate);

    if (typeof gapi !== undefined) {
      await this.gapiLoaded();
      await this.gisLoaded();
    } else {
      console.error("Google API script not loaded.");
    }
  }

  getState(date) {
    const getStartOfWeek = (date) => {
      const dateObject = date.getDate() - date.getDay(); // day of the month - the day of the week
      const dateNumber = new Date(date.setDate(dateObject)).toUTCString();

      return {
        dateNumber: dateNumber,
        dateObject: dateObject,
      };
    };

    let weeklyDates = [];
    let monthlyDates = [];
    let currentDate = new Date(date);
    let content = this.getCalendarContent();

    // start of week is a date object representing the Sunday before whichever date is given

    const startOfWeek = getStartOfWeek(currentDate);

    // const firstDateOfMonth = new Date(
    //   currentDate.getFullYear(),
    //   currentDate.getMonth(),
    //   1
    // );

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek.dateNumber);
      date.setDate(date.getDate() + i);
      weeklyDates[i] = date;
    }

    return {
      startOfWeek: startOfWeek,
      weeklyDates: weeklyDates,
      monthlyDates: monthlyDates,
      content: content,
    };
  }

  getCalendarContent() {
    const isEventInDay = (date1, date2) => {
      const trimmedDate1 = new Date(date1);
      trimmedDate1.setHours(0, 0, 0, 0);

      const trimmedDate2 = new Date(date2);
      trimmedDate2.setHours(0, 0, 0, 0);

      return trimmedDate1.getTime() === trimmedDate2.getTime();
    };

    let content = {
      Sun: [],
      Mon: [],
      Tues: [],
      Wed: [],
      Thur: [],
      Fri: [],
      Sat: [],
    };

    if (this.allCalendarEvents == undefined) {
      return content;
    } else {
      for (let i = 0; i < 7; i++) {
        const date = this.state.weeklyDates[i];
        for (const event of this.allCalendarEvents) {
          let eventDate = new Date(event.start.dateTime);
          if (isEventInDay(eventDate, date)) {
            content[this.days[i]].push(event);
          }
        }
      }
      return content;
    }
  }

  setHeader() {
    const currentDateHeader = document.getElementById("current-date-header");
    let startOfWeek = this.state.weeklyDates[0].toDateString();
    let endOfWeek = this.state.weeklyDates[6].toDateString();

    startOfWeek = startOfWeek.substring(0, startOfWeek.length - 4);
    endOfWeek = endOfWeek.substring(0, endOfWeek.length - 4);

    startOfWeek = startOfWeek.substring(4);
    endOfWeek = endOfWeek.substring(4);

    let currentYear = this.state.weeklyDates[0].getFullYear();

    currentDateHeader.innerText = `${startOfWeek} - ${endOfWeek} ${currentYear}`;
  }

  setMonthName() {
    const monthName = document.getElementsByClassName("month-name")[0];
    let month = this.state.weeklyDates[0].toLocaleString("default", {
      month: "long",
    });
    let year = this.state.weeklyDates[0].getFullYear();
    monthName.innerText = `${month} ${year}`;
  }

  setWeekView(startOfWeek) {}

  setCalendarContent(date) {
    console.log("setting calendar content");

    this.state = this.getState(date);
    this.setHeader();
    this.setMonthName();

    console.log(this.state.content);

    for (let i = 0; i < 7; i++) {
      const day = this.days[i];
      const dayElement = document.getElementById(day);

      // Set weekly table

      // Update the weekly table's day elements to "Day, Date"
      dayElement.innerText = `${day}, ${this.state.weeklyDates[i].getDate()}`;

      if (this.state.weeklyDates[i].getDay() == this.currentDate.getDay()) {
        dayElement.classList.add("today");
      }

      // TODO: Insert events into the weekly table
      const events = this.state.content[day];
    }

    // Set monthly table
    let monthlyDateElements = document.getElementsByClassName("date");
    let monthlyDate = this.state.firstDateOfMonth;

    for (let i = 0; i < 42; i++) {
      const date = monthlyDateElements[i];
      date.innerText = monthlyDate.getDay();
      monthlyDate++;
    }
  }

  async gapiLoaded() {
    gapi.load("client", this.initializeGapiClient.bind(this));
    document.getElementById("sign-in-button").style.display = "none";
  }

  async initializeGapiClient() {
    const secrets = await SECRETS;
    await gapi.client.init({
      apiKey: secrets.api_key,
      discoveryDocs: await this.discoveryDocs,
    });
    this.gapiInited = true;
    this.maybeEnableButtons();
  }

  async gisLoaded() {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: await this.clientId,
      scope: await this.scopes,
      callback: "", // defined later
    });
    this.gisInited = true;
    this.maybeEnableButtons();
  }

  maybeEnableButtons() {
    if (this.gapiInited && this.gisInited) {
      document.getElementById("sign-in-button").style.display = "block";
      document.getElementById("profile-image-container").style.display = "none";
      document.getElementById("sign-out-button").style.display = "none";
    }
  }

  handleAuthClick() {
    this.tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        throw resp;
      }

      document.getElementById("profile-image-container").style.display =
        "block";
      document.getElementById("sign-in-button").style.display = "none";

      // getting calendar content
      await this.getGoogleCalendarEvents();
      await this.getProfileImage();
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
      //   document.getElementById("content").innerText = "";
      document.getElementById("sign-in-button").style.display = "block";
      document.getElementById("profile-image-container").style.display = "none";
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
        maxResults: 2500,
        orderBy: "startTime",
      };
      response = await gapi.client.calendar.events.list(request);
    } catch (err) {
      document.getElementById("content").innerText = err.message;
      return;
    }

    this.allCalendarEvents = response.result.items;
    console.log(this.allCalendarEvents);

    this.setCalendarContent();
  }

  async getProfileImage() {
    gapi.client.people.people
      .get({
        resourceName: "people/me",
        personFields: "photos",
      })
      .then(
        function (response) {
          const profileImage = response.result.photos[0].url;
          console.log("Profile Image URL:", profileImage);

          document.getElementById("profile-image").src = profileImage;
        },
        function (reason) {
          console.error(
            "Error getting profile image:",
            reason.result.error.message
          );
        }
      );
  }
}

async function createCalendarApp() {
  // Discovery doc URL for APIs used by the quickstart
  const calendarDoc =
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

  const peopleDoc = "https://people.googleapis.com/$discovery/rest";

  const scopes =
    "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile";

  const secrets = await SECRETS;

  const discoveryDocs = [calendarDoc, peopleDoc];

  calendar = new CalendarApp(
    await secrets.web.client_id,
    await secrets.api_key,
    discoveryDocs,
    scopes
  );
  return calendar;
}

async function initializeApp() {
  calendar = await createCalendarApp();
  await calendar.initializeApp();
}

initializeApp(calendar);
