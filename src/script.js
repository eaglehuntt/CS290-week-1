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

  async initializeCalendarApp() {
    // test dates: new Date("2024-02-01")
    let currentDate = new Date(); // actual current date (will not change)

    if (typeof gapi !== undefined) {
      console.log("gapi undefined");
      await this.gapiLoaded();
      await this.gisLoaded();
    } else {
      console.error("Google API script not loaded.");
    }
    this.setCalendarContent(currentDate);
  }

  getStartOfWeek = (date) => {
    // returns an object containing the sunday of the week (start of week)

    const dateNumber = date.getDate() - date.getDay(); // day of the month - the day of the week
    const dateObject = new Date(date.setDate(dateNumber)).toString();

    return {
      dateObject: dateObject,
      dateNumber: dateNumber,
    };
  };

  getState(date) {
    let weeklyDates = [];
    let monthlyDates = [];
    let currentDate = new Date(date);
    let content = this.getCalendarContent();

    // start of week is a date object representing the Sunday before whichever date is given

    const startOfWeek = this.getStartOfWeek(currentDate);

    let startOfCalendar = new Date(date);
    startOfCalendar.setDate(0);

    startOfCalendar = this.getStartOfWeek(startOfCalendar);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek.dateObject);
      date.setDate(date.getDate() + i);
      weeklyDates[i] = date;
    }

    return {
      startOfWeek: startOfWeek.dateObject,
      startOfCalendar: startOfCalendar.dateObject,
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
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
    };

    if (this.allCalendarEvents == undefined) {
      return content;
    } else {
      console.log(`state:`);
      console.log(this.state);

      // We want to build the content object
      for (let i = 0; i < 7; i++) {
        const date = this.state.weeklyDates[i];
        console.log(date);

        for (const event of this.allCalendarEvents) {
          let eventDate = new Date(event.start.dateTime);
          console.log(content[this.days[i]]);
          console.log(this.days[i]);
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
    this.state = this.getState(date);
    this.setHeader();
    this.setMonthName();

    for (let i = 0; i < 7; i++) {
      const day = this.days[i];
      const dayElement = document.getElementById(day);

      dayElement.innerText = `${day}, ${this.state.weeklyDates[i].getDate()}`;

      if (this.state.weeklyDates[i].getDay() == this.currentDate.getDay()) {
        dayElement.classList.add("today");
      }

      const events = this.state.content[day];
      if (events) {
        console.log("EVENTS");
        this.populateEventsInTable(day, events);
      }
    }

    let monthlyDateElements = document.getElementsByClassName("date");
    let monthlyDate = new Date(this.state.startOfCalendar);

    for (let i = 0; i < 42; i++) {
      const date = monthlyDateElements[i];
      date.innerText = monthlyDate.getDate();

      if (monthlyDate.getMonth() != this.currentDate.getMonth()) {
        date.classList.add("faded");
      } else if (monthlyDate.getDate() == this.currentDate.getDate()) {
        date.classList.add("current-day");
      }

      monthlyDate.setDate(monthlyDate.getDate() + 1);
    }
  }

  populateEventsInTable(day, events) {
    const timeMapping = {
      "00:00": 0,
      "01:00": 1,
      "02:00": 2,
      "03:00": 3,
      "04:00": 4,
      "05:00": 5,
      "06:00": 6,
      "07:00": 7,
      "08:00": 8,
      "09:00": 9,
      "10:00": 10,
      "11:00": 11,
      "12:00": 12,
      "13:00": 13,
      "14:00": 14,
      "15:00": 15,
      "16:00": 16,
      "17:00": 17,
      "18:00": 18,
      "19:00": 19,
      "20:00": 20,
      "21:00": 21,
      "22:00": 22,
      "23:00": 23,
    };

    for (const event of events) {
      console.log("Event:", event);

      const startTime = this.roundTime(event.start.dateTime);
      console.log("StartTime:", startTime);

      const hour = startTime.getHours();
      const minutes = startTime.getMinutes();
      const key = `${hour}:${minutes < 10 ? "0" : ""}${minutes}`;
      const dateIndex = startTime.getDay();

      const timeId = timeMapping[key];
      const dayId = this.days[dateIndex];

      console.log("timeId:", timeId);
      console.log("dayId:", dayId);

      // Check if the timeId exists before appending the event
      if (timeId !== undefined) {
        const times = document.getElementsByClassName(dayId);
        const cell = times[timeId];

        if (cell) {
          const eventDiv = document.createElement("div");
          eventDiv.className = "event";
          eventDiv.innerText = event.summary;
          cell.appendChild(eventDiv);
        } else {
          console.error(
            `Cell not found for day ${dayId} and eventId ${timeId}`
          );
        }
      } else {
        console.error("EventId is undefined or null");
      }
    }
  }

  roundTime(date) {
    const roundedDate = new Date(date);

    // Round to the nearest hour
    const minutes = roundedDate.getMinutes();
    const roundedMinutes = Math.round(minutes / 60) * 60;
    roundedDate.setMinutes(roundedMinutes);

    console.log("Rounded Date:", roundedDate);

    return roundedDate;
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
    // console.log("maybe enable buttons");
    if (this.gapiInited && this.gisInited) {
      // console.log("gapi init");
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
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - 6); // in case it is saturday, we want to be able to have events populate from Sunday - Friday

    try {
      const request = {
        calendarId: "primary",
        timeMin: minDate.toISOString(),
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

    // FIX: This is a temp solution
    const curr = new Date();
    this.setCalendarContent(curr);
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
  await calendar.initializeCalendarApp();
}

initializeApp();
